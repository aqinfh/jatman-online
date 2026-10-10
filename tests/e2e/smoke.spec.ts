import { test, expect } from '@playwright/test';
import { wp } from './helpers';

test('situs lokal hidup dengan tema jatman dan bahasa Indonesia', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', /^id(-ID)?$/);
  expect(wp('option', 'get', 'stylesheet')).toContain('jatman');
  expect(wp('option', 'get', 'permalink_structure')).toContain('/%postname%/');
});
