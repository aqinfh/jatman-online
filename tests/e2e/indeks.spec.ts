import { test, expect } from '@playwright/test';
import { NEWS, samplePosts, wp } from './helpers';

test('halaman Indeks memuat semua artikel lewat "Muat lebih banyak"', async ({ page }) => {
  const total = samplePosts().length;
  await page.goto('/indeks/');
  await expect(page.locator('main h1')).toHaveText('Indeks Berita');
  const cards = page.locator('.jm-feed > li');
  await expect(cards).toHaveCount(12);
  const more = page.getByRole('button', { name: 'Muat lebih banyak' });
  await more.click();
  await expect(cards).toHaveCount(total);
  await expect(more).toHaveCount(0);
  await expect(page.locator('.jm-loadmore__status')).toHaveText(`${total - 12} tulisan lagi dimuat`);
});

test('Indeks: satu artikel besar di atas, sisanya daftar, dengan sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/indeks/');
  const sizes = await page.locator('.jm-feed > li .jm-card__title').evaluateAll((els) => els.slice(0, 2).map((e) => parseFloat(getComputedStyle(e).fontSize)));
  expect(sizes[0]).toBeGreaterThan(sizes[1] * 1.4);
  await expect(page.locator('aside.jm-aside .jm-section__title')).toHaveText(['Terpopuler', 'Pilihan Redaksi']);
});

test('tanpa JavaScript, Indeks tetap punya pagination biasa', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/indeks/');
  await expect(page.locator('.jm-pagination a').first()).toBeVisible();
  await ctx.close();
});

test('rubrik juga memakai Muat lebih banyak bila lebih dari satu halaman', async ({ page }) => {
  await page.goto('/berita/');
  await expect(page.getByRole('button', { name: 'Muat lebih banyak' })).toHaveCount(0); // 7 berita < 12 per halaman
});

test('artikel: sidebar Terpopuler & Pilihan Redaksi tanpa artikel yang sedang dibuka', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/${NEWS}/`);
  const aside = page.locator('aside.jm-aside');
  await expect(aside.locator('.jm-section__title')).toHaveText(['Terpopuler', 'Pilihan Redaksi']);
  const hrefs = await aside.locator('a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs.filter((h) => h.includes(NEWS))).toEqual([]);
});

test('membuka artikel menambah hitungan pembaca', async ({ page }) => {
  const id = wp('post', 'list', `--name=${NEWS}`, '--post_type=post', '--field=ID').match(/^\d+$/m)![0];
  const views = () => Number(wp('eval', `echo jatman_views( ${id} );`).match(/^\d+$/m)![0]);
  const before = views();
  wp('eval', `global $wpdb; $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient%jatman_view_%'");`);
  const beacon = page.waitForRequest((r) => r.url().includes(`/jatman/v1/views/${id}`) && r.method() === 'POST');
  await page.goto(`/${NEWS}/`);
  await beacon;
  await expect.poll(views).toBe(before + 1);
});

test('Indeks & artikel: konten tidak menempel tepi, caption sejajar teks', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/indeks/');
  const box = await page.locator('.jm-feed').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(16);
  const aside = await page.locator('aside.jm-aside').boundingBox();
  expect(aside!.x + aside!.width).toBeLessThanOrEqual(1280 - 16);
  await page.goto('/idarah-aliyyah-jatman-launching-logo-harlah-ke-69/');
  const cap = await page.locator('.jm-figure figcaption').boundingBox();
  const body = await page.locator('.jm-article__body').boundingBox();
  expect(Math.round(cap!.x)).toBe(Math.round(body!.x));
});

test('toggle mode gelap tidak menggandakan tombol Muat lebih banyak', async ({ page }) => {
  await page.goto('/indeks/');
  const toggle = page.getByRole('button', { name: 'Mode gelap' });
  await toggle.click();
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Muat lebih banyak' })).toHaveCount(1);
});

test('reload artikel di sesi yang sama tidak mengirim beacon lagi', async ({ page }) => {
  const beacons: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/jatman/v1/views/')) beacons.push(r.url()); });
  await page.goto(`/${NEWS}/`);
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForTimeout(500);
  expect(beacons).toHaveLength(1);
});
