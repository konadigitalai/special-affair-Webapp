import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharpFolder = (await fs.readdir('node_modules/.pnpm')).find(name => name.startsWith('sharp@'));
const sharp = require(path.resolve('node_modules/.pnpm', sharpFolder, 'node_modules/sharp'));
const rows = JSON.parse(await fs.readFile('scripts/flagship-artwork.json', 'utf8'));
const dest = 'public/images/flagship';
await fs.mkdir(`${dest}/originals`, { recursive: true });
for (const row of rows) {
  await fs.copyFile(row.source, `${dest}/originals/${row.key}.png`);
  const source = sharp(row.source);
  const meta = await source.metadata();
  await source.webp({ quality: 88, effort: 5 }).toFile(`${dest}/${row.key}.webp`);
  row.width = meta.width; row.height = meta.height;
}
await fs.writeFile(`${dest}/prompts.json`, JSON.stringify(rows.map(row => ({ key: row.key, prompt: row.prompt, width: row.width, height: row.height })), null, 2));
console.log(`Saved ${rows.length} original images and optimized WebP assets.`);
