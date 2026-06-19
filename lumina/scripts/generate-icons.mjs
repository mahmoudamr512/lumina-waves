// Generates the standalone brand SVG assets and rasterizes the mark to PNGs.
//
//   public/brand/logo-mark.svg, logo-full.svg, wordmark.svg  (self-contained)
//   public/favicon.svg, src/app/icon.svg                     (the mark)
//   public/icons/icon-192.png, icon-512.png,
//                icon-maskable-512.png, apple-touch-icon.png
//
// Run via `npm run icons`. The PNGs are committed so no build step is required.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { markSvg, wordmarkSvg, fullSvg } from './svgGeometry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INK = '#0A0A0D';

async function write(relPath, contents) {
  const abs = resolve(root, relPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, contents);
  console.log('  wrote', relPath);
}

/** Render the mark SVG centred on an ink square with the given safe-area inset. */
async function rasterMark({ size, padRatio }) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const offset = Math.round((size - inner) / 2);
  const mark = await sharp(Buffer.from(markSvg({ gid: 'png' })))
    .resize(inner, inner)
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: INK,
    },
  })
    .composite([{ input: mark, top: offset, left: offset }])
    .png()
    .toBuffer();
}

async function main() {
  console.log('Generating brand SVG assets...');
  await write('public/brand/logo-mark.svg', markSvg({ gid: 'mark' }));
  await write('public/brand/logo-full.svg', fullSvg({ gid: 'full' }));
  await write('public/brand/wordmark.svg', wordmarkSvg({ gid: 'word' }));
  await write('public/favicon.svg', markSvg({ gid: 'fav' }));
  await write('src/app/icon.svg', markSvg({ gid: 'icon' }));

  console.log('Rasterizing PNG icons...');
  // Standard icons: small safe-area so the mark fills the tile.
  await write('public/icons/icon-192.png', await rasterMark({ size: 192, padRatio: 0.1 }));
  await write('public/icons/icon-512.png', await rasterMark({ size: 512, padRatio: 0.1 }));
  // Maskable: larger safe area (~20%) so the mark survives platform masking.
  await write(
    'public/icons/icon-maskable-512.png',
    await rasterMark({ size: 512, padRatio: 0.2 }),
  );
  await write(
    'public/icons/apple-touch-icon.png',
    await rasterMark({ size: 180, padRatio: 0.12 }),
  );

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
