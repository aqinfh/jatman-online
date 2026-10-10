import { test, expect } from '@playwright/test';

test('panel Pilihan Redaksi ada di editor post', async ({ page }) => {
  await page.goto('/wp-login.php');
  await page.fill('#user_login', 'admin');
  await page.fill('#user_pass', 'password');
  await page.click('#wp-submit');
  await page.goto('/wp-admin/post-new.php');
  const guide = page.getByRole('dialog');
  await guide.waitFor({ timeout: 8_000 }).then(() => page.keyboard.press('Escape'), () => {});
  await expect(page.getByRole('button', { name: 'Pilihan Redaksi' })).toBeVisible({ timeout: 30_000 });
});
