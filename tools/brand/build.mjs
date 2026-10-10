#!/usr/bin/env node
/**
 * Bangun aset brand tema dari sumbernya:
 * - knot.svg (currentColor) + favicon.svg: hasil trace dari logo PNG JATMAN Online
 * - lambang-jatman.svg: SVG Wikimedia yang dioptimasi
 * - pattern.svg: ubin geometri bintang delapan
 * - font woff2: Plus Jakarta Sans & Source Serif 4 (fontsource), Uthman Taha -ID (repo ../uthman-taha)
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import potrace from 'potrace';
import { optimize } from 'svgo';
import wawoff2 from 'wawoff2';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/brand/src');
const IMG = path.join(ROOT, 'theme/jatman/assets/img');
const FONTS = path.join(ROOT, 'theme/jatman/assets/fonts');
const UTHMAN = process.env.UTHMAN_TAHA_DIR ?? path.resolve(ROOT, '../uthman-taha');

async function traceKnot() {
  // Logo 1297×931: knot di atas, wordmark "JATMAN ONLINE" mulai ±y=800. Ambil knot saja.
  // sharp menjalankan trim sebelum extract dalam satu pipeline, jadi crop dan trim dipisah.
  const knotOnly = await sharp(path.join(SRC, 'jatman-online-logo.png'))
    .extract({ left: 0, top: 0, width: 1297, height: 770 })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  const png = await sharp(knotOnly).trim({ background: '#ffffff' }).grayscale().png().toBuffer();
  const raw = await new Promise((resolve, reject) =>
    potrace.trace(png, { threshold: 160, turdSize: 8, optTolerance: 0.3, color: 'currentColor', background: 'transparent' },
      (err, svg) => (err ? reject(err) : resolve(svg)))
  );
  return optimize(raw, { multipass: true, plugins: ['preset-default', 'removeDimensions'] }).data;
}

const PATTERN = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="none" stroke="#F7F3EA" stroke-width="1"><path d="M40 12 68 40 40 68 12 40z"/><path d="M20.2 20.2h39.6v39.6H20.2z"/><circle cx="40" cy="40" r="7"/><path d="M0 0 12 12M80 0 68 12M0 80l12-12M80 80 68 68"/></g></svg>`;

const FONTSOURCE = [
  ['@fontsource-variable/plus-jakarta-sans', 'plus-jakarta-sans-latin-wght-normal.woff2'],
  ['@fontsource-variable/plus-jakarta-sans', 'plus-jakarta-sans-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-wght-italic.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-ext-wght-italic.woff2'],
];
const UTHMAN_FILES = [
  ['UthmanTN1-ID Ver10.ttf', 'uthman-taha-id-400.woff2'],
  ['UthmanTN1B-ID Ver10.ttf', 'uthman-taha-id-700.woff2'],
];

async function main() {
  await mkdir(IMG, { recursive: true });
  await mkdir(FONTS, { recursive: true });

  const knot = await traceKnot();
  await writeFile(path.join(IMG, 'knot.svg'), knot);
  await writeFile(path.join(IMG, 'favicon.svg'), knot.replaceAll('currentColor', '#00712D'));

  const lambang = await readFile(path.join(SRC, 'Logo_of_JATMAN.svg'), 'utf8');
  await writeFile(path.join(IMG, 'lambang-jatman.svg'), optimize(lambang, { multipass: true, plugins: ['preset-default'] }).data);
  await writeFile(path.join(IMG, 'pattern.svg'), PATTERN);

  for (const [pkg, file] of FONTSOURCE) {
    await copyFile(path.join(ROOT, 'node_modules', pkg, 'files', file), path.join(FONTS, file));
  }
  for (const [ttf, out] of UTHMAN_FILES) {
    const woff2 = await wawoff2.compress(await readFile(path.join(UTHMAN, ttf)));
    await writeFile(path.join(FONTS, out), Buffer.from(woff2));
  }
  console.log('Aset brand & font selesai dibangun.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
