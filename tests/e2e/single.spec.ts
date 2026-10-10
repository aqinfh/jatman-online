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

test('tautan panjang di isi artikel tidak membuat halaman bergeser ke samping di HP', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`/${NEWS}/`);
  await expect(page.locator('.jm-article__body a[href*="drive.google.com"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('tombol bagikan ada di atas (sebelum gambar utama), berupa ikon yang jelas', async ({ page }) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/${NEWS}/`);
    const share = page.locator('.jm-article__head .jm-share');
    await expect(share).toBeVisible();
    await expect(page.locator('.jm-article__foot .jm-share')).toHaveCount(0);
    const shareBox = (await share.boundingBox())!;
    const figBox = (await page.locator('.jm-figure').boundingBox())!;
    expect(shareBox.y + shareBox.height, `${width}: di atas gambar utama`).toBeLessThanOrEqual(figBox.y);
    expect(shareBox.y + shareBox.height, `${width}: terlihat tanpa scroll`).toBeLessThanOrEqual(900);
    const controls = share.locator('a, button');
    await expect(controls).toHaveCount(5);
    for (const box of await controls.evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { w: r.width, h: r.height, svg: !!e.querySelector('svg'), text: (e.textContent || '').trim(), sr: (e.querySelector('.screen-reader-text')?.textContent || '').trim() };
    }))) {
      expect(box.svg, 'setiap tombol punya ikon').toBe(true);
      expect(box.w).toBeGreaterThanOrEqual(40);
      expect(box.h).toBeGreaterThanOrEqual(40);
      expect(Math.abs(box.w - box.h), 'bulat/persegi, bukan label pil').toBeLessThanOrEqual(2);
      expect(box.text, 'tanpa teks yang terlihat').toBe(box.sr);
    }
  }
  await expect(page.getByRole('button', { name: 'Salin tautan' })).toBeVisible();
});
