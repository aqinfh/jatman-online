import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePage } from '../../tools/sample/lib/parse-page.mjs';

const read = (f) => readFileSync(new URL(`../fixtures/varient/${f}`, import.meta.url), 'utf8');

test('halaman Syarat & Ketentuan: judul dan isi, **tebal** dirapikan', () => {
  const p = parsePage(read('page-terms.html'), 'terms-conditions');
  assert.equal(p.title, 'Terms & Conditions');
  assert.match(p.content, /<strong>Kekayaan Intelektual<\/strong>/);
  assert.doesNotMatch(p.content, /\*\*/);
});

test('halaman Kontak: teks pembuka + info kontak, tanpa formulir lama', () => {
  const p = parsePage(read('page-kontak.html'), 'kontak');
  assert.equal(p.title, 'Kontak');
  assert.match(p.content, /Silakan hubungi kami/);
  assert.match(p.content, /<a href="mailto:redaksi@jatman.or.id">redaksi@jatman.or.id<\/a>/);
  assert.match(p.content, /Gedung PBNU II, Jl\. Taman Amir Hamzah, Menteng, DKI Jakarta/);
  assert.match(p.content, /\[jatman_kontak\]/);
  assert.doesNotMatch(p.content, /csrf_token|recaptcha|<form/i);
});
