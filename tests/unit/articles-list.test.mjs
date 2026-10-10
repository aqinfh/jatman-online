import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArticlesList } from '../../tools/sample/lib/articles-list.mjs';

test('membaca kategori, URL, slug, dan flag; mengabaikan komentar & baris kosong', () => {
  const list = parseArticlesList(`# komentar
nasional https://jatman.or.id/judul-satu sticky pilihan

dawuh   https://jatman.or.id/judul-dua
`);
  assert.deepEqual(list, [
    { category: 'nasional', url: 'https://jatman.or.id/judul-satu', slug: 'judul-satu', flags: ['sticky', 'pilihan'] },
    { category: 'dawuh', url: 'https://jatman.or.id/judul-dua', slug: 'judul-dua', flags: [] },
  ]);
});

test('baris rusak dilaporkan dengan nomor barisnya', () => {
  assert.throws(() => parseArticlesList('# a\nnasional bukan-url'), /baris 2/);
});

test('flag tak dikenal ditolak', () => {
  assert.throws(() => parseArticlesList('nasional https://jatman.or.id/x unggulan'), /Flag tidak dikenal: unggulan/);
});
