import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

const STATIC_DIR = 'static';
const MAX_TOTAL_ICON_BYTES = 500_000;
const MAX_SVG_BYTES = 100_000;
const ICON_FILE = /^(?:apple-touch-icon|favicon|pwa-).*\.(?:ico|png|svg|webp)$/;

async function listFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const path = join(directory, entry.name);
			return entry.isDirectory() ? listFiles(path) : [path];
		})
	);
	return nested.flat();
}

const files = await listFiles(STATIC_DIR);
const iconFiles = files.filter((path) => ICON_FILE.test(basename(path)));
const iconSizes = await Promise.all(
	iconFiles.map(async (path) => ({ path, size: (await stat(path)).size }))
);
const totalIconBytes = iconSizes.reduce((total, file) => total + file.size, 0);
const failures: string[] = [];

if (totalIconBytes > MAX_TOTAL_ICON_BYTES) {
	failures.push(
		`icon assets total ${totalIconBytes} bytes; limit is ${MAX_TOTAL_ICON_BYTES}`
	);
}

for (const file of files.filter((path) => path.endsWith('.svg'))) {
	const { size } = await stat(file);
	const content = await readFile(file, 'utf8');
	if (size > MAX_SVG_BYTES) {
		failures.push(`${file} is ${size} bytes; SVG limit is ${MAX_SVG_BYTES}`);
	}
	if (/data:image\/[^;]+;base64,/i.test(content)) {
		failures.push(`${file} embeds a base64 raster image`);
	}
}

if (failures.length > 0) {
	throw new Error(`Static asset budget exceeded:\n- ${failures.join('\n- ')}`);
}

console.log(
	`Static asset budget passed: ${iconFiles.length} icons, ${totalIconBytes} bytes`
);
