import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const dist = 'dist';
const swPath = join(dist, 'sw.js');
const assets = await readdir(join(dist, 'assets')).catch(() => []);
const files = ['./index.html', './manifest.webmanifest', './favicon.svg', ...assets.map((name) => `./assets/${name}`)];
const sw = await readFile(swPath, 'utf8');
const next = sw.replace(/const PRECACHE = \[[^\]]*\];/, `const PRECACHE = ${JSON.stringify(files)};`);
if (next === sw) {
  console.error('precache: PRECACHE list not found in dist/sw.js');
  process.exit(1);
}
await writeFile(swPath, next);
console.log(`precache: ${files.length} files listed in dist/sw.js`);
