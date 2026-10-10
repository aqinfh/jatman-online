import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseArticle } from '../../tools/sample/lib/parse-article.mjs';
import { parseProfile } from '../../tools/sample/lib/parse-profile.mjs';

const html = readFileSync(new URL('../fixtures/varient/article.html', import.meta.url), 'utf8');
const URL_ = 'https://jatman.or.id/idarah-aliyyah-jatman-launching-logo-harlah-ke-69';

test('mengambil semua field artikel Varient', () => {
  const a = parseArticle(html, URL_);
  assert.equal(a.slug, 'idarah-aliyyah-jatman-launching-logo-harlah-ke-69');
  assert.equal(a.title, 'Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69');
  assert.equal(a.excerpt, "Jelang Hari Lahir Jam'iyyah Ahlith Thariqah (JATMAN) yang ke-69 Tahun.");
  assert.equal(a.date, '2026-10-04 07:33:10');
  assert.deepEqual(a.author, {
    slug: 'syahril-mubarok',
    name: 'Syahril Mubarok',
    avatarUrl: 'https://jatman.or.id/uploads/profile/202503/avatar_344_67d7416d43fb4.jpg',
  });
  assert.deepEqual(a.image, {
    url: 'https://jatman.or.id/uploads/images/202610/image_870x_6ac19de7abf7a.jpg',
    alt: 'Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69',
    caption: 'Logo Harlah Ke-69 JATMAN',
  });
  assert.deepEqual(a.tags, ['Harlah', 'Harlah JATMAN']);
  assert.deepEqual(a.breadcrumb, ['berita', 'berita/nasional']);
  assert.match(a.contentHtml, /me-<em>launching<\/em>/);
});

test('avatar bawaan Varient dianggap tidak ada', () => {
  const a = parseArticle(html.replace(/uploads\/profile\/[^"]+/, 'assets/img/user.png'), URL_);
  assert.equal(a.author.avatarUrl, null);
});

test('gambar lazy-load memakai data-src', () => {
  const lazy = html.replace(
    'src="https://jatman.or.id/uploads/images/202610/image_870x_6ac19de7abf7a.jpg"',
    'src="data:image/gif;base64,R0l" data-src="https://jatman.or.id/uploads/images/lazy.jpg"'
  );
  assert.equal(parseArticle(lazy, URL_).image.url, 'https://jatman.or.id/uploads/images/lazy.jpg');
});

test('halaman tanpa isi ditolak dengan pesan jelas', () => {
  assert.throws(() => parseArticle(html.replace('post-text', 'bukan-isi'), URL_), /isi \(\.post-text\) tidak ditemukan/);
});

test('tanggal yang formatnya aneh ditolak', () => {
  assert.throws(() => parseArticle(html.replace('2026-10-04 07:33:10', '4 Oktober'), URL_), /tanggal/);
});

test('bio profil dirapikan spasinya', () => {
  const p = parseProfile(readFileSync(new URL('../fixtures/varient/profile.html', import.meta.url), 'utf8'));
  assert.deepEqual(p, { bio: 'Kontributor JATMAN Online.' });
});
