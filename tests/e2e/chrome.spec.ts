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
  for (const url of ['facebook.com/JATMAN.Online', 'instagram.com/jatmanonline', 'tiktok.com/@jatman.online', 'youtube.com/@jatmanonline']) {
    await expect(footer.locator(`a[href*="${url}"]`)).toHaveCount(1);
  }
});
