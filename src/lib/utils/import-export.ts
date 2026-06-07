import JSZip from 'jszip';
import type { Note } from '$lib/types/index.js';
import { optimizeImage } from '$lib/utils/image-optimize.js';
import { addPendingAttachment } from '$lib/sync/idb.js';

export interface ImportResult {
	successCount: number;
	failedCount: number;
}

// Sanitize filename
export function sanitizeFilename(name: string): string {
	if (!name) return 'untitled';
	// Replace invalid characters with hyphen
	return name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'untitled';
}

// Generate unique filenames in a set
export function getUniqueFilename(name: string, extension: string, existingNames: Set<string>): string {
	const sanitizedBase = sanitizeFilename(name);
	let candidate = `${sanitizedBase}.${extension}`;
	let counter = 1;
	while (existingNames.has(candidate.toLowerCase())) {
		candidate = `${sanitizedBase}-${counter}.${extension}`;
		counter++;
	}
	existingNames.add(candidate.toLowerCase());
	return candidate;
}

// Export single note
export async function exportNote(note: Note) {
	const hasAttachments = note.attachments && note.attachments.length > 0;
	if (hasAttachments) {
		const zip = new JSZip();
		const titleBase = sanitizeFilename(note.title || 'untitled');
		const filename = `${titleBase}.zip`;
		
		// Prepend `# Title` to the markdown content
		let markdownContent = '';
		if (note.title) {
			markdownContent = `# ${note.title}\n\n`;
		}
		markdownContent += note.content;

		const attachmentFolder = zip.folder('attachments');
		const usedFilenames = new Set<string>();

		if (note.attachments && attachmentFolder) {
			for (const att of note.attachments) {
				const ext = att.filename.split('.').pop() || 'png';
				const uniqueName = getUniqueFilename(att.filename.replace(/\.[^/.]+$/, ""), ext, usedFilenames);
				
				try {
					const res = await fetch(`/api/notes/${note.id}/attachments?attachmentId=${att.id}`);
					if (res.ok) {
						const blob = await res.blob();
						attachmentFolder.file(uniqueName, blob);
						// Append reference at the bottom
						markdownContent += `\n\n![${uniqueName}](attachments/${uniqueName})`;
					}
				} catch (e) {
					console.error(`Failed to fetch attachment ${att.id}:`, e);
				}
			}
		}

		zip.file(`${titleBase}.md`, markdownContent);
		const content = await zip.generateAsync({ type: 'blob' });
		triggerDownload(content, filename);
	} else {
		// Prepend `# Title` to the markdown content
		let markdownContent = '';
		if (note.title) {
			markdownContent = `# ${note.title}\n\n`;
		}
		markdownContent += note.content;

		const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
		const filename = `${sanitizeFilename(note.title || 'untitled')}.md`;
		triggerDownload(blob, filename);
	}
}

