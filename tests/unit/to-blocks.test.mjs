import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToBlocks } from '../../tools/sample/lib/to-blocks.mjs';

const P = (inner) => `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->`;

test('paragraf Varient tanpa tag penutup jadi paragraf terpisah, format inline dipertahankan', () => {
  const { markup } = htmlToBlocks('<p>Jakarta, <em><strong>JATMAN Online</strong></em>\n<p>Me-<em>launching</em> logo.');
  assert.equal(markup, [P('Jakarta, <em><strong>JATMAN Online</strong></em>'), P('Me-<em>launching</em> logo.')].join('\n\n'));
});

test('paragraf kosong dan span sampah dibuang; b/i diubah ke strong/em; style dibuang', () => {
  const { markup } = htmlToBlocks('<p data-pm-slice="1 1 []"><span><span class="x"></span></span></p><p style="color:red"><span class="a"><b>Tebal</b> dan <i>miring</i></span>&nbsp;</p>');
  assert.equal(markup, P('<strong>Tebal</strong> dan <em>miring</em>'));
});

test('tautan aman dipertahankan, javascript: dibuang', () => {
  const { markup } = htmlToBlocks('<p><a href="https://jatman.or.id/x" target="_blank">ok</a> <a href="javascript:alert(1)">jahat</a></p>');
  assert.equal(markup, P('<a href="https://jatman.or.id/x">ok</a> jahat'));
});

test('teks di-escape sekali', () => {
  assert.equal(htmlToBlocks('<p>A &amp; B &lt;C&gt;</p>').markup, P('A &amp; B &lt;C&gt;'));
});

test('heading: h1 diturunkan ke h2, h3 tetap', () => {
  const { markup } = htmlToBlocks('<h1>Satu</h1><h3>Tiga</h3>');
  assert.equal(
    markup,
    '<!-- wp:heading -->\n<h2 class="wp-block-heading">Satu</h2>\n<!-- /wp:heading -->\n\n' +
      '<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">Tiga</h3>\n<!-- /wp:heading -->'
  );
});

test('kutipan dan daftar', () => {
  const { markup } = htmlToBlocks('<blockquote><p>Ilmu itu cahaya.</p></blockquote><ol><li>Satu</li><li><b>Dua</b></li></ol>');
  assert.equal(
    markup,
    '<!-- wp:quote -->\n<blockquote class="wp-block-quote">' + P('Ilmu itu cahaya.') + '</blockquote>\n<!-- /wp:quote -->\n\n' +
      '<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list"><!-- wp:list-item -->\n<li>Satu</li>\n<!-- /wp:list-item --><!-- wp:list-item -->\n<li><strong>Dua</strong></li>\n<!-- /wp:list-item --></ol>\n<!-- /wp:list -->'
  );
});

test('gambar: paragraf berisi gambar saja dan figure+caption jadi block image; URL dicatat', () => {
  const { markup, images } = htmlToBlocks(
    '<p><img src="https://jatman.or.id/a.jpg" alt="A"></p><figure><img data-src="https://jatman.or.id/b.jpg" src="data:x"><figcaption>Keterangan B</figcaption></figure>'
  );
  assert.deepEqual(images, ['https://jatman.or.id/a.jpg', 'https://jatman.or.id/b.jpg']);
  assert.equal(
    markup,
    '<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="https://jatman.or.id/a.jpg" alt="A"/></figure>\n<!-- /wp:image -->\n\n' +
      '<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="https://jatman.or.id/b.jpg" alt=""/><figcaption class="wp-element-caption">Keterangan B</figcaption></figure>\n<!-- /wp:image -->'
  );
});

test('gambar di tengah paragraf berteks tidak hilang: teks dulu, lalu gambarnya', () => {
  const { markup, images } = htmlToBlocks('<p>Sebelum <img src="https://jatman.or.id/c.jpg"> sesudah</p>');
  assert.deepEqual(images, ['https://jatman.or.id/c.jpg']);
  assert.match(markup, /^<!-- wp:paragraph -->\n<p>Sebelum sesudah<\/p>/);
  assert.match(markup, /<img src="https:\/\/jatman\.or\.id\/c\.jpg" alt=""\/>/);
});

