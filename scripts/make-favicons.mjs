#!/usr/bin/env node
// Builds public/favicon.png and public/apple-touch-icon.png from the red logo mark.
// Re-run if the logo changes: node scripts/make-favicons.mjs
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(ROOT, 'src/assets/images/brand/logo-mark-red.png');
const charcoal = { r: 0x24, g: 0x22, b: 0x22, alpha: 1 };

async function icon(size, out) {
  const inner = Math.round(size * 0.82);
  const mark = await sharp(src).trim().resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: charcoal } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(ROOT, 'public', out));
  console.log(`wrote public/${out}`);
}

await icon(64, 'favicon.png');
await icon(180, 'apple-touch-icon.png');
