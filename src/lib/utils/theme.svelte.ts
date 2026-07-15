import { browser } from '$app/environment';

const LIGHT_THEME_COLOR = '#f5f5f7';
const DARK_THEME_COLOR = '#1c1c1e';
const DARK_THEME_MEDIA = '(prefers-color-scheme: dark)';

let darkMode = $state(false);

export function getIsDarkMode(): boolean {
	return darkMode;
}

export function applyTheme(theme: 'system' | 'light' | 'dark'): void {
	if (!browser) return;

	// Validate input
	if (theme !== 'system' && theme !== 'light' && theme !== 'dark') {
		theme = 'system';
	}

	// Resolve system preference
	let resolved = theme;
	if (theme === 'system') {
		const prefersDark =
			typeof window.matchMedia === 'function' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches;
		resolved = prefersDark ? 'dark' : 'light';
	}

	const isDark = resolved === 'dark';
	darkMode = isDark;

	if (isDark) {
		document.documentElement.setAttribute('data-theme', 'dark');
	} else {
		document.documentElement.removeAttribute('data-theme');
	}

	const themeColorMetas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
	themeColorMetas.forEach((meta) => {
		if (theme === 'system') {
			const color =
				meta.getAttribute('media') === DARK_THEME_MEDIA ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
			meta.setAttribute('content', color);
		} else {
			meta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
		}
	});
}
