import { describe, it, expect } from 'vitest';
import { sanitizeFilename, getUniqueFilename, parseMarkdownContent } from './import-export.js';

describe('import-export utils', () => {
	describe('sanitizeFilename', () => {
		it('should replace invalid characters with hyphens', () => {
			expect(sanitizeFilename('My/Cool\\Note: Title?')).toBe('My-Cool-Note- Title-');
			expect(sanitizeFilename('a|b<c>d*e"f')).toBe('a-b-c-d-e-f');
		});

		it('should return untitled for empty name', () => {
			expect(sanitizeFilename('')).toBe('untitled');
		});
	});

	describe('getUniqueFilename', () => {
		it('should generate unique filename by appending counter', () => {
			const existing = new Set<string>(['note.md', 'note-1.md']);
			expect(getUniqueFilename('note', 'md', existing)).toBe('note-2.md');
			expect(existing.has('note-2.md')).toBe(true);
		});
	});

	describe('parseMarkdownContent', () => {
		it('should extract title from first heading and strip it', () => {
			const raw = '# My Note Title\n\nSome content here\nMore content';
			const { title, content } = parseMarkdownContent('file.md', raw);
			expect(title).toBe('My Note Title');
			expect(content).toBe('Some content here\nMore content');
		});

		it('should fallback to filename if no heading', () => {
			const raw = 'Some content here\nMore content';
			const { title, content } = parseMarkdownContent('My Filename.md', raw);
			expect(title).toBe('My Filename');
			expect(content).toBe('Some content here\nMore content');
		});
	});
});
