import { test, expect } from '@playwright/test';

test('rubrik Berita: pita, sub-tab, grid kartu', async ({ page }) => {
  await page.goto('/berita/nasional/');
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Nasional');
  await expect(page.locator('.jm-tabs a')).toHaveText(['Semua', 'Nasional', 'Daerah', 'Internasional']);
  await expect(page.locator('.jm-tabs a[aria-current="page"]')).toHaveText('Nasional');
  expect(await page.locator('.jm-grid .jm-card').count()).toBeGreaterThan(0);
});

test('rubrik /berita/ memuat berita dari semua sub-rubrik', async ({ page }) => {
  await page.goto('/berita/');
  await expect(page.locator('.jm-tabs a[aria-current="page"]')).toHaveText('Semua');
  expect(await page.locator('.jm-grid .jm-card').count()).toBeGreaterThanOrEqual(7);
});

test('rubrik teduh memakai pita krem', async ({ page }) => {
  await page.goto('/hikmah/');
  await expect(page.locator('body')).toHaveClass(/is-teduh/);
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Hikmah');
  await expect(page.locator('.jm-tabs')).toHaveCount(0);
});

test('halaman penulis: foto, nama, jumlah tulisan, daftar tulisan', async ({ page }) => {
  await page.goto('/profile/syahril-mubarok/');
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Syahril Mubarok');
  await expect(page.locator('.jm-archive-head__count')).toHaveText(/^\d+ tulisan$/);
  await expect(page.locator('.jm-archive-head__avatar')).toBeVisible();
  expect(await page.locator('.jm-grid .jm-card').count()).toBeGreaterThan(0);
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
