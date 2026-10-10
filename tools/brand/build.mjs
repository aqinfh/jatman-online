#!/usr/bin/env node
/**
 * Bangun aset brand tema dari sumbernya:
 * - knot.svg (currentColor) + favicon.svg: hasil trace dari logo PNG JATMAN Online
 * - lambang-jatman.svg: SVG Wikimedia yang dioptimasi
 * - pattern.svg & ornament.svg: ubin geometri dan ornamen bintang delapan
 * - lambang-jatman-{48,144}.png: lambang ringan untuk top bar & footer
 * - font woff2: Inter (fontsource), Uthman Taha -ID (repo ../uthman-taha)
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

// Star-and-cross klasik: garis luar bintang {8/2} di tiap ubin; ujung sumbu bertemu tetangga,
// salib terbentuk di antara empat bintang. Strapwork = garis ganda lewat mask.
function starCross(T = 120) {
  const c = T / 2, R = T / 2, r = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
  const star = (cx, cy, R1, r1) => 'M' + Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8 - Math.PI / 2, rad = i % 2 ? r1 : R1;
    return `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
  }).join('L') + 'Z';
  const oct = (cx, cy, rr) => 'M' + Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join('L') + 'Z';
  const paths = `<path d="${star(c, c, R, r)}"/><path d="${star(c, c, R * 0.46, r * 0.46)}"/><path d="${oct(c, c, R * 0.16)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}"><defs><mask id="m"><rect width="${T}" height="${T}" fill="#fff"/><g fill="none" stroke="#000" stroke-width="1.2">${paths}</g></mask></defs><g fill="none" stroke="#000" stroke-width="3.6" stroke-linejoin="miter" mask="url(#m)">${paths}</g></svg>`;
}
const PATTERN = starCross(120);

// Ornamen bintang delapan (dipakai sebagai CSS mask, warnanya dari token emas).
const ORNAMENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M20 2l5.3 7.2 8.4-2.9-2.9 8.4L38 20l-7.2 5.3 2.9 8.4-8.4-2.9L20 38l-5.3-7.2-8.4 2.9 2.9-8.4L2 20l7.2-5.3-2.9-8.4 8.4 2.9z" fill="none" stroke="#000" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="20" r="4.5"/></svg>`;

const FONTSOURCE = [
  ['@fontsource-variable/inter', 'inter-latin-wght-normal.woff2'],
  // latin-ext Inter mencakup huruf transliterasi Arab (ā ḥ ṣ ṭ ẓ ḍ ʿ ʾ).
  ['@fontsource-variable/inter', 'inter-latin-ext-wght-normal.woff2'],
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
  // Favicon: kotak hijau brand dengan knot putih di tengah.
  const [, , kw, kh] = knot.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const inner = knot.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replaceAll('currentColor', '#fff');
  const w = 46, h = (w * kh) / kw;
  await writeFile(path.join(IMG, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00712D"/><svg x="${(64 - w) / 2}" y="${(64 - h) / 2}" width="${w}" height="${h.toFixed(2)}" viewBox="0 0 ${kw} ${kh}">${inner}</svg></svg>`);

  const lambang = await readFile(path.join(SRC, 'Logo_of_JATMAN.svg'), 'utf8');
  await writeFile(path.join(IMG, 'lambang-jatman.svg'), optimize(lambang, { multipass: true, plugins: ['preset-default'] }).data);
  await writeFile(path.join(IMG, 'pattern.svg'), PATTERN);
  await writeFile(path.join(IMG, 'ornament.svg'), ORNAMENT);
  // Lambang SVG penuh ±180 KB; untuk ikon kecil (top bar 22px, footer 72px) pakai PNG @2x.
  for (const px of [48, 144]) {
    await sharp(Buffer.from(lambang), { density: 300 }).resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true }).toFile(path.join(IMG, `lambang-jatman-${px}.png`));
  }

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
