import { test, expect } from '@playwright/test';
import { DAWUH, NEWS, wp } from './helpers';

test('membuka semua halaman tidak memicu PHP notice/warning dari kode jatman', async ({ page }) => {
  test.setTimeout(120_000);
  wp('eval', 'file_put_contents( WP_CONTENT_DIR . "/debug.log", "" );');
  for (const path of ['/', `/${NEWS}/`, `/${DAWUH}/`, '/berita/', '/berita/nasional/', '/hikmah/', '/profile/syahril-mubarok/',
    '/tag/jatman/', '/?s=jatman', '/?s=zzqx', '/halaman-tidak-ada/', '/tentang/', '/redaksi/']) {
    await page.goto(path);
  }
  const log = wp('eval', 'echo (string) @file_get_contents( WP_CONTENT_DIR . "/debug.log" );');
  const ours = log.split('\n').filter((l) => /PHP (Notice|Warning|Fatal|Deprecated)/.test(l) && /(themes\/jatman|mu-plugins|\/tools\/)/.test(l));
  expect(ours).toEqual([]);
});
