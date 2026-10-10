import { test, expect } from '@playwright/test';
import { DAWUH, NEWS, norm, samplePosts } from './helpers';

test('artikel berita: semua bagian lengkap', async ({ page }) => {
  const post = samplePosts().find((p) => p.slug === NEWS)!;
  await page.goto(`/${NEWS}/`);
  await expect(page.locator('.jm-breadcrumb a')).toHaveText(['Beranda', 'Berita', 'Nasional']);
  await expect(page.locator('h1')).toHaveCount(1);
  expect(norm(await page.locator('h1').innerText())).toBe(norm(post.title));
  await expect(page.locator('.jm-dek')).toBeVisible();
  await expect(page.locator('.jm-byline__author')).toHaveAttribute('href', /\/profile\/syahril-mubarok\/$/);
  await expect(page.locator('.jm-byline__meta')).toContainText(/\d+ menit baca/);
  await expect(page.locator('.jm-figure figcaption')).toHaveText('Logo Harlah Ke-69 JATMAN');
  await expect(page.locator('.jm-article__body p').first()).toBeVisible();
  await expect(page.locator('.jm-tags a').first()).toBeVisible();
  for (const name of ['WhatsApp', 'Facebook', 'X', 'Telegram']) {
    await expect(page.getByRole('link', { name: `Bagikan ke ${name}` })).toHaveAttribute('href', /localhost%3A8888/);
  }
  await expect(page.locator('.jm-authorbox')).toContainText('Syahril Mubarok');
  const related = page.locator('.jm-section--related .jm-card__title a');
  expect(await related.count()).toBeGreaterThan(0);
  expect(await related.count()).toBeLessThanOrEqual(3);
  for (const href of await related.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))) {
    expect(href).not.toContain(NEWS);
  }
  await expect(page.locator('body')).not.toHaveClass(/is-teduh/);
});

test('artikel Dawuh tampil sama seperti artikel lain (tanpa varian khusus)', async ({ page }) => {
  await page.goto(`/${DAWUH}/`);
  await expect(page.locator('body')).not.toHaveClass(/is-teduh/);
  const bg = await page.locator('.jm-single').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgba(0, 0, 0, 0)');
});

test('salin tautan memberi konfirmasi', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/${NEWS}/`);
  await page.getByRole('button', { name: 'Salin tautan' }).click();
  await expect(page.locator('.jm-share__status')).toHaveText('Tautan disalin');
});

test('setiap artikel sample punya gambar utama atau tetap rapi tanpa gambar', async ({ page }) => {
  for (const p of samplePosts().slice(0, 5)) {
    await page.goto(`/${p.slug}/`);
    const figures = await page.locator('.jm-figure').count();
    expect(figures).toBeLessThanOrEqual(1);
    if (figures) await expect(page.locator('.jm-figure img')).toHaveAttribute('src', /\/wp-content\/uploads\//);
  }
});
