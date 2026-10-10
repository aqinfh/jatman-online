import { test, expect } from '@playwright/test';

test('rubrik Berita: pita, sub-tab, grid kartu', async ({ page }) => {
  await page.goto('/berita/nasional/');
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Nasional');
  await expect(page.locator('.jm-tabs a')).toHaveText(['Semua', 'Nasional', 'Daerah', 'Internasional']);
  await expect(page.locator('.jm-tabs a[aria-current="page"]')).toHaveText('Nasional');
  expect(await page.locator('.jm-feed .jm-card').count()).toBeGreaterThan(0);
});

test('rubrik /berita/ memuat berita dari semua sub-rubrik', async ({ page }) => {
  await page.goto('/berita/');
  await expect(page.locator('.jm-tabs a[aria-current="page"]')).toHaveText('Semua');
  expect(await page.locator('.jm-feed .jm-card').count()).toBeGreaterThanOrEqual(7);
});

test('rubrik Hikmah tampil sama seperti rubrik lain (tanpa varian khusus)', async ({ page }) => {
  await page.goto('/hikmah/');
  await expect(page.locator('body')).not.toHaveClass(/is-teduh/);
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Hikmah');
  await expect(page.locator('.jm-tabs')).toHaveCount(0);
});

test('halaman penulis: foto, nama, jumlah tulisan, daftar tulisan', async ({ page }) => {
  await page.goto('/profile/syahril-mubarok/');
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Syahril Mubarok');
  await expect(page.locator('.jm-archive-head__count')).toHaveText(/^\d+ tulisan$/);
  await expect(page.locator('.jm-archive-head__avatar')).toBeVisible();
  await expect(page.locator('.jm-archive-head__eyebrow')).toHaveCount(0);
  expect(await page.locator('.jm-feed .jm-card').count()).toBeGreaterThan(0);
});

test('halaman tag', async ({ page }) => {
  const res = await page.goto('/tag/jatman/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Jatman');
});

test('pencarian menghitung hasil', async ({ page }) => {
  await page.goto('/?s=JATMAN');
  await expect(page.locator('.jm-archive-head h1')).toHaveText(/^\d+ hasil untuk “JATMAN”$/);
  await expect(page.locator('.jm-archive-head input[type="search"]')).toHaveValue('JATMAN');
});

test('pencarian dengan HTML ter-escape dan 0 hasil tetap rapi', async ({ page }) => {
  await page.goto('/?s=' + encodeURIComponent('<b>zzqx</b>'));
  await expect(page.locator('.jm-archive-head h1')).toHaveText('0 hasil untuk “<b>zzqx</b>”');
  await expect(page.locator('.jm-archive-head h1 b')).toHaveCount(0);
  await expect(page.getByText('Tidak ada hasil. Coba kata kunci lain.')).toBeVisible();
});

test('404 ramah: status 404, pesan, form cari, berita terbaru', async ({ page }) => {
  const res = await page.goto('/halaman-yang-tidak-ada/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Halaman tidak ditemukan');
  await expect(page.locator('main input[type="search"]')).toBeVisible();
  await expect(page.locator('.jm-section__title')).toHaveText(['Berita terbaru']);
});

test('halaman Tentang menampilkan lambang JATMAN', async ({ page }) => {
  await page.goto('/tentang/');
  await expect(page.locator('main').getByRole('img', { name: 'Lambang JATMAN' })).toBeVisible();
  await expect(page.locator('main h1')).toHaveText('Tentang JATMAN');
});

test('halaman rubrik seperti Indeks: satu artikel besar, daftar, dan sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/berita/');
  const sizes = await page.locator('.jm-feed > li .jm-card__title').evaluateAll((els) => els.slice(0, 2).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  expect(sizes[0]).toBeGreaterThan(sizes[1] * 1.4);
  await expect(page.locator('aside.jm-aside .jm-section__title')).toHaveText(['Terpopuler', 'Pilihan Redaksi']);
});

test('hasil pencarian hanya artikel, berupa daftar seragam', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?s=jatman');
  const hrefs = await page.locator('.jm-feed .jm-card__title a').evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname));
  expect(hrefs.length).toBeGreaterThan(1);
  for (const p of ['/tentang/', '/indeks/', '/redaksi/', '/kontak/', '/kirim-tulisan/']) expect(hrefs).not.toContain(p);
  const sizes = await page.locator('.jm-feed > li .jm-card__title').evaluateAll((els) => els.slice(0, 2).map((e) => getComputedStyle(e).fontSize));
  expect(sizes[0]).toBe(sizes[1]);
  const media = await page.locator('.jm-feed > li .jm-card__media').evaluateAll((els) => els.slice(0, 2).map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(media[0]).toBe(media[1]);
});
