import { test, expect } from '@playwright/test';
import { norm, samplePosts } from './helpers';

test('hero menampilkan post sticky sebagai berita utama', async ({ page }) => {
  const sticky = samplePosts().find((p) => p.flags.includes('sticky'))!;
  await page.goto('/');
  expect(norm(await page.locator('.jm-hero__main .jm-card__title').innerText())).toBe(norm(sticky.title));
});

test('semua bagian beranda tampil berurutan', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.jm-section__title')).toHaveText([
    'Terpopuler', 'Terbaru', 'Pilihan Redaksi', 'Berita', 'Dawuh', 'Hikmah & Pustaka Tasawuf', 'Tokoh',
  ]);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('Pilihan Redaksi berisi post yang ditandai', async ({ page }) => {
  const pilihan = samplePosts().filter((p) => p.flags.includes('pilihan')).map((p) => norm(p.title));
  await page.goto('/');
  const shown = (await page.locator('.jm-section--compact .jm-card__title').allInnerTexts()).map(norm);
  expect(shown.sort()).toEqual(pilihan.sort());
});

test('Terbaru tidak mengulang berita di hero', async ({ page }) => {
  await page.goto('/');
  const hero = (await page.locator('.jm-hero .jm-card__title').allInnerTexts()).map(norm);
  const latest = (await page.locator('.jm-section--list .jm-card__title').allInnerTexts()).map(norm);
  expect(latest.filter((t) => hero.includes(t))).toEqual([]);
});

test('gambar hero dimuat eager, gambar lain lazy', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.jm-hero__main img')).toHaveAttribute('loading', 'eager');
  await expect(page.locator('.jm-section--list img').first()).toHaveAttribute('loading', 'lazy');
});

test('pita Terpopuler berada di antara hero dan Terbaru, bernomor 1–6', async ({ page }) => {
  await page.goto('/');
  const band = page.locator('.jm-section--ranked');
  await expect(band).toHaveClass(/jm-band--brand/);
  await expect(band.locator('.jm-ranked > li')).toHaveCount(6);
  const order = await page.locator('.jm-section').evaluateAll((els) => els.map((e) => e.className));
  const iRanked = order.findIndex((c) => c.includes('jm-section--ranked'));
  expect(order[iRanked - 1]).toContain('jm-section--hero');
  expect(order[iRanked + 1]).toContain('jm-section--list');
});

test('Terbaru punya tautan Lihat semua ke halaman Indeks', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.jm-section--list .jm-section__more')).toHaveAttribute('href', /\/indeks\/$/);
});

test('Terbaru diakhiri tombol Lihat semua berita ke Indeks', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.jm-section--list .jm-section__foot a')).toHaveAttribute('href', /\/indeks\/$/);
});

test('pita-pita beranda bersambung tanpa celah putih', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const gap = await page.evaluate(() => {
    const dawuh = document.querySelector('.jm-section--quote')!.getBoundingClientRect();
    const next = document.querySelector('.jm-section--cards')!.getBoundingClientRect();
    return Math.round(next.top - dawuh.bottom);
  });
  expect(gap).toBe(0);
});
