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
    'Terbaru', 'Pilihan Redaksi', 'Berita', 'Dawuh', 'Hikmah & Pustaka Tasawuf', 'Tokoh', 'Tanya Jawab',
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