// Export all notes
export async function exportAllNotes(notesList: Note[]) {
	if (notesList.length === 0) return;
	const zip = new JSZip();
	const filename = `crumbs-export-${new Date().toISOString().slice(0, 10)}.zip`;
	const attachmentFolder = zip.folder('attachments');
	const usedNoteFilenames = new Set<string>();
	const usedAttachmentFilenames = new Set<string>();

	for (const note of notesList) {
		let markdownContent = '';
		if (note.title) {
			markdownContent = `# ${note.title}\n\n`;
		}
		markdownContent += note.content;

		const uniqueNoteName = getUniqueFilename(note.title || 'untitled', 'md', usedNoteFilenames);

		if (note.attachments && note.attachments.length > 0 && attachmentFolder) {
			for (const att of note.attachments) {
				const ext = att.filename.split('.').pop() || 'png';
				const uniqueAttName = getUniqueFilename(att.filename.replace(/\.[^/.]+$/, ""), ext, usedAttachmentFilenames);
				
				try {
					const res = await fetch(`/api/notes/${note.id}/attachments?attachmentId=${att.id}`);
					if (res.ok) {
						const blob = await res.blob();
						attachmentFolder.file(uniqueAttName, blob);
						markdownContent += `\n\n![${uniqueAttName}](attachments/${uniqueAttName})`;
					}
				} catch (e) {
					console.error(`Failed to fetch attachment ${att.id}:`, e);
				}
			}
		}

		zip.file(uniqueNoteName, markdownContent);
	}

	const content = await zip.generateAsync({ type: 'blob' });
	triggerDownload(content, filename);
}

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// Extract title and strip heading
export function parseMarkdownContent(filename: string, rawContent: string): { title: string; content: string } {
	let title = '';
	let content = rawContent.trim();

	// Match first `# heading` at start of line
	const headingMatch = content.match(/^#\s+(.+)$/m);
	if (headingMatch) {
		title = headingMatch[1].trim();
		// Strip the heading line and any leading/trailing spaces
		content = content.replace(/^#\s+.+$/m, '').trim();
	} else {
		// Fallback to filename without extension
		title = filename.replace(/\.md$/i, '');
	}

	return { title, content };
}

// Import helper
export async function importFile(
	file: File,
	createNoteFn: (note: { title: string; content: string }) => Promise<any>
): Promise<ImportResult> {
	let successCount = 0;
	let failedCount = 0;

	if (file.name.endsWith('.md')) {
		try {
			const text = await file.text();
			const { title, content } = parseMarkdownContent(file.name, text);
			const created = await createNoteFn({ title, content });
			if (created) successCount++;
			else failedCount++;
		} catch (err) {
			console.error('Failed to import MD file:', err);
			failedCount++;
		}
	} else if (file.name.endsWith('.zip')) {
		try {
			const zip = await JSZip.loadAsync(file);
			// Find all .md files
			const mdFiles = Object.keys(zip.files).filter(name => name.endsWith('.md') && !name.startsWith('__MACOSX'));
			
			if (mdFiles.length === 0) {
				return { successCount: 0, failedCount: 1 };
			}

			for (const mdPath of mdFiles) {
				try {
					const zipEntry = zip.files[mdPath];
					const text = await zipEntry.async('string');
					const filename = mdPath.split('/').pop() || mdPath;
					
					let { title, content } = parseMarkdownContent(filename, text);

					// Parse attachments referenced in this md file
					const imageRegex = /!\[.*?\]\(((?:attachments\/)?([^)]+))\)/g;
					let match;
					const attachmentFilesToUpload: { name: string; zipPath: string }[] = [];

					while ((match = imageRegex.exec(content)) !== null) {
						const relativePath = match[1];
						const rawFilename = match[2];

						let foundPath = '';
						if (zip.files[relativePath]) {
							foundPath = relativePath;
						} else if (zip.files[`attachments/${rawFilename}`]) {
							foundPath = `attachments/${rawFilename}`;
						} else {
							// Search zip for a file matching rawFilename
							const foundKey = Object.keys(zip.files).find(
								k => k.endsWith(`/${rawFilename}`) || k === rawFilename
							);
							if (foundKey) {
								foundPath = foundKey;
							}
						}

						if (foundPath) {
							attachmentFilesToUpload.push({ name: rawFilename, zipPath: foundPath });
						}
					}

					// Strip image references from note content as they are added as attachments
					content = content.replace(/^\s*!\[.*?\]\((?:attachments\/)?[^)]+\)\s*$/gm, '').trim();

					// Create the note
					const createdNote = await createNoteFn({ title, content });

					if (createdNote) {
						successCount++;
						// Upload attachments
						for (const att of attachmentFilesToUpload) {
							try {
								const zipFile = zip.files[att.zipPath];
								const blob = await zipFile.async('blob');
								const imageFile = new File([blob], att.name, { type: blob.type || 'image/jpeg' });
								await uploadImportedAttachment(createdNote.id, imageFile);
							} catch (uploadErr) {
								console.error(`Failed to upload attachment ${att.name} for note ${createdNote.id}:`, uploadErr);
							}
						}
					} else {
						failedCount++;
					}
				} catch (fileErr) {
					console.error(`Failed to import file ${mdPath} from zip:`, fileErr);
					failedCount++;
				}
			}
		} catch (zipErr) {
			console.error('Failed to load ZIP file:', zipErr);
			failedCount = 1;
		}
	} else {
		failedCount = 1;
	}

	return { successCount, failedCount };
}

async function uploadImportedAttachment(noteId: string, file: File) {
	let optimized: Blob;
	let thumbnail: Blob;
	try {
		const result = await optimizeImage(file);
		optimized = result.optimized;
		thumbnail = result.thumbnail;
	} catch (err) {
		optimized = file;
		thumbnail = file;
	}

	if (typeof window !== 'undefined' && !navigator.onLine) {
		const tempId = crypto.randomUUID();
		const pending = {
			id: tempId,
			noteId,
			optimized,
			thumbnail,
			filename: file.name,
			mimeType: optimized.type || file.type,
			timestamp: Date.now()
		};
		await addPendingAttachment(pending);
		return;
	}

	const formData = new FormData();
	formData.append('file', new File([optimized], file.name, { type: optimized.type || file.type }));
	formData.append('thumbnail', new File([thumbnail], `${file.name}_thumb.webp`, { type: 'image/webp' }));

	const res = await fetch(`/api/notes/${noteId}/attachments`, {
		method: 'POST',
		body: formData
	});
	if (!res.ok) {
		throw new Error(`Upload failed: ${res.statusText}`);
	}
	return await res.json();
}
