import type { NoteColor } from '$lib/types/index.js';

export const NOTE_COLORS: Record<NoteColor, { bg: string; label: string }> = {
	default: { bg: '#ffffff', label: 'Default' },
	coral: { bg: '#ffd3d1', label: 'Coral' },
	peach: { bg: '#ffe4d1', label: 'Peach' },
	sand: { bg: '#fff7c2', label: 'Sand' },
	mint: { bg: '#dcf8e6', label: 'Mint' },
	sage: { bg: '#d2f2ed', label: 'Sage' },
	fog: { bg: '#d6eaff', label: 'Fog' },
	storm: { bg: '#cce3ff', label: 'Storm' },
	dusk: { bg: '#e8ddf5', label: 'Dusk' },
	blossom: { bg: '#ffe0eb', label: 'Blossom' },
	clay: { bg: '#f2ebe1', label: 'Clay' },
	chalk: { bg: '#f1f1f5', label: 'Chalk' }
};

export const NOTE_COLORS_DARK: Record<NoteColor, { bg: string; label: string }> = {
	default: { bg: '#2c2c2e', label: 'Default' },
	coral: { bg: '#3d1a1a', label: 'Coral' },
	peach: { bg: '#3d261a', label: 'Peach' },
	sand: { bg: '#3a351a', label: 'Sand' },
	mint: { bg: '#1a3d24', label: 'Mint' },
	sage: { bg: '#1a3d36', label: 'Sage' },
	fog: { bg: '#1a2c3d', label: 'Fog' },
	storm: { bg: '#152433', label: 'Storm' },
	dusk: { bg: '#2b1a3d', label: 'Dusk' },
	blossom: { bg: '#3d1a2c', label: 'Blossom' },
	clay: { bg: '#2a2722', label: 'Clay' },
	chalk: { bg: '#262628', label: 'Chalk' }
};

export function getNoteColor(color: NoteColor, isDark: boolean): string {
	const map = isDark ? NOTE_COLORS_DARK : NOTE_COLORS;
	return (map[color] ?? map.default).bg;
}

export const COLOR_OPTIONS = Object.entries(NOTE_COLORS).map(([value, { label }]) => ({
	value: value as NoteColor,
	label
}));
