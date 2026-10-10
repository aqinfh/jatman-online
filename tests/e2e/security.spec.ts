import { test, expect } from '@playwright/test';
import { readdirSync } from 'node:fs';

test('versi WordPress tidak diumumkan', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).not.toMatch(/<meta name="generator" content="WordPress/i);
  const feed = await (await request.get('/feed/')).text();
  expect(feed).not.toContain('<generator>');
});

test('XML-RPC tidak menyediakan metode apa pun', async ({ request }) => {
  const res = await request.post('/xmlrpc.php', {
    headers: { 'Content-Type': 'text/xml' },
    data: '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>',
  });
  expect(await res.text()).not.toContain('wp.getUsersBlogs');
  expect((await request.get('/')).headers()['x-pingback']).toBeUndefined();
});

test('daftar user lewat REST tertutup untuk pengunjung', async ({ request }) => {
  expect((await request.get('/wp-json/wp/v2/users')).status()).toBe(404);
  expect((await request.get('/wp-json/wp/v2/users/1')).status()).toBe(404);
});

test('file PHP tema tidak bisa dibuka langsung (tanpa error yang membocorkan path)', async ({ request }) => {
  const files = [
    ...readdirSync('theme/jatman/blocks').map((b) => `blocks/${b}/render.php`),
    ...readdirSync('theme/jatman/patterns').map((p) => `patterns/${p}`),
    ...readdirSync('theme/jatman/inc').map((p) => `inc/${p}`),
    'functions.php',
  ];
  for (const f of files) {
    const res = await request.get(`/wp-content/themes/jatman/${f}`);
    expect(res.status(), f).toBe(200);
    expect(await res.text(), f).toBe('');
  }
});
