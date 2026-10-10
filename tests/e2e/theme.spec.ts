import { test, expect, type Page } from '@playwright/test';

async function themeAtFirstPaint(page: Page) {
  await page.addInitScript(() => {
    new MutationObserver((_, obs) => {
      if (document.body) {
        (window as any).__themeAtBody = document.documentElement.dataset.theme ?? null;
        obs.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

test('mode gelap tersimpan dipasang sebelum body dirender', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jatman-theme', 'dark'));
  await themeAtFirstPaint(page);
  await page.goto('/');
  expect(await page.evaluate(() => (window as any).__themeAtBody)).toBe('dark');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(14, 21, 18)');
});

test('default terang dengan latar putih', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
});

test.describe('perangkat mode gelap', () => {
  test.use({ colorScheme: 'dark' });
  test('mengikuti setelan perangkat bila belum memilih', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
  test('pilihan tersimpan "light" menang atas setelan perangkat', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jatman-theme', 'light'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test('localStorage diblokir: tetap tampil terang tanpa error JS', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('tidak ada request ke domain pihak ketiga', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(u.hostname)) external.push(r.url());
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(external).toEqual([]);
});

test('font self-hosted termuat', async ({ page }) => {
  await page.goto('/');
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''));
  });
  expect(loaded).toContain('Plus Jakarta Sans');
});