test('div bersarang dibuka; teks lepas jadi paragraf', () => {
  const { markup } = htmlToBlocks('<div><div>Teks lepas <strong>tebal</strong><p>Paragraf</p></div></div>');
  assert.equal(markup, [P('Teks lepas <strong>tebal</strong>'), P('Paragraf')].join('\n\n'));
});

test('paragraf Arab ditandai jm-arab; Arab di paragraf campuran dibungkus span', () => {
  const { markup } = htmlToBlocks('<p>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p><p>Lafaz اللّٰهُ أَكْبَرُ dibaca keras.</p>');
  assert.match(markup, /^<!-- wp:paragraph \{"className":"jm-arab"\} -->\n<p class="jm-arab"><span lang="ar" dir="rtl">بِسْمِ/);
  assert.match(markup, /<p>Lafaz <span lang="ar" dir="rtl">اللّٰهُ أَكْبَرُ<\/span> dibaca keras\.<\/p>/);
});

test('tabel/iframe jadi block HTML tanpa style/class', () => {
  const { markup } = htmlToBlocks('<table style="width:100%" class="t"><tr><td>1</td></tr></table>');
  assert.equal(markup, '<!-- wp:html -->\n<table><tbody><tr><td>1</td></tr></tbody></table>\n<!-- /wp:html -->');
});

const words = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));

test('gambar di dalam tautan/span di luar paragraf tidak hilang', () => {
  const { markup, images } = htmlToBlocks('<a href="https://jatman.or.id/foto"><img src="https://jatman.or.id/a.jpg"></a><div><span><img src="https://jatman.or.id/b.jpg"></span></div>');
  assert.deepEqual(images, ['https://jatman.or.id/a.jpg', 'https://jatman.or.id/b.jpg']);
  assert.equal((markup.match(/<!-- wp:image /g) ?? []).length, 2);
});

test('gambar di dalam heading tidak hilang', () => {
  const { markup, images } = htmlToBlocks('<h2>Judul <img src="https://jatman.or.id/h.jpg"></h2>');
  assert.deepEqual(images, ['https://jatman.or.id/h.jpg']);
  assert.match(markup, /<h2 class="wp-block-heading">Judul<\/h2>/);
  assert.match(markup, /wp:image/);
});

test('kutipan mempertahankan teks lepas dan daftar di dalamnya', () => {
  const { markup } = htmlToBlocks('<blockquote>Pengantar<p>Isi kutipan</p><ul><li>butir satu</li></ul></blockquote>');
  assert.match(markup, /^<!-- wp:quote -->/);
  for (const w of ['Pengantar', 'Isi kutipan', 'butir satu']) assert.ok(markup.includes(w), w);
  assert.match(markup, /<!-- wp:list -->/);
});

test('gambar di dalam blok HTML (tabel) ikut dicatat untuk diunduh', () => {
  const { images } = htmlToBlocks('<table><tr><td><img src="https://jatman.or.id/t.jpg"></td></tr></table>');
  assert.deepEqual(images, ['https://jatman.or.id/t.jpg']);
});

test('tautan internal relatif dipertahankan', () => {
  assert.equal(htmlToBlocks('<p><a href="/slug-lama">baca</a></p>').markup, P('<a href="/slug-lama">baca</a>'));
});

test('invarian: semua kata dan gambar dari markup kacau muncul di hasil', () => {
  const input = `<div><p>Pembuka <b>tebal</b><div><span>teks lepas</span><a href="/x"><img src="https://jatman.or.id/1.jpg"></a></div>
    <h3>Sub <img src="https://jatman.or.id/2.jpg"></h3><blockquote>Kata kiai<ul><li>satu</li><li>dua</li></ul></blockquote>
    <table><tr><td>sel <img src="https://jatman.or.id/3.jpg"></td></tr></table><font><i>miring</i></font></div>`;
  const { markup, images } = htmlToBlocks(input);
  for (const w of words(input)) assert.ok(markup.includes(w), `kata hilang: ${w}`);
  assert.deepEqual(images.sort(), ['https://jatman.or.id/1.jpg', 'https://jatman.or.id/2.jpg', 'https://jatman.or.id/3.jpg']);
});
