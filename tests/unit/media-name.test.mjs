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

import { dropImageBlocks } from '../../tools/sample/lib/to-blocks.mjs';

test('block gambar yang gagal diunduh dibuang dari isi', () => {
  const markup = '<!-- wp:paragraph -->\n<p>a</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="https://old.jatman.or.id/x.jpg" alt=""/></figure>\n<!-- /wp:image -->\n\n<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="https://jatman.or.id/ok.jpg" alt=""/></figure>\n<!-- /wp:image -->';
  const out = dropImageBlocks(markup, ['https://old.jatman.or.id/x.jpg']);
  assert.ok(!out.includes('old.jatman.or.id'));
  assert.ok(out.includes('https://jatman.or.id/ok.jpg'));
  assert.ok(out.includes('<p>a</p>'));
});
