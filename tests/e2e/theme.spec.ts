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
  expect(loaded).toContain('Heebo');
});

test('huruf transliterasi (ḥ ṣ ṭ ʿ) di judul tidak jatuh ke font sistem', async ({ page }) => {
  await page.goto('/');
  const ok = await page.evaluate(async () => {
    const h = document.createElement('h2');
    h.textContent = 'Ḥikam ṣalāt ṭarīqah ʿilm';
    document.body.append(h);
    const family = getComputedStyle(h).fontFamily;
    await document.fonts.load(`800 32px ${family}`, h.textContent);
    return document.fonts.check(`800 32px Heebo`, 'ḥṣṭʿ') && [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Heebo' && f.unicodeRange.includes('1E24') && f.status === 'loaded');
  });
  expect(ok).toBe(true);
});

test('isi artikel memakai font sans (Heebo), tanpa serif', async ({ page }) => {
  await page.goto('/idarah-aliyyah-jatman-launching-logo-harlah-ke-69/');
  const family = await page.locator('.jm-article__body p').first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/^"?Heebo/);
  const serifFaces = await page.evaluate(() => [...document.fonts].filter((f) => /Serif/.test(f.family)).length);
  expect(serifFaces).toBe(0);
});

test('beranda tidak mengunduh aset berat yang tidak perlu (lambang SVG penuh, font Arab untuk ornamen)', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForLoadState('networkidle');
  expect(urls.filter((u) => u.includes('lambang-jatman.svg'))).toEqual([]);
  const ornament = await page.locator('.jm-dawuh').evaluate((el) => getComputedStyle(el, '::before').content);
  expect(ornament).not.toContain('۞');
});
