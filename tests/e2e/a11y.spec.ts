import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { DAWUH, NEWS } from './helpers';

const PAGES = ['/', `/${NEWS}/`, `/${DAWUH}/`, '/berita/', '/hikmah/', '/profile/syahril-mubarok/', '/?s=jatman', '/halaman-tidak-ada/', '/tentang/'];

for (const mode of ['light', 'dark'] as const) {
  for (const path of PAGES) {
    test(`axe ${mode} ${path}`, async ({ page }) => {
      await page.addInitScript((m) => localStorage.setItem('jatman-theme', m), mode);
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
      expect(serious).toEqual([]);
    });
  }
}

test('keyboard: Tab pertama memunculkan skip link ke konten', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveClass(/skip-link/);
  await expect(focused).toBeVisible();
});
