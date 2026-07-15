// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock $app/environment
vi.mock('$app/environment', () => ({ browser: true }));

describe('applyTheme', () => {
	let applyTheme: (theme: 'system' | 'light' | 'dark') => void;
	let prefersDark = false;

	function getThemeColor(media: string): string | null {
		return document
			.querySelector<HTMLMetaElement>(`meta[name="theme-color"][media="${media}"]`)
			?.getAttribute('content') ?? null;
	}

	beforeEach(async () => {
		// Reset DOM
		document.documentElement.removeAttribute('data-theme');
		document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
		document.head.insertAdjacentHTML(
			'beforeend',
			'<meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)">' +
				'<meta name="theme-color" content="#1c1c1e" media="(prefers-color-scheme: dark)">'
		);
		prefersDark = false;
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: query === '(prefers-color-scheme: dark)' && prefersDark,
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		});

		// Reset module state
		vi.resetModules();
		const mod = await import('$lib/utils/theme.svelte.js');
		applyTheme = mod.applyTheme;
	});

	it('sets data-theme="dark" for dark mode', () => {
		applyTheme('dark');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
	});

	it('removes data-theme for light mode', () => {
		document.documentElement.setAttribute('data-theme', 'dark');
		applyTheme('light');
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
	});

	it('sets both theme colors to dark for an explicit dark theme', () => {
		applyTheme('dark');
		expect(getThemeColor('(prefers-color-scheme: light)')).toBe('#1c1c1e');
		expect(getThemeColor('(prefers-color-scheme: dark)')).toBe('#1c1c1e');
	});

	it('sets both theme colors to light for an explicit light theme', () => {
		applyTheme('dark');
		applyTheme('light');
		expect(getThemeColor('(prefers-color-scheme: light)')).toBe('#f5f5f7');
		expect(getThemeColor('(prefers-color-scheme: dark)')).toBe('#f5f5f7');
	});

	it('restores native light and dark colors for the system theme', () => {
		applyTheme('dark');
		applyTheme('system');
		expect(getThemeColor('(prefers-color-scheme: light)')).toBe('#f5f5f7');
		expect(getThemeColor('(prefers-color-scheme: dark)')).toBe('#1c1c1e');
	});

	it('falls back to system for unknown values', () => {
		// matchMedia returns false by default in jsdom → resolves to light
		applyTheme('invalid' as 'system' | 'light' | 'dark');
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
	});

	it('resolves system preference to dark when prefers-color-scheme is dark', () => {
		prefersDark = true;
		applyTheme('system');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
	});
});
