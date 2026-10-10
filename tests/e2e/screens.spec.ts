import { test } from '@playwright/test';
import { DAWUH, NEWS } from './helpers';

const PAGES: Record<string, string> = {
  beranda: '/', artikel: `/${NEWS}/`, dawuh: `/${DAWUH}/`, berita: '/berita/', hikmah: '/hikmah/',
  penulis: '/profile/syahril-mubarok/', cari: '/?s=jatman', '404': '/halaman-tidak-ada/', tentang: '/tentang/', indeks: '/indeks/',
};
const WIDTHS = [375, 768, 1280, 1440];

for (const mode of ['light', 'dark'] as const) {
  for (const width of WIDTHS) {
    test(`screens ${mode} ${width}`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((m) => localStorage.setItem('jatman-theme', m), mode);
      for (const [name, path] of Object.entries(PAGES)) {
        await page.goto(path, { waitUntil: 'networkidle' });
        // Gulir seluruh halaman supaya gambar lazy-load ikut termuat sebelum screenshot penuh.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
          window.scrollTo(0, 0);
        });
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `tests/output/screens/${name}-${width}-${mode}.png`, fullPage: true });
      }
    });
  }
}
