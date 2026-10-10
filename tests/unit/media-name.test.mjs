import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaName } from '../../tools/sample/lib/media-name.mjs';

test('nama file deterministik dan mempertahankan ekstensi gambar', () => {
  const a = mediaName('https://jatman.or.id/uploads/images/202610/x.JPG');
  assert.match(a, /^[0-9a-f]{16}\.jpg$/);
  assert.equal(a, mediaName('https://jatman.or.id/uploads/images/202610/x.JPG'));
  assert.notEqual(a, mediaName('https://jatman.or.id/uploads/images/202610/y.JPG'));
  assert.match(mediaName('https://jatman.or.id/a.webp'), /\.webp$/);
  assert.match(mediaName('https://jatman.or.id/tanpa-ekstensi'), /\.jpg$/);
});
