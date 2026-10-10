import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const IMG = 'theme/jatman/assets/img';
const FONTS = 'theme/jatman/assets/fonts';
const svgTag = (svg) => svg.match(/<svg[^>]*>/)[0];

test('knot.svg siap di-inline: viewBox, currentColor, tanpa ukuran tetap, ringan', () => {
  const svg = readFileSync(`${IMG}/knot.svg`, 'utf8');
  assert.match(svgTag(svg), /viewBox="/);
  assert.doesNotMatch(svgTag(svg), /\s(width|height)="/);
  assert.match(svg, /currentColor/);
  assert.ok(svg.length < 40_000, `knot.svg ${svg.length} byte`);
  const [, , w] = svgTag(svg).match(/viewBox="([\d.]+ [\d.]+ [\d.]+)/)[1].split(' ').map(Number);
  assert.ok(w < 1297, `knot harus di-trim rapat (lebar viewBox ${w})`);
});

test('favicon.svg berwarna hijau brand', () => {
  assert.match(readFileSync(`${IMG}/favicon.svg`, 'utf8'), /#00712D/i);
});

test('lambang-jatman.svg teroptimasi dan punya viewBox', () => {
  const svg = readFileSync(`${IMG}/lambang-jatman.svg`, 'utf8');
  assert.match(svgTag(svg), /viewBox="/);
  assert.ok(svg.length < 200_000, `lambang ${svg.length} byte`);
});

test('lambang PNG ringan untuk top bar & footer', () => {
  for (const px of [48, 144]) {
    const png = readFileSync(`${IMG}/lambang-jatman-${px}.png`);
    assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
    assert.ok(png.length < 30_000, `lambang-jatman-${px}.png ${png.length} byte`);
  }
});

test('ornament.svg ada', () => {
  assert.match(readFileSync(`${IMG}/ornament.svg`, 'utf8'), /viewBox="0 0 40 40"/);
});

test('pattern.svg ada', () => {
  assert.match(readFileSync(`${IMG}/pattern.svg`, 'utf8'), /<svg/);
});

test('tidak ada font serif tersisa (isi artikel memakai sans)', () => {
  assert.deepEqual(readdirSync(FONTS).filter((f) => f.startsWith('source-serif')), []);
});

test('semua font berformat woff2', () => {
  const files = [
    'heebo-latin-wght-normal.woff2', 'heebo-latin-ext-wght-normal.woff2', 'source-sans-3-latin-ext-wght-normal.woff2',
    'uthman-taha-id-400.woff2', 'uthman-taha-id-700.woff2',
  ];
  for (const f of files) assert.equal(readFileSync(`${FONTS}/${f}`).subarray(0, 4).toString('latin1'), 'wOF2', f);
});
