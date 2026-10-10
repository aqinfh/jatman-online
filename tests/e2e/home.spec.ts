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

const ratio = (r: string) => { const [a, b] = r.split('/').map((x) => parseFloat(x)); return b ? a / b : NaN; };

test('rasio gambar seragam: 16:9 untuk lanskap, 4:5 untuk Tokoh', async ({ page }) => {
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const ratios = await page.locator('.jm-card__media').evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).offsetParent).map((e) => ({ portrait: !!e.closest('.jm-card--portrait'), r: getComputedStyle(e).aspectRatio })));
    for (const { portrait, r } of ratios) expect(ratio(r), `${width}px ${r}`).toBeCloseTo(portrait ? 4 / 5 : 16 / 9, 2);
  }
  await page.goto('/idarah-aliyyah-jatman-launching-logo-harlah-ke-69/');
  expect(ratio(await page.locator('.jm-figure img').evaluate((e) => getComputedStyle(e).aspectRatio))).toBeCloseTo(16 / 9, 2);
});

test('HP: hanya satu headline besar, pendamping hero berupa daftar dengan thumbnail kecil', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const main = await page.locator('.jm-hero__main .jm-card__media').boundingBox();
  expect(main!.width).toBeGreaterThan(300);
  for (const box of await page.locator('.jm-hero__side .jm-card__media').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))) {
    expect(box).toBeLessThanOrEqual(130);
  }
});

test('Hikmah & Pustaka Tasawuf bisa digeser menyamping', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const row = page.locator('.jm-section--cards .jm-cards');
  expect(await row.locator('.jm-card').count()).toBeGreaterThanOrEqual(4);
  const s = await row.evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, ox: getComputedStyle(e).overflowX, snap: getComputedStyle(e).scrollSnapType }));
  expect(s.sw).toBeGreaterThan(s.cw);
  expect(s.ox).toBe('auto');
  expect(s.snap).toContain('x');
});

test('Tokoh terisi minimal 4', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('.jm-section--portrait .jm-card').count()).toBeGreaterThanOrEqual(4);
});

test.describe('Berita di HP sebagai tab', () => {
  test.use({ viewport: { width: 375, height: 800 } });
  test('tab Nasional/Daerah/Internasional, satu panel tampil, daftar seragam', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('.jm-section--regions [role="tab"]');
    await expect(tabs).toHaveText(['Nasional', 'Daerah', 'Internasional']);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    const visiblePanels = () => page.locator('.jm-section--regions [role="tabpanel"]:visible');
    await expect(visiblePanels()).toHaveCount(1);
    // Semua item di tab berupa daftar seragam dengan thumbnail kecil.
    const items = page.locator('.jm-section--regions [role="tabpanel"]:visible .jm-card');
    const widths = await items.evaluateAll((els) => els.map((e) => e.querySelector('.jm-card__media')?.getBoundingClientRect().width ?? 0));
    expect(widths.length).toBeGreaterThan(1);
    for (const w of widths) { expect(w).toBeGreaterThan(60); expect(w).toBeLessThanOrEqual(130); }
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(visiblePanels()).toHaveCount(1);
    await expect(visiblePanels()).toContainText('Disambut Idarah Wustha JATMAN Kalsel');
  });
});

test('Berita di desktop tetap tiga kolom tanpa tab', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.locator('.jm-section--regions .jm-regions__tabs')).toBeHidden();
  await expect(page.locator('.jm-section--regions .jm-region:visible')).toHaveCount(3);
});

test('HP: kartu Tokoh cukup lebar dan judul tidak menutupi seluruh foto', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const card = page.locator('.jm-section--portrait .jm-card').first();
  const cardBox = await card.boundingBox();
  expect(cardBox!.width).toBeGreaterThanOrEqual(220);
  const bodyBox = await card.locator('.jm-card__body').boundingBox();
  expect(bodyBox!.height / cardBox!.height).toBeLessThan(0.6);
});

test('desktop: daftar kecil di bagian Berita juga bergambar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const small = page.locator('.jm-region__list .jm-card');
  expect(await small.count()).toBeGreaterThan(0);
  expect(await small.locator('.jm-card__media').count()).toBe(await small.count());
});
