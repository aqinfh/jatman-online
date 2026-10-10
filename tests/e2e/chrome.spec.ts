import { test, expect } from '@playwright/test';

const MENU: Record<string, string> = {
  'Tanya Jawab': 'tanya-jawab', 'Pustaka Tasawuf': 'pustaka-tasawuf', Artikel: 'artikel',
  Thariqah: 'thariqah', Dawuh: 'dawuh', Tokoh: 'tokoh', Hikmah: 'hikmah',
};

test('top bar: lambang, penerbit resmi, tanggal Masehi', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.jm-topbar');
  await expect(bar).toContainText('Media resmi');
  await expect(bar.locator('img')).toHaveAttribute('src', /lambang-jatman-48\.png$/);
  await expect(bar.locator('.jm-topbar__date')).toHaveText(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu), \d{1,2} \S+ \d{4}$/);
});

test('header: logo ke beranda dan menu rubrik dengan URL lama', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('.jm-brand')).toHaveAttribute('href', /localhost:8888\/$/);
  await expect(page.locator('.jm-brand')).toHaveAccessibleName('JATMAN Online');
  const nav = page.locator('.jm-nav');
  for (const [label, slug] of Object.entries(MENU)) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', new RegExp(`/${slug}/$`));
  }
});

test('toggle mode gelap mengubah tema dan diingat setelah reload', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Mode gelap' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

for (const width of [375, 768]) {
  test(`laci menu di lebar ${width}px terbuka dan tertutup dengan Esc`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const open = page.locator('.jm-nav .wp-block-navigation__responsive-container-open');
    await expect(open).toBeVisible();
    await open.click();
    const drawer = page.locator('.jm-nav .wp-block-navigation__responsive-container.is-menu-open');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Hikmah', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
  });
}

test('header menempel dan mengecil saat di-scroll', async ({ page }) => {
  await page.goto('/');
  await page.mouse.wheel(0, 1500);
  await expect(page.locator('.jm-header')).toHaveClass(/is-condensed/);
  const box = await page.locator('.jm-header').boundingBox();
  expect(box!.y).toBeLessThanOrEqual(1);
});

test('footer: dua identitas, tautan halaman, media sosial', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('.jm-footer');
  await expect(footer.getByRole('img', { name: 'Lambang JATMAN' })).toBeVisible();
  await expect(footer.locator('.jm-footer__knot')).toBeVisible();
  for (const label of ['Tentang', 'Redaksi', 'Kontak', 'Kirim Tulisan']) {
    await expect(footer.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  for (const url of ['facebook.com/JATMAN.Online', 'instagram.com/jatmanonline', 'tiktok.com/@jatman.online', 'youtube.com/@jatman.online']) {
    await expect(footer.locator(`a[href*="${url}"]`)).toHaveCount(1);
  }
});

test.describe('header HP 375px', () => {
  test.use({ viewport: { width: 375, height: 760 } });

  test('logo, cari, mode gelap, dan menu muat tanpa meluap', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    for (const sel of ['.jm-header .wp-block-search__button', '.jm-theme-toggle', '.jm-nav .wp-block-navigation__responsive-container-open']) {
      const box = await page.locator(sel).boundingBox();
      expect(box!.x + box!.width, sel).toBeLessThanOrEqual(375 - 8);
    }
  });

  test('pencarian terbuka di bawah header selebar layar tanpa menggeser halaman', async ({ page }) => {
    await page.goto('/');
    await page.locator('.jm-header .wp-block-search__button').click();
    const input = page.locator('.jm-header .wp-block-search__input');
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await input.fill('tasawuf');
    await input.press('Enter');
    await expect(page).toHaveURL(/\?s=tasawuf/);
  });

  test('laci menu rata kiri dengan sub-rubrik Berita sebagai chip', async ({ page }) => {
    await page.goto('/');
    await page.locator('.jm-nav .wp-block-navigation__responsive-container-open').click();
    const drawer = page.locator('.jm-nav .is-menu-open');
    const align = await drawer.getByRole('link', { name: 'Hikmah', exact: true }).evaluate((a) => getComputedStyle(a.closest('li')!.parentElement!).alignItems);
    expect(['flex-start', 'stretch', 'start']).toContain(align);
    const chip = drawer.getByRole('link', { name: 'Nasional', exact: true });
    expect(await chip.evaluate((a) => getComputedStyle(a).borderTopStyle)).toBe('solid');
  });
});

for (const width of [600, 768, 1024, 1150]) {
  test(`header ${width}px: cari, mode gelap, dan menu berkelompok di kanan`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const toggle = await page.locator('.jm-theme-toggle').boundingBox();
    const burger = await page.locator('.jm-nav .wp-block-navigation__responsive-container-open').boundingBox();
    expect(burger, 'hamburger tampil').not.toBeNull();
    expect(burger!.x - (toggle!.x + toggle!.width)).toBeLessThanOrEqual(12);
    expect(width - (burger!.x + burger!.width)).toBeLessThanOrEqual(40);
  });
}

test('header ≥1200px: semua menu satu baris tanpa patah', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/');
  const heights = await page.locator('.jm-nav .wp-block-navigation__container > li > a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height));
  for (const h of heights) expect(h).toBeLessThanOrEqual(44); // satu baris = 40px; patah dua baris ≈ 64px
});

test.describe('hamburger HP', () => {
  test.use({ viewport: { width: 375, height: 760 } });
  test('ikon tiga garis, tepat di tengah tombol', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('.jm-nav .wp-block-navigation__responsive-container-open');
    await expect(btn.locator('svg path')).toHaveCount(3); // ikon "menu" WordPress: tiga garis
    const b = await btn.boundingBox();
    const i = await btn.locator('svg').boundingBox();
    expect(Math.abs(b!.x + b!.width / 2 - (i!.x + i!.width / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(b!.y + b!.height / 2 - (i!.y + i!.height / 2))).toBeLessThanOrEqual(1);
  });
  test('chip sub-rubrik Berita berjarak lega', async ({ page }) => {
    await page.goto('/');
    await page.locator('.jm-nav .wp-block-navigation__responsive-container-open').click();
    const boxes = await page.locator('.jm-nav .is-menu-open .wp-block-navigation__submenu-container a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, b: r.bottom, r: r.right })));
    const rows = [...new Set(boxes.map((b) => Math.round(b.y)))].sort((a, b) => a - b);
    if (rows.length > 1) {
      const firstRowBottom = Math.max(...boxes.filter((b) => Math.round(b.y) === rows[0]).map((b) => b.b));
      expect(rows[1] - firstRowBottom).toBeGreaterThanOrEqual(8);
    }
    const sameRow = boxes.filter((b) => Math.round(b.y) === rows[0]);
    for (let k = 1; k < sameRow.length; k++) expect(sameRow[k].x - sameRow[k - 1].r).toBeGreaterThanOrEqual(8);
  });
});

test('desktop: kolom pencarian terbuka di bawah header tanpa menggeser menu', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const before = await page.locator('.jm-nav').getByRole('link', { name: 'Hikmah', exact: true }).boundingBox();
  await page.locator('.jm-header .wp-block-search__button').click();
  const input = page.locator('.jm-header .wp-block-search__input');
  await expect(input).toBeVisible();
  const after = await page.locator('.jm-nav').getByRole('link', { name: 'Hikmah', exact: true }).boundingBox();
  expect(Math.round(after!.x)).toBe(Math.round(before!.x));
  const header = await page.locator('.jm-header').boundingBox();
  const box = await input.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
  expect(box!.width).toBeGreaterThanOrEqual(400);
});
