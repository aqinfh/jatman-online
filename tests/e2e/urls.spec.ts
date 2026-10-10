import { test, expect } from '@playwright/test';
import { norm, samplePosts } from './helpers';

test('setiap slug artikel lama terbuka dengan path yang sama', async ({ page }) => {
  test.setTimeout(180_000);
  for (const p of samplePosts()) {
    const res = await page.goto(`/${p.slug}/`);
    expect(res?.status(), p.slug).toBe(200);
    expect(res?.request().redirectedFrom(), `${p.slug} tidak boleh di-redirect`).toBeNull();
    expect(new URL(page.url()).pathname, p.slug).toBe(`/${p.slug}/`);
    expect(norm(await page.locator('h1').innerText()), p.slug).toBe(norm(p.title));
  }
});

test('URL lama tanpa garis miring akhir tetap sampai', async ({ request }) => {
  const p = samplePosts()[0];
  const res = await request.get(`/${p.slug}`);
  expect(res.status()).toBe(200);
  expect(new URL(res.url()).pathname).toBe(`/${p.slug}/`);
});

for (const path of ['/berita/', '/berita/nasional/', '/berita/daerah/', '/berita/internasional/', '/dawuh/', '/hikmah/', '/tokoh/',
  '/artikel/', '/thariqah/', '/tanya-jawab/', '/pustaka-tasawuf/', '/profile/syahril-mubarok/', '/tag/jatman/']) {
  test(`arsip ${path} = 200`, async ({ request }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
}
