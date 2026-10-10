import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: process.env.JATMAN_URL ?? 'http://localhost:8888',
    channel: 'chrome', // pakai Google Chrome yang terpasang, tanpa unduh browser Playwright
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'e2e', testIgnore: /screens\.spec\.ts/ },
    { name: 'screens', testMatch: /screens\.spec\.ts/ },
  ],
});
