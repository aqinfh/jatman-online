#!/usr/bin/env node
/**
 * Bangun aset brand tema dari sumbernya:
 * - knot.svg (currentColor) + favicon.svg: hasil trace dari logo PNG JATMAN Online
 * - lambang-jatman.svg: SVG Wikimedia yang dioptimasi
 * - pattern.svg: motif girih 8 sudut (polygons-in-contact); ornament.svg: bintang delapan
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

// Motif girih 8 sudut: metode polygons-in-contact di tiling oktagon–bujur sangkar (4.8.8),
// sudut kontak 67,5°, sinar bertemu sisi berjarak dua (k=2), plus rosette kecil di pusat bintang.
// Polygons-in-contact di tiling 4.8.8: oktagon di tengah ubin, bujur sangkar (belah ketupat) di sudut.
const rad = (d) => (d * Math.PI) / 180;
const poly = (cx, cy, n, R, rot) => Array.from({ length: n }, (_, k) => [cx + R * Math.cos(rot + (2 * Math.PI * k) / n), cy + R * Math.sin(rot + (2 * Math.PI * k) / n)]);
const intersect = ([x1, y1], a1, [x2, y2], a2) => {
  const d1 = [Math.cos(a1), Math.sin(a1)], d2 = [Math.cos(a2), Math.sin(a2)];
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  const t = ((x2 - x1) * d2[1] - (y2 - y1) * d2[0]) / den;
  return [x1 + t * d1[0], y1 + t * d1[1]];
};
function picLines(V, theta, k = 1) {
  // V berurutan CCW (dalam koordinat layar y ke bawah: urut menurut sudut naik = searah jarum jam visual; normal dalam = kanan)
  const n = V.length, segs = [];
  const M = V.map((v, i) => [(v[0] + V[(i + 1) % n][0]) / 2, (v[1] + V[(i + 1) % n][1]) / 2]);
  const ang = V.map((v, i) => Math.atan2(V[(i + 1) % n][1] - v[1], V[(i + 1) % n][0] - v[0]));
  for (let i = 0; i < n; i++) {
    const j = (i + k) % n;
    const a = ang[i] + theta;               // dari M_i condong ke depan, masuk ke dalam
    const b = ang[j] + Math.PI - theta;     // dari M_j condong ke belakang, masuk ke dalam
    const P = intersect(M[i], a, M[j], b);
    segs.push([M[i], P], [P, M[j]]);
  }
  return segs;
}
function pattern(T, thetaDeg, { rosette = true, k = 1 } = {}) {
  const theta = rad(thetaDeg), c = T / 2;
  const Ro = (T / 2) / Math.cos(rad(22.5));
  const s = T * Math.tan(rad(22.5));
  const oct = poly(c, c, 8, Ro, rad(22.5));
  const segs = [...picLines(oct, theta, k)];
  for (const [x, y] of [[0, 0], [T, 0], [0, T], [T, T]]) segs.push(...picLines(poly(x, y, 4, s / Math.SQRT2, 0), theta));
  const d = segs.map(([[a, b], [e, f]]) => `M${a.toFixed(2)} ${b.toFixed(2)}L${e.toFixed(2)} ${f.toFixed(2)}`).join('');
  let extra = '';
  if (rosette) {
    const inner = poly(c, c, 8, Ro * 0.36, rad(22.5));
    extra = `<path d="${picLines(inner, rad(60)).map(([[a, b], [e, f]]) => `M${a.toFixed(2)} ${b.toFixed(2)}L${e.toFixed(2)} ${f.toFixed(2)}`).join('')}"/><circle cx="${c}" cy="${c}" r="${(Ro * 0.08).toFixed(2)}"/>`;
  }
  const paths = `<path d="${d}"/>${extra}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}"><defs><mask id="m"><rect width="${T}" height="${T}" fill="#fff"/><g fill="none" stroke="#000" stroke-width="1.1" stroke-linecap="round">${paths}</g></mask></defs><g fill="none" stroke="#000" stroke-width="3.4" stroke-linejoin="miter" stroke-linecap="square" mask="url(#m)">${paths}</g></svg>`;
}
const PATTERN = pattern(160, 67.5, { k: 2, rosette: true });

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
