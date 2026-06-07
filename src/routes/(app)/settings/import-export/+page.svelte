<script lang="ts">
	import { notes, createNote } from '$lib/stores/notes.js';
	import { exportAllNotes, importFile } from '$lib/utils/import-export.js';
	import { showToast } from '$lib/stores/toast.js';
	import FileUp from 'lucide-svelte/icons/file-up';
	import FileDown from 'lucide-svelte/icons/file-down';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';

	let isExporting = $state(false);
	let isImporting = $state(false);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement>();

	let importStatus = $state<{
		success: number;
		failed: number;
		show: boolean;
	}>({ success: 0, failed: 0, show: false });

	async function handleExport() {
		if (isExporting) return;
		isExporting = true;
		try {
			await exportAllNotes($notes);
			showToast('Notes exported successfully!', 'success');
		} catch (err) {
			console.error('Export failed:', err);
			showToast('Failed to export notes', 'error');
		} finally {
			isExporting = false;
		}
	}

	async function processFile(file: File) {
		isImporting = true;
		importStatus.show = false;
		try {
			const res = await importFile(file, createNote);
			importStatus = {
				success: res.successCount,
				failed: res.failedCount,
				show: true
			};
			if (res.successCount > 0) {
				showToast(`Successfully imported ${res.successCount} note(s)!`, 'success');
			}
			if (res.failedCount > 0) {
				showToast(`Failed to import ${res.failedCount} note(s)`, 'error');
			}
		} catch (err) {
			console.error('Import failed:', err);
			showToast('Failed to import file', 'error');
		} finally {
			isImporting = false;
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			processFile(file);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) {
			processFile(file);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}
</script>

<div class="space-y-8" data-testid="settings-import-export">
	<h2 class="text-xl font-bold text-[var(--text)]">Import / Export</h2>

	<!-- Export section -->
	<div class="rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--card-shadow)]">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div class="space-y-1">
				<h3 class="text-lg font-bold text-[var(--text)]">Export Notes</h3>
				<p class="text-sm text-[var(--text-muted)]">
					Download all your notes as markdown (.md) files. Notes containing attachments, or if there are multiple notes, will be packaged into a ZIP archive.
				</p>
			</div>
			<button
				onclick={handleExport}
				disabled={isExporting || $notes.length === 0}
				class="flex shrink-0 items-center justify-center gap-2 rounded-sm border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-50 disabled:pointer-events-none"
				data-testid="export-all-btn"
			>
				{#if isExporting}
					<RefreshCw class="h-4 w-4 animate-spin" />
					Exporting...
				{:else}
					<FileDown class="h-4 w-4" />
					Export All ({$notes.length})
				{/if}
			</button>
		</div>
	</div>

	<!-- Import section -->
	<div class="rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-[var(--card-shadow)]">
		<div class="space-y-4">
			<div class="space-y-1">
				<h3 class="text-lg font-bold text-[var(--text)]">Import Notes</h3>
				<p class="text-sm text-[var(--text-muted)]">
					Upload a single markdown file (.md) or a ZIP archive containing multiple markdown files and an optional <code class="rounded-sm bg-[var(--bg-base)] px-1 py-0.5 text-xs">attachments/</code> folder.
				</p>
			</div>

			<!-- Drag & Drop Zone -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
				class="flex cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-8 transition-colors {dragOver ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border-subtle)] hover:border-[var(--primary)] hover:bg-[var(--bg-base)]/50'}"
				role="button"
				tabindex="0"
				data-testid="import-drop-zone"
			>
				<input
					bind:this={fileInput}
					type="file"
					accept=".md,.zip"
					onchange={handleFileChange}
					class="hidden"
				/>

				{#if isImporting}
					<RefreshCw class="mb-3 h-8 w-8 animate-spin text-[var(--primary)]" />
					<p class="text-sm font-medium text-[var(--text)]">Importing your notes...</p>
				{:else}
					<FileUp class="mb-3 h-8 w-8 text-[var(--text-muted)] group-hover:text-[var(--primary)]" />
					<p class="text-sm font-medium text-[var(--text)]">
						{dragOver ? 'Drop file here!' : 'Click or drag file here to import'}
					</p>
					<p class="mt-1 text-xs text-[var(--text-muted)]">Supports .md and .zip files</p>
				{/if}
			</div>

			<!-- Import Status Alert -->
			{#if importStatus.show}
				<div
					class="rounded-sm border p-4"
					style="background-color: {importStatus.failed > 0 ? 'var(--error-bg)' : 'var(--success-bg)'}; border-color: {importStatus.failed > 0 ? 'var(--error-border)' : 'var(--border)'}; color: {importStatus.failed > 0 ? 'var(--error-text)' : 'var(--success-text)'};"
				>
					<h4 class="font-bold text-sm">Import completed</h4>
					<p class="mt-1 text-xs">
						Successfully imported <strong>{importStatus.success}</strong> notes.
						{#if importStatus.failed > 0}
							Failed to import <strong>{importStatus.failed}</strong> files.
						{/if}
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
