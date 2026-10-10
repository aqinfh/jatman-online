# JATMAN Online — Tema WordPress + Sample Konten: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block theme WordPress `jatman` yang berjalan lokal di `wp-env` dan berisi ~15 artikel asli jatman.or.id beserta penulis aslinya, siap di-review redaksi.

**Architecture:** Ada tiga lapisan dengan batas yang tegas.
1. **mu-plugin `jatman-core`** mengurus aturan konten yang tidak boleh hilang kalau tema diganti: kategori, URL lama, avatar penulis, Pilihan Redaksi.
2. **Tema `jatman`** mengurus tampilan: theme.json, template HTML, dan block dinamis PHP tanpa build step.
3. **`tools/`** mengurus data. Scraper Node menghasilkan JSON ternormalisasi, lalu importer PHP yang tidak terikat sumber (sumber-agnostik) meng-upsert data itu ke WordPress lewat wp-cli. Importer ini nanti dipakai ulang untuk migrasi Varient.

**Tech Stack:** WordPress (latest) + PHP 8.3 via `@wordpress/env` 11.17.0, Node 24, cheerio 1.2.0, Playwright 1.64.0 (+ @axe-core/playwright 4.13.0), Lighthouse 13.5.0, sharp 0.35.5 + potrace 2.1.8 + svgo 4.1.0 (aset logo), wawoff2 2.0.1 (font), ajv 8.20.0.

**Spec:** `docs/superpowers/specs/2026-10-10-jatman-wp-theme-design.md`

## Global Constraints

- Semua teks UI dalam Bahasa Indonesia. Locale situs `id_ID`, zona waktu `Asia/Jakarta`.
- URL lama dipertahankan: post `/%postname%/`, kategori tanpa base (`/berita/nasional/`), penulis `/profile/<slug>/`, tag `/tag/<slug>/`.
- Kategori (slug, urutan menu): `berita` › `nasional`, `daerah`, `internasional`; `tanya-jawab`, `pustaka-tasawuf`, `artikel`, `thariqah`, `dawuh`, `tokoh`, `hikmah`.
- Rubrik teduh = `dawuh`, `hikmah`, `pustaka-tasawuf` (konstanta `JATMAN_TEDUH` di mu-plugin, satu-satunya sumber).
- Warna terang/gelap persis seperti tabel di spec §5: brand `#00712D`/`#4FBF7F`, night `#063D27`/`#0A2A1C`, gold `#B8913A`/`#D9B65C`, base `#FFFFFF`/`#0E1512`, cream `#F7F3EA`/`#16201B`, ink `#15201A`/`#E6ECE8`, muted `#5B6B62`/`#9DB0A5`, line `#E3E8E4`/`#24312A`. Emas tidak boleh dipakai untuk teks kecil.
- Font: Plus Jakarta Sans (UI), Source Serif 4 (isi), Uthman Taha -ID (Arab, dari `../uthman-taha`). Semua self-hosted, tanpa CDN.
- Tanggal Hijriah **tidak** dipakai.
- Tidak boleh ada request ke domain pihak ketiga saat halaman publik dimuat (tidak ada Gravatar, emoji CDN, atau Google Fonts).
- Dark mode lewat `data-theme` pada `<html>`, dengan kunci localStorage `jatman-theme` (`light`|`dark`).
- Target kualitas: axe 0 pelanggaran serious/critical (terang dan gelap), Lighthouse mobile performance ≥ 90 untuk beranda dan artikel, tidak ada PHP notice/warning dari kode jatman di `debug.log`.
- Situs lokal di `http://localhost:8888` (admin: `admin` / `password`). Tes PHP berjalan di environment wp-env kedua dari `.wp-env.test.json` (port 8889, container & database terpisah). wp-env 11 tidak lagi membuat environment `tests` otomatis.

## Review Focus

1. **Markup artikel lama yang kacau** (paragraf tanpa tag penutup, `div` bersarang, `span` kosong, gambar di tengah paragraf berteks): isi harus tetap utuh, tidak ada teks atau gambar yang hilang. Dikunci oleh tes di Task 4 (`nested div`, `img di paragraf berteks`).
2. **Judul/ringkasan dengan karakter khusus** (`'`, `&`, `"`, huruf Arab): tampil sekali-escape di kartu, judul, dan URL share, tanpa `&amp;amp;`. Dikunci oleh tes di Task 10 (`test-post-list.php`) dan Task 11 (share URL).
3. **Rubrik kosong, post tanpa gambar utama, penulis tanpa foto/bio:** layout tidak bolong. Bagian kosong hilang, kartu tanpa gambar tidak merender wadah gambar, dan avatar bawaan dipakai. Dikunci oleh tes di Task 2 dan Task 10.
4. **Pencarian dengan HTML/karakter khusus atau 0 hasil:** judul "N hasil untuk “…”" ter-escape dan form tetap tampil. Dikunci oleh tes di Task 12.
5. **localStorage diblokir** (mode privat/kebijakan browser): halaman tetap tampil dalam mode terang tanpa error JS, dan toggle tidak membuat crash. Dikunci oleh tes di Task 8.

## File Map

```
package.json, .wp-env.json, .wp-env.test.json, .gitignore, playwright.config.ts, README.md
mu-plugins/jatman-core.php                    loader
mu-plugins/jatman-core/categories.php         pohon kategori, jatman_ensure_categories(), JATMAN_TEDUH, jatman_is_teduh()
mu-plugins/jatman-core/urls.php               base penulis, kategori tanpa base, invalidasi rewrite
mu-plugins/jatman-core/authors.php            avatar lokal (pre_get_avatar_data)
mu-plugins/jatman-core/pilihan.php            meta jatman_pilihan + aset editor
mu-plugins/jatman-core/pilihan-panel.js       panel "Pilihan Redaksi" di editor
mu-plugins/jatman-core/content.php            lang/dir untuk paragraf Arab
mu-plugins/jatman-core/avatar-default.svg
theme/jatman/style.css, theme.json, functions.php
theme/jatman/inc/setup.php                    enqueue, head script, preload, image sizes, emoji off, body_class
theme/jatman/inc/svg.php                      jatman_inline_svg()
theme/jatman/inc/blocks.php                   registrasi block + skrip editor
theme/jatman/inc/cards.php                    jatman_card(), meta, kategori utama, waktu baca
theme/jatman/inc/post-list.php                jatman_render_post_list() + layout
theme/jatman/inc/article.php                  breadcrumb, byline, figure, share
theme/jatman/inc/archive.php                  header arsip/penulis/pencarian, tab Berita
theme/jatman/blocks/<nama>/{block.json,render.php}
  theme-toggle, brand, topbar, post-list, card, breadcrumb, dek, byline, featured-figure, share, archive-header
theme/jatman/templates/  index, front-page, single, archive, search, 404, page, page-tentang
theme/jatman/parts/      topbar, header, footer
theme/jatman/patterns/   footer.php, lambang-tentang.php
theme/jatman/assets/css/main.css, assets/js/theme.js, assets/js/editor-blocks.js
theme/jatman/assets/img/ knot.svg, favicon.svg, lambang-jatman.svg, pattern.svg
theme/jatman/assets/fonts/*.woff2
tools/setup.php, tools/lint-php.sh
tools/brand/build.mjs, tools/brand/src/*
tools/sample/articles.txt, fetch.mjs, lib/*.mjs, import.php, reset.php, pages.php
tools/importer/class-jatman-importer.php
tests/unit/*.test.mjs, tests/php/run.php, tests/php/test-*.php
tests/e2e/*.spec.ts, tests/e2e/helpers.ts
tests/fixtures/varient/*.html, tests/fixtures/import/{posts.json,media/sample.jpg}
tests/validate-theme-json.mjs, tests/lighthouse.mjs
```

---

### Task 1: Scaffold repo + WordPress lokal

**Files:**
- Create: `package.json`, `.wp-env.json`, `.wp-env.test.json`, `playwright.config.ts`, `tools/setup.php`, `tools/lint-php.sh`
- Create: `theme/jatman/style.css`, `theme/jatman/theme.json`, `theme/jatman/functions.php`, `theme/jatman/templates/index.html`
- Create: `mu-plugins/jatman-core.php`
- Create: `tests/e2e/helpers.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: script npm `env:start`, `env:stop`, `setup`, `wp`, `test:unit`, `test:php`, `test:e2e`, `test`, `lint:php`. Helper e2e `wp(...args): string`, `samplePosts()`, `norm(s)`. Path di dalam container: `ABSPATH . 'tools/…'`, `ABSPATH . 'tests/php/…'`, `ABSPATH . 'tests/fixtures/…'`.

- [ ] **Step 1: Tulis `package.json` lalu pasang dependensi**

```json
{
  "name": "jatman-online",
  "private": true,
  "type": "module",
  "scripts": {
    "env:start": "wp-env start && npm run setup",
    "env:stop": "wp-env stop && wp-env stop --config=.wp-env.test.json",
    "setup": "wp-env run cli wp eval-file tools/setup.php",
    "wp": "wp-env run cli wp",
    "brand:build": "node tools/brand/build.mjs",
    "sample:fetch": "node tools/sample/fetch.mjs",
    "sample:import": "wp-env run cli wp eval-file tools/sample/import.php",
    "sample:reset": "wp-env run cli wp eval-file tools/sample/reset.php && npm run sample:import",
    "test:unit": "node --test \"tests/unit/**/*.test.mjs\"",
    "test:php": "wp-env start --config=.wp-env.test.json && wp-env run --config=.wp-env.test.json cli wp eval-file tools/setup.php && wp-env run --config=.wp-env.test.json cli wp eval-file tests/php/run.php",
    "test:e2e": "playwright test --project=e2e",
    "test": "npm run test:unit && npm run test:php && npm run test:e2e",
    "screens": "playwright test --project=screens",
    "lighthouse": "node tests/lighthouse.mjs",
    "lint:php": "wp-env run cli bash tools/lint-php.sh",
    "lint:theme-json": "node tests/validate-theme-json.mjs"
  }
}
```

Run:
```bash
npm i -D @wordpress/env@11.17.0 @playwright/test@1.64.0 @axe-core/playwright@4.13.0 cheerio@1.2.0 \
  lighthouse@13.5.0 chrome-launcher@1.2.2 sharp@0.35.5 potrace@2.1.8 svgo@4.1.0 wawoff2@2.0.1 \
  ajv@8.20.0 ajv-formats@3.0.1 @fontsource-variable/plus-jakarta-sans@5.3.0 @fontsource-variable/source-serif-4@5.3.0
```
Expected: `package.json` punya `devDependencies` dengan versi di atas, dan `node_modules/` terbentuk.

- [ ] **Step 2: Tulis helper dan smoke test e2e yang masih gagal**

`playwright.config.ts`:
```ts
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
```

`tests/e2e/helpers.ts`:
```ts
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

/** Jalankan wp-cli di container development. Mengembalikan stdout. */
export function wp(...args: string[]): string {
  return execFileSync('npx', ['wp-env', 'run', 'cli', 'wp', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/** Ambil angka pertama yang berdiri sendiri di output wp-cli (status wp-env diabaikan). */
export function wpCount(...args: string[]): number {
  const match = wp(...args).match(/^\d+$/m);
  if (!match) throw new Error(`Tidak ada angka di output: wp ${args.join(' ')}`);
  return Number(match[0]);
}

export type SamplePost = { slug: string; title: string; category: string; author: string; flags: string[] };

export function samplePosts(): SamplePost[] {
  const file = 'tools/sample/data/posts.json';
  if (!existsSync(file)) throw new Error('Data sample belum ada: jalankan `npm run sample:fetch && npm run sample:import`.');
  return JSON.parse(readFileSync(file, 'utf8')).posts;
}

/** Samakan tanda kutip tipografis (hasil wptexturize) supaya judul bisa dibandingkan. */
export const norm = (s: string) =>
  s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

export const NEWS = 'idarah-aliyyah-jatman-launching-logo-harlah-ke-69';
export const DAWUH = 'pesan-kh-kafabihi-di-haul-kh-noer-iskandar-majelis-ilmu-sebagai-jalan-menuju-ampunan';
```

`tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { wp } from './helpers';

test('situs lokal hidup dengan tema jatman dan bahasa Indonesia', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'id-ID');
  expect(wp('option', 'get', 'stylesheet')).toContain('jatman');
  expect(wp('option', 'get', 'permalink_structure')).toContain('/%postname%/');
});
```

- [ ] **Step 3: Jalankan untuk memastikan gagal**

Run: `npx playwright test --project=e2e tests/e2e/smoke.spec.ts`
Expected: FAIL dengan `net::ERR_CONNECTION_REFUSED` (WordPress belum jalan).

- [ ] **Step 4: Tulis konfigurasi wp-env, tema minimal, mu-plugin loader, dan setup**

`.wp-env.json`:
```json
{
  "phpVersion": "8.3",
  "themes": ["./theme/jatman"],
  "mappings": {
    "wp-content/mu-plugins": "./mu-plugins",
    "tools": "./tools",
    "tests/php": "./tests/php",
    "tests/fixtures": "./tests/fixtures"
  },
  "config": {
    "WP_DEBUG": true,
    "WP_DEBUG_LOG": true,
    "WP_DEBUG_DISPLAY": false
  }
}
```

`.wp-env.test.json` (environment tes: container & database terpisah, dipakai `npm run test:php` supaya tes PHP tidak mengotori data sample):
```json
{
  "phpVersion": "8.3",
  "port": 8889,
  "themes": ["./theme/jatman"],
  "mappings": {
    "wp-content/mu-plugins": "./mu-plugins",
    "tools": "./tools",
    "tests/php": "./tests/php",
    "tests/fixtures": "./tests/fixtures"
  },
  "config": {
    "WP_DEBUG": true,
    "WP_DEBUG_LOG": true,
    "WP_DEBUG_DISPLAY": false
  }
}
```

`theme/jatman/style.css`:
```css
/*
Theme Name: JATMAN Online
Theme URI: https://jatman.or.id
Author: LTN JATMAN
Description: Tema block JATMAN Online — media resmi Jam'iyyah Ahlith Thariqah al-Mu'tabarah an-Nahdliyyah.
Version: 0.1.0
Requires at least: 6.6
Requires PHP: 8.1
License: GPL-2.0-or-later
Text Domain: jatman
*/
```

`theme/jatman/theme.json` (sementara; diganti penuh di Task 8):
```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": { "appearanceTools": true }
}
```

`theme/jatman/functions.php`:
```php
<?php
/**
 * Tema JATMAN Online. Logika dipecah per tanggung jawab di inc/.
 */

defined( 'ABSPATH' ) || exit;

foreach ( glob( __DIR__ . '/inc/*.php' ) as $jatman_file ) {
	require_once $jatman_file;
}
```

`theme/jatman/templates/index.html` (sementara; diganti di Task 12):
```html
<!-- wp:group {"tagName":"main","layout":{"type":"default"}} -->
<main class="wp-block-group"><!-- wp:query {"query":{"inherit":true}} -->
<div class="wp-block-query"><!-- wp:post-template -->
<!-- wp:post-title {"isLink":true} /-->
<!-- /wp:post-template --></div>
<!-- /wp:query --></main>
<!-- /wp:group -->
```

`mu-plugins/jatman-core.php`:
```php
<?php
/**
 * Plugin Name: JATMAN Core
 * Description: Aturan konten JATMAN Online (kategori, URL lama, penulis, Pilihan Redaksi). Tetap berlaku walau tema diganti.
 */

defined( 'ABSPATH' ) || exit;

foreach ( glob( __DIR__ . '/jatman-core/*.php' ) as $jatman_core_file ) {
	require_once $jatman_core_file;
}
```

`tools/setup.php`:
```php
<?php
/**
 * Setup situs lokal yang idempotent. Jalankan: npm run setup (dev) atau lewat npm run test:php (env tes).
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}

$jatman_lang = WP_CLI::runcommand( 'language core is-installed id_ID', [ 'return' => 'all', 'exit_error' => false ] );
if ( 0 !== $jatman_lang->return_code ) {
	WP_CLI::runcommand( 'language core install id_ID' );
}
WP_CLI::runcommand( 'site switch-language id_ID' );
WP_CLI::runcommand( 'theme activate jatman' );

update_option( 'blogname', 'JATMAN Online' );
update_option( 'blogdescription', 'Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah' );
update_option( 'timezone_string', 'Asia/Jakarta' );
update_option( 'date_format', 'j F Y' );
update_option( 'show_on_front', 'posts' );
update_option( 'posts_per_page', 12 );
update_option( 'show_avatars', 1 );

global $wp_rewrite;
$wp_rewrite->set_permalink_structure( '/%postname%/' );

// Hapus konten bawaan WordPress supaya tidak ikut tampil di beranda sample.
foreach ( [ [ 'hello-world', 'post' ], [ 'sample-page', 'page' ], [ 'contoh-halaman', 'page' ] ] as [ $slug, $type ] ) {
	$default = get_page_by_path( $slug, OBJECT, $type );
	if ( $default ) {
		wp_delete_post( $default->ID, true );
	}
}

if ( function_exists( 'jatman_ensure_categories' ) ) {
	jatman_ensure_categories();
}
flush_rewrite_rules( false );

WP_CLI::success( 'Setup selesai.' );
```

`tools/lint-php.sh`:
```bash
#!/usr/bin/env bash
# Lint semua PHP proyek di dalam container wp-env (php -l). Gagal bila ada satu file rusak.
set -euo pipefail
find wp-content/mu-plugins wp-content/themes/jatman tools tests/php -name '*.php' -print0 | xargs -0 -n1 php -l
```

Tambahkan ke `.gitignore`:
```
test-results/
playwright-report/
```

- [ ] **Step 5: Nyalakan WordPress lalu jalankan smoke test**

Run: `npm run env:start` (pertama kali ±2–5 menit karena mengunduh image Docker)
Expected: berakhir dengan `Success: Setup selesai.`, dan WordPress tersedia di `http://localhost:8888`.

Run: `npx playwright test --project=e2e tests/e2e/smoke.spec.ts`
Expected: PASS (1 passed).

- [ ] **Step 6: Lint PHP**

Run: `npm run lint:php`
Expected: setiap file `No syntax errors detected`, exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .wp-env.json .wp-env.test.json .gitignore playwright.config.ts tools/setup.php tools/lint-php.sh theme mu-plugins tests/e2e
git commit -m "chore: scaffold wp-env, tema jatman minimal, dan smoke test"
```

---

### Task 2: mu-plugin jatman-core (kategori, URL, penulis, Pilihan Redaksi, teks Arab)

**Files:**
- Create: `mu-plugins/jatman-core/categories.php`, `urls.php`, `authors.php`, `pilihan.php`, `pilihan-panel.js`, `content.php`, `avatar-default.svg`
- Create: `tests/php/run.php`, `tests/php/test-categories.php`, `test-urls.php`, `test-authors.php`, `test-pilihan.php`, `test-content.php`
- Create: `tests/fixtures/import/media/sample.jpg` (dibuat dengan sharp)
- Create: `tests/e2e/editor.spec.ts`

**Interfaces:**
- Produces (PHP global functions):
  - `jatman_categories(): array` → `[ slug => [ string $name, ?string $parent_slug, string $description ] ]`, urut dari induk ke anak
  - `jatman_ensure_categories(): array` → `[ slug => int term_id ]`
  - `const JATMAN_TEDUH = ['dawuh','hikmah','pustaka-tasawuf']`
  - `jatman_is_teduh( int|WP_Post|null $post = null ): bool`. Kalau `null` di arsip kategori, yang dicek adalah kategori yang sedang dibuka.
  - `jatman_category_path( WP_Term $term ): string` → mis. `"berita/nasional"`
  - Post meta `jatman_pilihan` (boolean), user meta `jatman_avatar_id` (int)
- Produces (tes PHP): `jt_assert( bool, string )`, `jt_same( mixed $expected, mixed $actual, string )`

- [ ] **Step 1: Buat gambar fixture dan runner tes PHP**

Run:
```bash
mkdir -p tests/fixtures/import/media && node --input-type=module -e "import sharp from 'sharp'; await sharp({create:{width:64,height:40,channels:3,background:'#00712D'}}).jpeg().toFile('tests/fixtures/import/media/sample.jpg')"
```
Expected: file `tests/fixtures/import/media/sample.jpg` terbentuk (< 2 KB).

`tests/php/run.php`:
```php
<?php
/**
 * Runner tes PHP mini, dijalankan di environment tes terpisah (.wp-env.test.json, port 8889).
 * Jalankan: npm run test:php   (filter: npx wp-env run --config=.wp-env.test.json cli wp eval-file tests/php/run.php urls)
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}

$GLOBALS['jt_results'] = [ 'pass' => 0, 'fail' => [] ];

function jt_assert( bool $cond, string $msg ): void {
	if ( $cond ) {
		$GLOBALS['jt_results']['pass']++;
	} else {
		$GLOBALS['jt_results']['fail'][] = $msg;
	}
}

function jt_same( $expected, $actual, string $msg ): void {
	jt_assert( $expected === $actual, $msg . ' — expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ) );
}

$jt_filter = $args[0] ?? '';
foreach ( glob( __DIR__ . '/test-*.php' ) as $jt_file ) {
	if ( $jt_filter && ! str_contains( basename( $jt_file ), $jt_filter ) ) {
		continue;
	}
	WP_CLI::log( '• ' . basename( $jt_file ) );
	try {
		require $jt_file;
	} catch ( Throwable $e ) {
		$GLOBALS['jt_results']['fail'][] = basename( $jt_file ) . ': ' . get_class( $e ) . ': ' . $e->getMessage();
	}
}

$jt_r = $GLOBALS['jt_results'];
foreach ( $jt_r['fail'] as $jt_fail ) {
	WP_CLI::warning( $jt_fail );
}
if ( $jt_r['fail'] ) {
	WP_CLI::error( sprintf( '%d lulus, %d gagal', $jt_r['pass'], count( $jt_r['fail'] ) ) );
}
WP_CLI::success( sprintf( '%d lulus', $jt_r['pass'] ) );
```

- [ ] **Step 2: Tulis tes PHP yang masih gagal**

`tests/php/test-categories.php`:
```php
<?php
$ids = jatman_ensure_categories();
jt_same( count( jatman_categories() ), count( $ids ), 'semua kategori dibuat' );
jt_same( $ids['berita'], (int) get_term( $ids['nasional'], 'category' )->parent, 'nasional anak dari berita' );
jt_same( 0, (int) get_term( $ids['dawuh'], 'category' )->parent, 'dawuh kategori akar' );

// Idempotent: dipanggil ulang tidak menduplikasi dan tidak menimpa deskripsi hasil edit redaksi.
wp_update_term( $ids['hikmah'], 'category', [ 'description' => 'Diubah redaksi' ] );
jt_same( $ids, jatman_ensure_categories(), 'ID kategori stabil saat dipanggil ulang' );
jt_same( 'Diubah redaksi', get_term( $ids['hikmah'], 'category' )->description, 'deskripsi redaksi tidak ditimpa' );
wp_update_term( $ids['hikmah'], 'category', [ 'description' => jatman_categories()['hikmah'][2] ] );

$dawuh_post = wp_insert_post( [ 'post_title' => 'jt dawuh', 'post_status' => 'publish', 'post_category' => [ $ids['dawuh'] ] ] );
$news_post  = wp_insert_post( [ 'post_title' => 'jt news', 'post_status' => 'publish', 'post_category' => [ $ids['nasional'] ] ] );
try {
	jt_assert( jatman_is_teduh( $dawuh_post ), 'post dawuh = rubrik teduh' );
	jt_assert( ! jatman_is_teduh( $news_post ), 'post nasional bukan rubrik teduh' );
} finally {
	wp_delete_post( $dawuh_post, true );
	wp_delete_post( $news_post, true );
}
```

`tests/php/test-urls.php`:
```php
<?php
global $wp_rewrite;
jatman_ensure_categories();
flush_rewrite_rules( false );
$rules = get_option( 'rewrite_rules' );

jt_same( 'index.php?category_name=berita/nasional', $rules['berita/nasional/?$'] ?? null, 'rule /berita/nasional/' );
jt_same( 'index.php?category_name=berita/nasional&paged=$matches[1]', $rules['berita/nasional/page/?([0-9]{1,})/?$'] ?? null, 'rule halaman 2 kategori' );
jt_same( 'index.php?category_name=dawuh', $rules['dawuh/?$'] ?? null, 'rule /dawuh/' );
jt_assert( ! isset( $rules['category/(.+?)/?$'] ), 'base /category/ tidak dipakai lagi' );
jt_same( home_url( '/berita/nasional/' ), get_category_link( get_term_by( 'slug', 'nasional', 'category' ) ), 'link kategori tanpa base' );
jt_same( 'profile', $wp_rewrite->author_base, 'base penulis = profile' );

// Post bernama sama dengan kategori: post yang menang, kategori mengalah.
$clash = wp_insert_post( [ 'post_title' => 'Artikel', 'post_name' => 'artikel', 'post_status' => 'publish' ] );
try {
	jt_assert( ! get_option( 'rewrite_rules' ), 'rewrite rules diinvalidasi saat post bentrok disimpan' );
	flush_rewrite_rules( false );
	jt_assert( ! isset( get_option( 'rewrite_rules' )['artikel/?$'] ), 'kategori artikel mengalah ke post bernama artikel' );
} finally {
	wp_delete_post( $clash, true );
	flush_rewrite_rules( false );
}
jt_assert( isset( get_option( 'rewrite_rules' )['artikel/?$'] ), 'rule kategori artikel kembali setelah post dihapus' );
```

`tests/php/test-authors.php`:
```php
<?php
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/user.php';

$user_id = wp_insert_user( [
	'user_login'   => 'jt-penulis',
	'user_pass'    => wp_generate_password(),
	'user_email'   => 'jt-penulis@jatman.invalid',
	'display_name' => 'Penulis Uji',
	'role'         => 'author',
] );
$tmp = wp_tempnam( 'sample.jpg' );
copy( ABSPATH . 'tests/fixtures/import/media/sample.jpg', $tmp );
$att = media_handle_sideload( [ 'name' => 'jt-avatar.jpg', 'tmp_name' => $tmp ], 0 );
try {
	jt_assert( str_ends_with( get_avatar_url( $user_id ), '/avatar-default.svg' ), 'tanpa foto → avatar bawaan lokal' );
	update_user_meta( $user_id, 'jatman_avatar_id', $att );
	$expected = wp_get_attachment_image_url( $att, 'thumbnail' );
	jt_same( $expected, get_avatar_url( $user_id ), 'foto penulis dari media lokal (ID)' );
	jt_same( $expected, get_avatar_url( get_userdata( $user_id ) ), 'foto penulis dari media lokal (WP_User)' );
	jt_assert( ! str_contains( get_avatar( $user_id ), 'gravatar.com' ), 'tidak ada request ke Gravatar' );
	jt_assert( str_contains( get_author_posts_url( $user_id ), '/profile/jt-penulis/' ), 'URL penulis /profile/<slug>/' );
} finally {
	wp_delete_user( $user_id );
	wp_delete_attachment( $att, true );
}
```

`tests/php/test-pilihan.php`:
```php
<?php
$meta = get_registered_meta_keys( 'post', 'post' );
jt_assert( isset( $meta['jatman_pilihan'] ), 'meta jatman_pilihan terdaftar' );
jt_same( 'boolean', $meta['jatman_pilihan']['type'] ?? null, 'meta jatman_pilihan bertipe boolean' );
jt_assert( ! empty( $meta['jatman_pilihan']['show_in_rest'] ), 'meta jatman_pilihan tersedia di REST (editor)' );
```

`tests/php/test-content.php`:
```php
<?php
$arab = render_block( parse_blocks( '<!-- wp:paragraph {"className":"jm-arab"} --><p class="jm-arab">بسم الله الرحمن الرحيم</p><!-- /wp:paragraph -->' )[0] );
jt_assert( str_contains( $arab, 'lang="ar"' ) && str_contains( $arab, 'dir="rtl"' ), 'paragraf Arab diberi lang & dir' );
$plain = render_block( parse_blocks( '<!-- wp:paragraph --><p>Biasa</p><!-- /wp:paragraph -->' )[0] );
jt_assert( ! str_contains( $plain, 'lang=' ), 'paragraf biasa tidak diubah' );
```

- [ ] **Step 3: Jalankan untuk memastikan gagal**

Run: `npm run test:php`
Expected: FAIL. Muncul peringatan seperti `test-categories.php: Error: Call to undefined function jatman_ensure_categories()` dan proses diakhiri `Error: 0 lulus, 5 gagal` (angka tepatnya boleh berbeda).

- [ ] **Step 4: Implementasi mu-plugin**

`mu-plugins/jatman-core/categories.php`:
```php
<?php
/**
 * Pohon kategori JATMAN Online. Slug sama dengan web lama (Varient) supaya URL tidak berubah.
 */

defined( 'ABSPATH' ) || exit;

/** Rubrik bernuansa teduh: tampil dengan latar krem dan ornamen emas. */
const JATMAN_TEDUH = [ 'dawuh', 'hikmah', 'pustaka-tasawuf' ];

/**
 * @return array<string, array{0: string, 1: ?string, 2: string}> slug => [nama, slug induk, deskripsi awal]. Induk selalu didaftarkan sebelum anaknya.
 */
function jatman_categories(): array {
	return [
		'berita'          => [ 'Berita', null, 'Kabar terkini seputar JATMAN, thariqah, dan umat.' ],
		'nasional'        => [ 'Nasional', 'berita', 'Kabar JATMAN dan thariqah dari tingkat nasional.' ],
		'daerah'          => [ 'Daerah', 'berita', 'Kabar dari Idarah Wustha dan Idarah Syu’biyyah di daerah.' ],
		'internasional'   => [ 'Internasional', 'berita', 'Jejaring thariqah di mancanegara.' ],
		'tanya-jawab'     => [ 'Tanya Jawab', null, 'Pertanyaan seputar thariqah dan tasawuf beserta jawabannya.' ],
		'pustaka-tasawuf' => [ 'Pustaka Tasawuf', null, 'Kajian dan khazanah tasawuf.' ],
		'artikel'         => [ 'Artikel', null, 'Opini dan tulisan panjang.' ],
		'thariqah'        => [ 'Thariqah', null, 'Mengenal thariqah al-mu’tabarah.' ],
		'dawuh'           => [ 'Dawuh', null, 'Nasihat para masyayikh dan mursyid.' ],
		'tokoh'           => [ 'Tokoh', null, 'Profil ulama dan tokoh thariqah.' ],
		'hikmah'          => [ 'Hikmah', null, 'Renungan dan mutiara hikmah.' ],
	];
}

/**
 * Pastikan semua kategori ada dengan induk yang benar. Deskripsi hanya diisi saat kategori dibuat,
 * supaya hasil edit redaksi tidak tertimpa.
 *
 * @return array<string, int> slug => term_id
 */
function jatman_ensure_categories(): array {
	$ids = [];
	foreach ( jatman_categories() as $slug => [ $name, $parent, $description ] ) {
		$parent_id = $parent ? ( $ids[ $parent ] ?? 0 ) : 0;
		$term      = get_term_by( 'slug', $slug, 'category' );
		if ( $term ) {
			if ( (int) $term->parent !== $parent_id ) {
				wp_update_term( $term->term_id, 'category', [ 'parent' => $parent_id ] );
			}
			$ids[ $slug ] = (int) $term->term_id;
			continue;
		}
		$created = wp_insert_term( $name, 'category', [ 'slug' => $slug, 'parent' => $parent_id, 'description' => $description ] );
		if ( is_wp_error( $created ) ) {
			throw new RuntimeException( "Gagal membuat kategori $slug: " . $created->get_error_message() );
		}
		$ids[ $slug ] = (int) $created['term_id'];
	}
	return $ids;
}

/**
 * Apakah post (atau arsip kategori yang sedang dibuka bila $post null) termasuk rubrik teduh.
 */
function jatman_is_teduh( $post = null ): bool {
	if ( null === $post && is_category() ) {
		$term = get_queried_object();
		return $term instanceof WP_Term && in_array( $term->slug, JATMAN_TEDUH, true );
	}
	$post = get_post( $post );
	if ( ! $post || 'post' !== $post->post_type ) {
		return false;
	}
	return has_category( JATMAN_TEDUH, $post );
}
```

`mu-plugins/jatman-core/urls.php`:
```php
<?php
/**
 * URL lama Varient: /<slug-post>/, /berita/nasional/, /profile/<penulis>/, /tag/<tag>/.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function (): void {
		global $wp_rewrite;
		$wp_rewrite->author_base = 'profile';
	}
);

/** Path lengkap kategori, mis. "berita/nasional". */
function jatman_category_path( WP_Term $term ): string {
	$slugs = [];
	foreach ( array_reverse( get_ancestors( $term->term_id, 'category', 'taxonomy' ) ) as $ancestor_id ) {
		$slugs[] = get_term( $ancestor_id, 'category' )->slug;
	}
	$slugs[] = $term->slug;
	return implode( '/', $slugs );
}

add_filter(
	'term_link',
	static function ( string $url, WP_Term $term, string $taxonomy ): string {
		if ( 'category' !== $taxonomy || ! get_option( 'permalink_structure' ) ) {
			return $url;
		}
		return home_url( user_trailingslashit( jatman_category_path( $term ), 'category' ) );
	},
	10,
	3
);

/**
 * Ganti rule bawaan /category/... dengan rule per kategori tanpa base. Rule kategori didaftarkan
 * sebelum rule post, jadi kategori yang path-nya sudah dipakai post/halaman dilewati: post menang.
 */
add_filter(
	'category_rewrite_rules',
	static function (): array {
		$rules = [];
		foreach ( get_terms( [ 'taxonomy' => 'category', 'hide_empty' => false ] ) as $term ) {
			$path = jatman_category_path( $term );
			if ( get_page_by_path( $path, OBJECT, [ 'post', 'page' ] ) ) {
				error_log( "[jatman] /$path/ sudah dipakai post/halaman; arsip kategori '{$term->slug}' tidak diberi URL tanpa base." );
				continue;
			}
			$rules[ "$path/feed/(feed|rdf|rss|rss2|atom)/?$" ] = "index.php?category_name=$path&feed=\$matches[1]";
			$rules[ "$path/(feed|rdf|rss|rss2|atom)/?$" ]      = "index.php?category_name=$path&feed=\$matches[1]";
			$rules[ "$path/page/?([0-9]{1,})/?$" ]             = "index.php?category_name=$path&paged=\$matches[1]";
			$rules[ "$path/?$" ]                               = "index.php?category_name=$path";
		}
		return $rules;
	}
);

/** Buang cache rewrite supaya dibangun ulang di request berikutnya. */
function jatman_invalidate_rewrites(): void {
	delete_option( 'rewrite_rules' );
}

foreach ( [ 'created_category', 'edited_category', 'delete_category' ] as $jatman_hook ) {
	add_action( $jatman_hook, 'jatman_invalidate_rewrites' );
}

add_action(
	'wp_insert_post',
	static function ( int $post_id, WP_Post $post ): void {
		if ( in_array( $post->post_type, [ 'post', 'page' ], true ) && $post->post_name && term_exists( $post->post_name, 'category' ) ) {
			jatman_invalidate_rewrites();
		}
	},
	10,
	2
);
```

`mu-plugins/jatman-core/authors.php`:
```php
<?php
/**
 * Avatar penulis dari media lokal (user meta jatman_avatar_id). Tidak pernah memanggil Gravatar.
 */

defined( 'ABSPATH' ) || exit;

function jatman_resolve_avatar_user( $id_or_email ): ?WP_User {
	if ( $id_or_email instanceof WP_User ) {
		return $id_or_email;
	}
	if ( $id_or_email instanceof WP_Post ) {
		return get_userdata( (int) $id_or_email->post_author ) ?: null;
	}
	if ( $id_or_email instanceof WP_Comment ) {
		return $id_or_email->user_id ? ( get_userdata( (int) $id_or_email->user_id ) ?: null ) : null;
	}
	if ( is_numeric( $id_or_email ) ) {
		return get_userdata( (int) $id_or_email ) ?: null;
	}
	if ( is_string( $id_or_email ) && is_email( $id_or_email ) ) {
		return get_user_by( 'email', $id_or_email ) ?: null;
	}
	return null;
}

add_filter(
	'pre_get_avatar_data',
	static function ( array $args, $id_or_email ): array {
		$user          = jatman_resolve_avatar_user( $id_or_email );
		$attachment_id = $user ? (int) get_user_meta( $user->ID, 'jatman_avatar_id', true ) : 0;
		$url           = $attachment_id ? wp_get_attachment_image_url( $attachment_id, 'thumbnail' ) : false;

		$args['url']          = $url ?: WPMU_PLUGIN_URL . '/jatman-core/avatar-default.svg';
		$args['found_avatar'] = true;
		return $args;
	},
	10,
	2
);
```

`mu-plugins/jatman-core/avatar-default.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#063D27"/><circle cx="32" cy="25" r="11" fill="#F7F3EA" opacity=".85"/><path d="M12 56c2-11 10-17 20-17s18 6 20 17" fill="#F7F3EA" opacity=".85"/></svg>
```

`mu-plugins/jatman-core/pilihan.php`:
```php
<?php
/**
 * Pilihan Redaksi: penanda di post yang diatur redaksi lewat checkbox di editor.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function (): void {
		register_post_meta(
			'post',
			'jatman_pilihan',
			[
				'type'          => 'boolean',
				'single'        => true,
				'default'       => false,
				'show_in_rest'  => true,
				'auth_callback' => static fn(): bool => current_user_can( 'edit_posts' ),
			]
		);
	}
);

add_action(
	'enqueue_block_editor_assets',
	static function (): void {
		$screen = get_current_screen();
		if ( ! $screen || 'post' !== $screen->post_type ) {
			return;
		}
		$file = __DIR__ . '/pilihan-panel.js';
		wp_enqueue_script(
			'jatman-pilihan-panel',
			WPMU_PLUGIN_URL . '/jatman-core/pilihan-panel.js',
			[ 'wp-plugins', 'wp-editor', 'wp-data', 'wp-components', 'wp-element' ],
			(string) filemtime( $file ),
			true
		);
	}
);
```

`mu-plugins/jatman-core/pilihan-panel.js`:
```js
( function ( wp ) {
	const el = wp.element.createElement;
	const { PluginDocumentSettingPanel } = wp.editor;
	const { CheckboxControl } = wp.components;
	const { useSelect, useDispatch } = wp.data;

	function PilihanPanel() {
		const checked = useSelect(
			( select ) => !! ( select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {} ).jatman_pilihan,
			[]
		);
		const { editPost } = useDispatch( 'core/editor' );
		return el(
			PluginDocumentSettingPanel,
			{ name: 'jatman-pilihan', title: 'Pilihan Redaksi' },
			el( CheckboxControl, {
				label: 'Tampilkan di Pilihan Redaksi',
				help: 'Muncul di daftar Pilihan Redaksi di beranda.',
				checked,
				onChange: ( value ) => editPost( { meta: { jatman_pilihan: value } } ),
			} )
		);
	}

	wp.plugins.registerPlugin( 'jatman-pilihan', { render: PilihanPanel } );
} )( window.wp );
```

`mu-plugins/jatman-core/content.php`:
```php
<?php
/**
 * Paragraf yang isinya teks Arab (class jm-arab, dari importer) diberi lang & dir saat dirender,
 * supaya markup block tetap valid di editor.
 */

defined( 'ABSPATH' ) || exit;

add_filter(
	'render_block_core/paragraph',
	static function ( string $html ): string {
		if ( ! str_contains( $html, 'jm-arab' ) ) {
			return $html;
		}
		$p = new WP_HTML_Tag_Processor( $html );
		if ( $p->next_tag( 'p' ) && $p->has_class( 'jm-arab' ) ) {
			$p->set_attribute( 'lang', 'ar' );
			$p->set_attribute( 'dir', 'rtl' );
		}
		return $p->get_updated_html();
	}
);
```

- [ ] **Step 5: Jalankan tes PHP sampai lulus**

Run: `npm run test:php`
Expected: PASS, diakhiri `Success: NN lulus` tanpa peringatan.

- [ ] **Step 6: Tes e2e panel editor**

`tests/e2e/editor.spec.ts`:
```ts
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
```

Run: `npx playwright test --project=e2e tests/e2e/editor.spec.ts`
Expected: PASS.

- [ ] **Step 7: Lint lalu commit**

Run: `npm run lint:php` → exit 0.
```bash
git add mu-plugins tests/php tests/fixtures/import/media/sample.jpg tests/e2e/editor.spec.ts
git commit -m "feat(core): kategori, URL lama, avatar lokal, Pilihan Redaksi, dan teks Arab"
```

---

### Task 3: Parser daftar artikel dan halaman Varient

**Files:**
- Create: `tools/sample/lib/articles-list.mjs`, `tools/sample/lib/parse-article.mjs`, `tools/sample/lib/parse-profile.mjs`
- Create: `tests/fixtures/varient/article.html`, `tests/fixtures/varient/profile.html`
- Test: `tests/unit/articles-list.test.mjs`, `tests/unit/parse-article.test.mjs`

**Interfaces:**
- Produces:
  - `parseArticlesList(text: string): Array<{ category: string, url: string, slug: string, flags: string[] }>`. Flag yang dikenal hanya `sticky` dan `pilihan`. Error menyebut nomor baris.
  - `parseArticle(html: string, url: string): { slug, title, excerpt, date /* "YYYY-MM-DD HH:MM:SS" */, author: { slug, name, avatarUrl: string|null }, image: { url, alt, caption } | null, tags: string[], breadcrumb: string[] /* path, mis. "berita/nasional" */, contentHtml: string }`. Melempar `Error` dengan pesan berbahasa Indonesia kalau judul, isi, penulis, atau tanggal tidak ditemukan.
  - `parseProfile(html: string): { bio: string }`

- [ ] **Step 1: Buat fixture HTML (ringkasan dari markup asli Varient 2.4.1)**

`tests/fixtures/varient/article.html`:
```html
<!DOCTYPE html><html lang="id"><head>
<meta property="og:title" content="Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69"/>
<meta property="og:description" content="Jelang Hari Lahir Jam&#039;iyyah Ahlith Thariqah (JATMAN) yang ke-69 Tahun."/>
<meta property="og:image" content="https://jatman.or.id/uploads/images/202610/image_870x580_6ac19de7a1bce.jpg"/>
<meta property="article:published_time" content="2026-10-04 07:33:10"/>
<meta property="article:author" content="Syahril Mubarok"/>
<meta property="article:tag" content="Harlah"/>
<meta property="article:tag" content="Harlah JATMAN"/>
</head><body>
<nav aria-label="breadcrumb"><ol class="breadcrumb">
<li class="breadcrumb-item"><a href="https://jatman.or.id">Beranda</a></li>
<li class="breadcrumb-item"><a href="https://jatman.or.id/berita">Berita</a></li>
<li class="breadcrumb-item"><a href="https://jatman.or.id/berita/nasional">Nasional</a></li>
<li class="breadcrumb-item active"> Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69</li>
</ol></nav>
<h1 class="post-title">Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69</h1>
<h2 class="post-summary">
    Jelang Hari Lahir Jam&#039;iyyah Ahlith Thariqah (JATMAN) yang ke-69 Tahun.    </h2>
<div class="d-flex align-items-center post-details-meta mb-4">
<div class="item-meta item-meta-author">
<a href="https://jatman.or.id/profile/syahril-mubarok"><img src="https://jatman.or.id/uploads/profile/202503/avatar_344_67d7416d43fb4.jpg" alt="Syahril Mubarok" width="32" height="32"><span>Syahril Mubarok</span></a>
</div></div>
<div class="post-image"><div class="post-image-inner">
<img src="https://jatman.or.id/uploads/images/202610/image_870x_6ac19de7abf7a.jpg" class="img-fluid center-image" alt="Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69" width="856" height="570"/>
<figcaption class="img-description">Logo Harlah Ke-69 JATMAN</figcaption>
</div></div>
<div class="post-text mt-4">
<p>Jakarta, <em><strong>JATMAN Online</strong></em>
<p>Jelang Hari Lahir JATMAN yang ke-69 Tahun, Idarah Aliyyah JATMAN me-<em>launching</em> logo Harlah di Jakarta.
<p data-pm-slice="1 1 []"><span><span class="a_GcMg"></span></span>
</div>
<div class="d-flex flex-row post-tags align-items-center mt-5"><h2 class="title">Tag:</h2><ul class="d-flex flex-row">
<li><a href="https://jatman.or.id/tag/harlah">Harlah</a></li>
<li><a href="https://jatman.or.id/tag/harlah-jatman">Harlah JATMAN</a></li>
</ul></div>
<p class="small-post-meta"><a href="https://jatman.or.id/profile/penulis-lain" class="a-username">Penulis Lain</a></p>
</body></html>
```

`tests/fixtures/varient/profile.html`:
```html
<div class="profile-details">
  <p class="description">
    Kontributor   JATMAN Online.
  </p>
  <div class="item text-muted">Anggota Sejak&nbsp;Maret 15, 2025</div>
</div>
```

- [ ] **Step 2: Tulis tes yang masih gagal**

`tests/unit/articles-list.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArticlesList } from '../../tools/sample/lib/articles-list.mjs';

test('membaca kategori, URL, slug, dan flag; mengabaikan komentar & baris kosong', () => {
  const list = parseArticlesList(`# komentar
nasional https://jatman.or.id/judul-satu sticky pilihan

dawuh   https://jatman.or.id/judul-dua
`);
  assert.deepEqual(list, [
    { category: 'nasional', url: 'https://jatman.or.id/judul-satu', slug: 'judul-satu', flags: ['sticky', 'pilihan'] },
    { category: 'dawuh', url: 'https://jatman.or.id/judul-dua', slug: 'judul-dua', flags: [] },
  ]);
});

test('baris rusak dilaporkan dengan nomor barisnya', () => {
  assert.throws(() => parseArticlesList('# a\nnasional bukan-url'), /baris 2/);
});

test('flag tak dikenal ditolak', () => {
  assert.throws(() => parseArticlesList('nasional https://jatman.or.id/x unggulan'), /Flag tidak dikenal: unggulan/);
});
```

`tests/unit/parse-article.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseArticle } from '../../tools/sample/lib/parse-article.mjs';
import { parseProfile } from '../../tools/sample/lib/parse-profile.mjs';

const html = readFileSync(new URL('../fixtures/varient/article.html', import.meta.url), 'utf8');
const URL_ = 'https://jatman.or.id/idarah-aliyyah-jatman-launching-logo-harlah-ke-69';

test('mengambil semua field artikel Varient', () => {
  const a = parseArticle(html, URL_);
  assert.equal(a.slug, 'idarah-aliyyah-jatman-launching-logo-harlah-ke-69');
  assert.equal(a.title, 'Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69');
  assert.equal(a.excerpt, "Jelang Hari Lahir Jam'iyyah Ahlith Thariqah (JATMAN) yang ke-69 Tahun.");
  assert.equal(a.date, '2026-10-04 07:33:10');
  assert.deepEqual(a.author, {
    slug: 'syahril-mubarok',
    name: 'Syahril Mubarok',
    avatarUrl: 'https://jatman.or.id/uploads/profile/202503/avatar_344_67d7416d43fb4.jpg',
  });
  assert.deepEqual(a.image, {
    url: 'https://jatman.or.id/uploads/images/202610/image_870x_6ac19de7abf7a.jpg',
    alt: 'Idarah Aliyyah JATMAN Launching Logo Harlah Ke-69',
    caption: 'Logo Harlah Ke-69 JATMAN',
  });
  assert.deepEqual(a.tags, ['Harlah', 'Harlah JATMAN']);
  assert.deepEqual(a.breadcrumb, ['berita', 'berita/nasional']);
  assert.match(a.contentHtml, /me-<em>launching<\/em>/);
});

test('avatar bawaan Varient dianggap tidak ada', () => {
  const a = parseArticle(html.replace(/uploads\/profile\/[^"]+/, 'assets/img/user.png'), URL_);
  assert.equal(a.author.avatarUrl, null);
});

test('gambar lazy-load memakai data-src', () => {
  const lazy = html.replace(
    'src="https://jatman.or.id/uploads/images/202610/image_870x_6ac19de7abf7a.jpg"',
    'src="data:image/gif;base64,R0l" data-src="https://jatman.or.id/uploads/images/lazy.jpg"'
  );
  assert.equal(parseArticle(lazy, URL_).image.url, 'https://jatman.or.id/uploads/images/lazy.jpg');
});

test('halaman tanpa isi ditolak dengan pesan jelas', () => {
  assert.throws(() => parseArticle(html.replace('post-text', 'bukan-isi'), URL_), /isi \(\.post-text\) tidak ditemukan/);
});

test('tanggal yang formatnya aneh ditolak', () => {
  assert.throws(() => parseArticle(html.replace('2026-10-04 07:33:10', '4 Oktober'), URL_), /tanggal/);
});

test('bio profil dirapikan spasinya', () => {
  const p = parseProfile(readFileSync(new URL('../fixtures/varient/profile.html', import.meta.url), 'utf8'));
  assert.deepEqual(p, { bio: 'Kontributor JATMAN Online.' });
});
```

- [ ] **Step 3: Jalankan untuk memastikan gagal**

Run: `npm run test:unit`
Expected: FAIL dengan `ERR_MODULE_NOT_FOUND` untuk `tools/sample/lib/articles-list.mjs`.

- [ ] **Step 4: Implementasi**

`tools/sample/lib/articles-list.mjs`:
```js
const FLAGS = new Set(['sticky', 'pilihan']);

/** Baris: "<slug-kategori> <url> [flag...]". Baris kosong dan baris berawalan # diabaikan. */
export function parseArticlesList(text) {
  const items = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const [category, url, ...flags] = line.split(/\s+/);
    if (!category || !/^https?:\/\//.test(url ?? '')) {
      throw new Error(`articles.txt baris ${index + 1} tidak valid: "${line}"`);
    }
    const unknown = flags.filter((f) => !FLAGS.has(f));
    if (unknown.length) throw new Error(`Flag tidak dikenal: ${unknown.join(', ')} (baris ${index + 1})`);
    items.push({ category, url, slug: new URL(url).pathname.replace(/^\/+|\/+$/g, ''), flags });
  });
  return items;
}
```

`tools/sample/lib/parse-article.mjs`:
```js
import * as cheerio from 'cheerio';

const DEFAULT_AVATAR = /\/assets\/img\/user\.png$/;
const DATE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const pathOf = (href) => new URL(href).pathname.replace(/^\/+|\/+$/g, '');

/** Ambil data artikel dari halaman post Varient 2.4.1 (tema "magazine"). */
export function parseArticle(html, url) {
  const $ = cheerio.load(html);
  const meta = (property) => squash($(`meta[property="${property}"]`).first().attr('content') ?? '');

  const title = squash($('h1.post-title').first().text()) || meta('og:title');
  if (!title) throw new Error('judul tidak ditemukan');

  const body = $('.post-text').first();
  if (!body.length) throw new Error('isi (.post-text) tidak ditemukan');

  const date = meta('article:published_time');
  if (!DATE.test(date)) throw new Error(`tanggal tidak dikenali: "${date}"`);

  // Hanya penulis di blok meta artikel; tautan profil di sidebar milik artikel lain.
  const authorLink = $('.post-details-meta .item-meta-author a').first();
  const authorSlug = (authorLink.attr('href') ?? '').match(/\/profile\/([^/?#]+)/)?.[1];
  if (!authorSlug) throw new Error('penulis tidak ditemukan');
  const avatar = authorLink.find('img').attr('src') ?? '';

  const img = $('.post-image img').first();
  const imgSrc = img.attr('data-src') || (img.attr('src')?.startsWith('data:') ? '' : img.attr('src')) || '';

  const metaTags = $('meta[property="article:tag"]').map((_, m) => squash($(m).attr('content') ?? '')).get();
  const listTags = $('.post-tags ul li a').map((_, a) => squash($(a).text())).get();

  return {
    slug: pathOf(url),
    title,
    excerpt: squash($('h2.post-summary').first().text()) || meta('og:description'),
    date,
    author: {
      slug: authorSlug,
      name: squash(authorLink.find('span').text()) || meta('article:author'),
      avatarUrl: avatar && !DEFAULT_AVATAR.test(avatar) ? avatar : null,
    },
    image: imgSrc
      ? { url: imgSrc, alt: squash(img.attr('alt') ?? ''), caption: squash($('.post-image figcaption').first().text()) }
      : null,
    tags: (metaTags.length ? metaTags : listTags).filter(Boolean),
    breadcrumb: $('.breadcrumb .breadcrumb-item a')
      .map((_, a) => pathOf($(a).attr('href')))
      .get()
      .filter(Boolean),
    contentHtml: body.html() ?? '',
  };
}
```

`tools/sample/lib/parse-profile.mjs`:
```js
import * as cheerio from 'cheerio';

/** Bio penulis dari halaman /profile/<slug> Varient. Kosong bila penulis tidak mengisi. */
export function parseProfile(html) {
  const $ = cheerio.load(html);
  return { bio: $('.profile-details .description').first().text().replace(/\s+/g, ' ').trim() };
}
```

- [ ] **Step 5: Jalankan sampai lulus**

Run: `npm run test:unit`
Expected: PASS (semua tes `articles-list` dan `parse-article` lulus).

- [ ] **Step 6: Commit**

```bash
git add tools/sample/lib tests/unit tests/fixtures/varient
git commit -m "feat(sample): parser daftar artikel, artikel, dan profil Varient"
```

---

### Task 4: Konversi HTML Varient → block Gutenberg

**Files:**
- Create: `tools/sample/lib/to-blocks.mjs`
- Test: `tests/unit/to-blocks.test.mjs`

**Interfaces:**
- Produces: `htmlToBlocks(html: string): { markup: string, images: string[] }`. `markup` berisi block markup yang dipisah baris kosong. `images` berisi URL absolut setiap gambar di isi, urut sesuai kemunculannya. Paragraf yang ≥ 50% hurufnya Arab mendapat `{"className":"jm-arab"}`. Potongan Arab di paragraf campuran dibungkus `<span lang="ar" dir="rtl">`.

- [ ] **Step 1: Tulis tes yang masih gagal**

`tests/unit/to-blocks.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToBlocks } from '../../tools/sample/lib/to-blocks.mjs';

const P = (inner) => `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->`;

test('paragraf Varient tanpa tag penutup jadi paragraf terpisah, format inline dipertahankan', () => {
  const { markup } = htmlToBlocks('<p>Jakarta, <em><strong>JATMAN Online</strong></em>\n<p>Me-<em>launching</em> logo.');
  assert.equal(markup, [P('Jakarta, <em><strong>JATMAN Online</strong></em>'), P('Me-<em>launching</em> logo.')].join('\n\n'));
});

test('paragraf kosong dan span sampah dibuang; b/i diubah ke strong/em; style dibuang', () => {
  const { markup } = htmlToBlocks('<p data-pm-slice="1 1 []"><span><span class="x"></span></span></p><p style="color:red"><span class="a"><b>Tebal</b> dan <i>miring</i></span>&nbsp;</p>');
  assert.equal(markup, P('<strong>Tebal</strong> dan <em>miring</em>'));
});

test('tautan aman dipertahankan, javascript: dibuang', () => {
  const { markup } = htmlToBlocks('<p><a href="https://jatman.or.id/x" target="_blank">ok</a> <a href="javascript:alert(1)">jahat</a></p>');
  assert.equal(markup, P('<a href="https://jatman.or.id/x">ok</a> jahat'));
});

test('teks di-escape sekali', () => {
  assert.equal(htmlToBlocks('<p>A &amp; B &lt;C&gt;</p>').markup, P('A &amp; B &lt;C&gt;'));
});

test('heading: h1 diturunkan ke h2, h3 tetap', () => {
  const { markup } = htmlToBlocks('<h1>Satu</h1><h3>Tiga</h3>');
  assert.equal(
    markup,
    '<!-- wp:heading -->\n<h2 class="wp-block-heading">Satu</h2>\n<!-- /wp:heading -->\n\n' +
      '<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">Tiga</h3>\n<!-- /wp:heading -->'
  );
});

test('kutipan dan daftar', () => {
  const { markup } = htmlToBlocks('<blockquote><p>Ilmu itu cahaya.</p></blockquote><ol><li>Satu</li><li><b>Dua</b></li></ol>');
  assert.equal(
    markup,
    '<!-- wp:quote -->\n<blockquote class="wp-block-quote">' + P('Ilmu itu cahaya.') + '</blockquote>\n<!-- /wp:quote -->\n\n' +
      '<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list"><!-- wp:list-item -->\n<li>Satu</li>\n<!-- /wp:list-item --><!-- wp:list-item -->\n<li><strong>Dua</strong></li>\n<!-- /wp:list-item --></ol>\n<!-- /wp:list -->'
  );
});

test('gambar: paragraf berisi gambar saja dan figure+caption jadi block image; URL dicatat', () => {
  const { markup, images } = htmlToBlocks(
    '<p><img src="https://jatman.or.id/a.jpg" alt="A"></p><figure><img data-src="https://jatman.or.id/b.jpg" src="data:x"><figcaption>Keterangan B</figcaption></figure>'
  );
  assert.deepEqual(images, ['https://jatman.or.id/a.jpg', 'https://jatman.or.id/b.jpg']);
  assert.equal(
    markup,
    '<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="https://jatman.or.id/a.jpg" alt="A"/></figure>\n<!-- /wp:image -->\n\n' +
      '<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="https://jatman.or.id/b.jpg" alt=""/><figcaption class="wp-element-caption">Keterangan B</figcaption></figure>\n<!-- /wp:image -->'
  );
});

test('gambar di tengah paragraf berteks tidak hilang: teks dulu, lalu gambarnya', () => {
  const { markup, images } = htmlToBlocks('<p>Sebelum <img src="https://jatman.or.id/c.jpg"> sesudah</p>');
  assert.deepEqual(images, ['https://jatman.or.id/c.jpg']);
  assert.match(markup, /^<!-- wp:paragraph -->\n<p>Sebelum sesudah<\/p>/);
  assert.match(markup, /<img src="https:\/\/jatman\.or\.id\/c\.jpg" alt=""\/>/);
});

test('div bersarang dibuka; teks lepas jadi paragraf', () => {
  const { markup } = htmlToBlocks('<div><div>Teks lepas <strong>tebal</strong><p>Paragraf</p></div></div>');
  assert.equal(markup, [P('Teks lepas <strong>tebal</strong>'), P('Paragraf')].join('\n\n'));
});

test('paragraf Arab ditandai jm-arab; Arab di paragraf campuran dibungkus span', () => {
  const { markup } = htmlToBlocks('<p>بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p><p>Lafaz اللّٰهُ أَكْبَرُ dibaca keras.</p>');
  assert.match(markup, /^<!-- wp:paragraph \{"className":"jm-arab"\} -->\n<p class="jm-arab"><span lang="ar" dir="rtl">بِسْمِ/);
  assert.match(markup, /<p>Lafaz <span lang="ar" dir="rtl">اللّٰهُ أَكْبَرُ<\/span> dibaca keras\.<\/p>/);
});

test('tabel/iframe jadi block HTML tanpa style/class', () => {
  const { markup } = htmlToBlocks('<table style="width:100%" class="t"><tr><td>1</td></tr></table>');
  assert.equal(markup, '<!-- wp:html -->\n<table><tbody><tr><td>1</td></tr></tbody></table>\n<!-- /wp:html -->');
});
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `node --test tests/unit/to-blocks.test.mjs`
Expected: FAIL dengan `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implementasi**

`tools/sample/lib/to-blocks.mjs`:
```js
import * as cheerio from 'cheerio';

const ARABIC_CHAR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const ARABIC_RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿](?:[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s]*[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])?/g;
const INLINE = new Set(['a', 'strong', 'em', 'br', 'sup', 'sub', 'b', 'i', 'span', 'font', 'u', 'small', 'mark']);
const KEEP = new Set(['strong', 'em', 'sup', 'sub']);
const RENAME = { b: 'strong', i: 'em' };
const SKIP = new Set(['script', 'style', 'noscript', 'ins', 'iframe-placeholder']);

const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escText(s).replace(/"/g, '&quot;');
const stripTags = (s) => s.replace(/<[^>]*>/g, '');

/** Ubah isi .post-text Varient menjadi block markup Gutenberg. */
export function htmlToBlocks(html) {
  const $ = cheerio.load(`<div id="jm-root">${html}</div>`, null, false);
  const out = { blocks: [], images: [] };
  walk($, $('#jm-root').contents().toArray(), out);
  return { markup: out.blocks.join('\n\n'), images: out.images };
}

function walk($, nodes, out) {
  let loose = [];
  const flush = () => {
    if (loose.length) pushParagraph(inlineHtml(loose), out);
    loose = [];
  };
  for (const node of nodes) {
    if (node.type === 'text') { loose.push(node); continue; }
    if (node.type !== 'tag') continue;
    const tag = node.name.toLowerCase();
    if (SKIP.has(tag)) continue;
    if (INLINE.has(tag)) { loose.push(node); continue; }
    flush();
    const el = $(node);
    switch (tag) {
      case 'p':
        pushParagraph(inlineHtml(node.children ?? []), out);
        el.find('img').each((_, img) => pushImage($(img), '', out));
        break;
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
        pushHeading(Math.max(2, Number(tag[1])), inlineHtml(node.children ?? []), out);
        break;
      case 'blockquote': pushQuote($, el, out); break;
      case 'ul': case 'ol': pushList($, el, tag === 'ol', out); break;
      case 'figure': {
        const img = el.find('img').first();
        if (img.length) pushImage(img, el.find('figcaption').first().text().replace(/\s+/g, ' ').trim(), out);
        else pushHtml($, el, out);
        break;
      }
      case 'img': pushImage(el, '', out); break;
      case 'div': case 'section': case 'article': case 'center': case 'header': case 'footer':
        walk($, node.children ?? [], out);
        break;
      case 'hr':
        out.blocks.push('<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->');
        break;
      default: pushHtml($, el, out);
    }
  }
  flush();
}

function inlineHtml(nodes) {
  return nodes.map(cleanInline).join('').replace(/ /g, ' ').replace(/[ \t\r\n]+/g, ' ').trim();
}

function cleanInline(node) {
  if (node.type === 'text') {
    return escText(node.data).replace(ARABIC_RUN, (run) => `<span lang="ar" dir="rtl">${run}</span>`);
  }
  if (node.type !== 'tag') return '';
  const tag = RENAME[node.name] ?? node.name;
  if (tag === 'br') return '<br>';
  if (tag === 'img') return ''; // gambar di paragraf berteks dikeluarkan jadi block image oleh pemanggil
  const inner = (node.children ?? []).map(cleanInline).join('');
  if (tag === 'a') {
    const href = node.attribs?.href ?? '';
    return /^(https?:|mailto:)/i.test(href) ? `<a href="${escAttr(href)}">${inner}</a>` : inner;
  }
  if (KEEP.has(tag)) return stripTags(inner).trim() ? `<${tag}>${inner}</${tag}>` : inner;
  return inner;
}

function pushParagraph(html, out) {
  const text = stripTags(html).replace(/\s+/g, '');
  if (!text) return;
  const arabic = [...text].filter((c) => ARABIC_CHAR.test(c)).length / text.length >= 0.5;
  out.blocks.push(
    arabic
      ? `<!-- wp:paragraph {"className":"jm-arab"} -->\n<p class="jm-arab">${html}</p>\n<!-- /wp:paragraph -->`
      : `<!-- wp:paragraph -->\n<p>${html}</p>\n<!-- /wp:paragraph -->`
  );
}

function pushHeading(level, html, out) {
  if (!stripTags(html).trim()) return;
  const attrs = level === 2 ? '' : ` {"level":${level}}`;
  out.blocks.push(`<!-- wp:heading${attrs} -->\n<h${level} class="wp-block-heading">${html}</h${level}>\n<!-- /wp:heading -->`);
}

function pushQuote($, el, out) {
  const paras = el.find('p').toArray();
  const parts = (paras.length ? paras : [el.get(0)])
    .map((p) => inlineHtml(p.children ?? []))
    .filter((h) => stripTags(h).trim());
  if (!parts.length) return;
  const inner = parts.map((h) => `<!-- wp:paragraph -->\n<p>${h}</p>\n<!-- /wp:paragraph -->`).join('\n\n');
  out.blocks.push(`<!-- wp:quote -->\n<blockquote class="wp-block-quote">${inner}</blockquote>\n<!-- /wp:quote -->`);
}

function pushList($, el, ordered, out) {
  const items = el.children('li').toArray().map((li) => inlineHtml(li.children ?? [])).filter((h) => stripTags(h).trim());
  if (!items.length) return;
  const tag = ordered ? 'ol' : 'ul';
  const attrs = ordered ? ' {"ordered":true}' : '';
  const lis = items.map((h) => `<!-- wp:list-item -->\n<li>${h}</li>\n<!-- /wp:list-item -->`).join('');
  out.blocks.push(`<!-- wp:list${attrs} -->\n<${tag} class="wp-block-list">${lis}</${tag}>\n<!-- /wp:list -->`);
}

function pushImage(img, caption, out) {
  const src = img.attr('data-src') || img.attr('src') || '';
  if (!/^https?:\/\//.test(src)) return;
  out.images.push(src);
  const cap = caption ? `<figcaption class="wp-element-caption">${escText(caption)}</figcaption>` : '';
  out.blocks.push(
    `<!-- wp:image {"sizeSlug":"large"} -->\n<figure class="wp-block-image size-large"><img src="${escAttr(src)}" alt="${escAttr(img.attr('alt') ?? '')}"/>${cap}</figure>\n<!-- /wp:image -->`
  );
}

function pushHtml($, el, out) {
  el.find('*').addBack().removeAttr('style').removeAttr('class');
  const html = $.html(el).trim();
  if (html) out.blocks.push(`<!-- wp:html -->\n${html}\n<!-- /wp:html -->`);
}
```

- [ ] **Step 4: Jalankan sampai lulus**

Run: `node --test tests/unit/to-blocks.test.mjs`
Expected: PASS (11 tes). Kalau tes tabel gagal karena cheerio tidak menambahkan `<tbody>`, ubah ekspektasinya ke output cheerio yang sebenarnya. Perilaku yang wajib tetap: style dan class dibuang.

- [ ] **Step 5: Commit**

```bash
git add tools/sample/lib/to-blocks.mjs tests/unit/to-blocks.test.mjs
git commit -m "feat(sample): konversi HTML Varient ke block Gutenberg"
```

---

### Task 5: Orkestrator fetch + daftar 15 artikel sample

**Files:**
- Create: `tools/sample/articles.txt`, `tools/sample/fetch.mjs`, `tools/sample/lib/media-name.mjs`
- Test: `tests/unit/media-name.test.mjs`

**Interfaces:**
- Consumes: `parseArticlesList`, `parseArticle`, `parseProfile`, `htmlToBlocks` (Task 3–4)
- Produces: `tools/sample/data/posts.json` dengan skema berikut (kontrak dengan importer di Task 6):
```json
{
  "generated_at": "ISO-8601",
  "authors": { "<slug>": { "slug": "", "name": "", "bio": "", "avatar": { "file": "media/<hash>.jpg", "url": "<asal>" } | null } },
  "posts": [ { "slug": "", "title": "", "excerpt": "", "date": "YYYY-MM-DD HH:MM:SS", "category": "<slug kategori>",
               "tags": [""], "author": "<slug penulis>", "content": "<block markup>",
               "inline_images": [ { "url": "<asal>", "file": "media/<hash>.jpg" } ],
               "image": { "file": "", "url": "", "alt": "", "caption": "" } | null,
               "flags": ["sticky"|"pilihan"], "source_url": "" } ]
}
```
- Produces: `mediaName(url: string): string` → `<sha1 16 hex>.<jpg|jpeg|png|webp|gif>` (default `.jpg`)

- [ ] **Step 1: Tulis tes `mediaName` yang masih gagal**

`tests/unit/media-name.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mediaName } from '../../tools/sample/lib/media-name.mjs';

test('nama file deterministik dan mempertahankan ekstensi gambar', () => {
  const a = mediaName('https://jatman.or.id/uploads/images/202610/x.JPG');
  assert.match(a, /^[0-9a-f]{16}\.jpg$/);
  assert.equal(a, mediaName('https://jatman.or.id/uploads/images/202610/x.JPG'));
  assert.notEqual(a, mediaName('https://jatman.or.id/uploads/images/202610/y.JPG'));
  assert.match(mediaName('https://jatman.or.id/a.webp'), /\.webp$/);
  assert.match(mediaName('https://jatman.or.id/tanpa-ekstensi'), /\.jpg$/);
});
```

Run: `node --test tests/unit/media-name.test.mjs` → FAIL (`ERR_MODULE_NOT_FOUND`).

- [ ] **Step 2: Implementasi `media-name.mjs` dan orkestrator**

`tools/sample/lib/media-name.mjs`:
```js
import { createHash } from 'node:crypto';
import path from 'node:path';

/** Nama file lokal yang stabil untuk sebuah URL gambar. */
export function mediaName(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  const safe = /^\.(jpe?g|png|webp|gif)$/.test(ext) ? ext : '.jpg';
  return createHash('sha1').update(url).digest('hex').slice(0, 16) + safe;
}
```

`tools/sample/fetch.mjs`:
```js
#!/usr/bin/env node
/**
 * Ambil artikel sample dari jatman.or.id → tools/sample/data/posts.json + data/media/.
 * Sopan ke server lama: berurutan, jeda 1 detik, HTML di-cache di data/raw/.
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArticlesList } from './lib/articles-list.mjs';
import { parseArticle } from './lib/parse-article.mjs';
import { parseProfile } from './lib/parse-profile.mjs';
import { htmlToBlocks } from './lib/to-blocks.mjs';
import { mediaName } from './lib/media-name.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(ROOT, 'data');
const UA = 'JATMAN-Online-sample-fetch/1.0 (+https://jatman.or.id)';
const DELAY_MS = 1000;

let lastRequest = 0;
const exists = (p) => access(p).then(() => true, () => false);

async function politeFetch(url) {
  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} untuk ${url}`);
  return res;
}

async function cachedHtml(url, name) {
  const file = path.join(DATA, 'raw', `${name}.html`);
  if (await exists(file)) return readFile(file, 'utf8');
  const html = await (await politeFetch(url)).text();
  await writeFile(file, html);
  return html;
}

async function download(url) {
  const name = mediaName(url);
  const file = path.join(DATA, 'media', name);
  if (!(await exists(file))) await writeFile(file, Buffer.from(await (await politeFetch(url)).arrayBuffer()));
  return `media/${name}`;
}

async function main() {
  await mkdir(path.join(DATA, 'raw'), { recursive: true });
  await mkdir(path.join(DATA, 'media'), { recursive: true });
  const list = parseArticlesList(await readFile(path.join(ROOT, 'articles.txt'), 'utf8'));
  const authors = {};
  const posts = [];
  const failures = [];

  for (const item of list) {
    try {
      const art = parseArticle(await cachedHtml(item.url, item.slug), item.url);
      if (art.breadcrumb.length && !art.breadcrumb.some((p) => p.split('/').pop() === item.category)) {
        console.warn(`! ${item.slug}: breadcrumb lama (${art.breadcrumb.join(' > ')}) tidak memuat "${item.category}"; tetap pakai articles.txt`);
      }

      const { markup, images } = htmlToBlocks(art.contentHtml);
      const inlineImages = [];
      for (const src of images) {
        try { inlineImages.push({ url: src, file: await download(src) }); }
        catch (e) { console.warn(`! ${item.slug}: gambar isi gagal (${src}): ${e.message}`); }
      }

      let image = null;
      if (art.image) {
        try { image = { file: await download(art.image.url), url: art.image.url, alt: art.image.alt, caption: art.image.caption }; }
        catch (e) { console.warn(`! ${item.slug}: gambar utama gagal: ${e.message}`); }
      }

      if (!authors[art.author.slug]) {
        let bio = '';
        try {
          const origin = new URL(item.url).origin;
          bio = parseProfile(await cachedHtml(`${origin}/profile/${art.author.slug}`, `profile-${art.author.slug}`)).bio;
        } catch (e) { console.warn(`! profil ${art.author.slug}: ${e.message}`); }
        let avatar = null;
        if (art.author.avatarUrl) {
          try { avatar = { file: await download(art.author.avatarUrl), url: art.author.avatarUrl }; }
          catch (e) { console.warn(`! foto ${art.author.slug}: ${e.message}`); }
        }
        authors[art.author.slug] = { slug: art.author.slug, name: art.author.name, bio, avatar };
      }

      posts.push({
        slug: art.slug, title: art.title, excerpt: art.excerpt, date: art.date, category: item.category,
        tags: art.tags, author: art.author.slug, content: markup, inline_images: inlineImages, image,
        flags: item.flags, source_url: item.url,
      });
      console.log(`✓ ${item.slug}`);
    } catch (e) {
      failures.push({ slug: item.slug, reason: e.message });
      console.error(`✗ ${item.slug}: ${e.message}`);
    }
  }

  await writeFile(path.join(DATA, 'posts.json'), JSON.stringify({ generated_at: new Date().toISOString(), authors, posts }, null, 2));
  console.log(`\n${posts.length} ok, ${failures.length} gagal`);
  for (const f of failures) console.log(`  - ${f.slug}: ${f.reason}`);
  if (!posts.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

`tools/sample/articles.txt`:
```
# <slug-kategori-wp> <url-artikel-lama> [sticky] [pilihan]
# Kategori ditetapkan di sini, bukan ditebak dari breadcrumb lama.
nasional        https://jatman.or.id/perkuat-jejaring-tarekat-global-chairman-inc-ali-masykur-musa-bahas-agenda-strategis-perdamaian-dunia sticky
nasional        https://jatman.or.id/idarah-aliyyah-jatman-launching-logo-harlah-ke-69
nasional        https://jatman.or.id/mursyid-idrisiyyah-bahas-integrasi-tasawuf-dan-ketenangan-spiritual pilihan
daerah          https://jatman.or.id/idarah-aliyyah-jatman-lantik-idarah-wustha-provinsi-riau-masa-khidmat-2025-2030
daerah          https://jatman.or.id/disambut-idarah-wustha-jatman-kalsel-mursyid-idrisiyyah-gelar-majelis-talqin-dzikir-di-banjarmasin
internasional   https://jatman.or.id/ali-masykur-musa-terpilih-aklamasi-memimpin-international-naqshabandi-council pilihan
internasional   https://jatman.or.id/jatman-perkuat-jejaring-naqshabandiyah-dunia-melalui-tiga-mou-di-bukhara
dawuh           https://jatman.or.id/pesan-kh-kafabihi-di-haul-kh-noer-iskandar-majelis-ilmu-sebagai-jalan-menuju-ampunan
hikmah          https://jatman.or.id/cahaya-yang-bersembunyi-di-balik-ikhlas pilihan
hikmah          https://jatman.or.id/rahasia-hidup-aman-dan-diridai-allah-menurut-kh-achmad-chalwani
tokoh           https://jatman.or.id/teladan-guru-sufi-dari-tambakberas-jombang pilihan
artikel         https://jatman.or.id/mukasyafah-menuju-peradaban-fitrah
thariqah        https://jatman.or.id/thariqah-syadziliyyah-ajaran-hingga-perkembangannya
tanya-jawab     https://jatman.or.id/adakah-batasan-usia-untuk-berthariqah pilihan
pustaka-tasawuf https://jatman.or.id/kontroversi-tasawuf-ibnu-arabi-dan-pembelaannya
```

- [ ] **Step 3: Jalankan tes unit sampai lulus**

Run: `npm run test:unit`
Expected: PASS (semua tes unit).

- [ ] **Step 4: Ambil data asli**

Run: `npm run sample:fetch`
Expected: 15 baris `✓ …`, diakhiri `15 ok, 0 gagal`. Kalau ada yang gagal, baca alasannya. Untuk artikel yang sudah dihapus dari web lama (HTTP 404), ganti barisnya dengan artikel lain dari rubrik yang sama, lalu jalankan ulang (yang sudah ter-cache tidak diunduh lagi).

Verifikasi manual cepat:
```bash
node -e "const d=JSON.parse(require('fs').readFileSync('tools/sample/data/posts.json'));console.log(d.posts.length,'post',Object.keys(d.authors).length,'penulis');for(const p of d.posts)console.log(p.category.padEnd(16),p.author.padEnd(24),p.image?'img':'---',p.content.length)"
```
Expected: 15 post. Setiap post punya penulis, isi (`content.length` > 300), dan sebagian besar punya gambar (`img`).

- [ ] **Step 5: Commit** (data di-gitignore lewat `tools/sample/data/`)

```bash
git add tools/sample/articles.txt tools/sample/fetch.mjs tools/sample/lib/media-name.mjs tests/unit/media-name.test.mjs
git commit -m "feat(sample): fetch 15 artikel asli jatman.or.id beserta penulisnya"
```

---

### Task 6: Importer sumber-agnostik + impor sample

**Files:**
- Create: `tools/importer/class-jatman-importer.php`, `tools/sample/import.php`, `tools/sample/reset.php`, `tools/sample/pages.php`
- Create: `tests/fixtures/import/posts.json`
- Test: `tests/php/test-importer.php`, `tests/e2e/import.spec.ts`

**Interfaces:**
- Consumes: `posts.json` (skema Task 5), `jatman_ensure_categories()` (Task 2)
- Produces:
  - `new Jatman_Importer( string $base_dir )`. `$base_dir` adalah folder tempat path `media/...` di JSON diresolve.
  - `->run( array $data ): array` → `[ 'authors' => ['created'=>int,'updated'=>int], 'posts' => [...], 'media' => ['created'=>int,'reused'=>int], 'failed' => string[] ]`
  - `->upsert_author( array ): int`, `->upsert_post( array, int $author_id ): int`, `->import_media( string $file, string $source_url, int $parent = 0, string $alt = '' ): int`, `->upsert_page( array{slug,title,content} ): int`
  - `Jatman_Importer::purge(): array{content:int, authors:int}`. Menghapus semua konten ber-meta `jatman_source_url`/`jatman_sample_page` dan user ber-meta `jatman_imported`.

- [ ] **Step 1: Tulis fixture dan tes PHP yang masih gagal**

`tests/fixtures/import/posts.json`:
```json
{
  "authors": {
    "jt-penulis-a": { "slug": "jt-penulis-a", "name": "Penulis A", "bio": "Bio A", "avatar": { "file": "media/sample.jpg", "url": "https://example.test/avatar-a.jpg" } }
  },
  "posts": [
    {
      "slug": "jt-post-satu", "title": "Post Satu & Dua", "excerpt": "Ringkasan satu.", "date": "2026-10-04 07:33:10",
      "category": "nasional", "tags": ["Harlah", "Jatman"], "author": "jt-penulis-a",
      "content": "<!-- wp:paragraph -->\n<p>Isi dengan <em>miring</em> dan garis miring \\\\ ganda.</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:image {\"sizeSlug\":\"large\"} -->\n<figure class=\"wp-block-image size-large\"><img src=\"https://example.test/isi.jpg\" alt=\"\"/></figure>\n<!-- /wp:image -->",
      "inline_images": [ { "url": "https://example.test/isi.jpg", "file": "media/sample.jpg" } ],
      "image": { "file": "media/sample.jpg", "url": "https://example.test/utama.jpg", "alt": "Alt utama", "caption": "Keterangan foto" },
      "flags": ["sticky", "pilihan"], "source_url": "https://example.test/jt-post-satu"
    },
    {
      "slug": "jt-post-dua", "title": "Post Dua", "excerpt": "", "date": "2026-09-01 10:00:00",
      "category": "dawuh", "tags": [], "author": "jt-penulis-a",
      "content": "<!-- wp:paragraph -->\n<p>Dua.</p>\n<!-- /wp:paragraph -->",
      "inline_images": [], "image": null, "flags": [], "source_url": "https://example.test/jt-post-dua"
    },
    {
      "slug": "jt-post-rusak", "title": "Kategori salah", "excerpt": "", "date": "2026-09-01 10:00:00",
      "category": "tidak-ada", "tags": [], "author": "jt-penulis-a", "content": "",
      "inline_images": [], "image": null, "flags": [], "source_url": "https://example.test/rusak"
    }
  ]
}
```

`tests/php/test-importer.php`:
```php
<?php
require_once ABSPATH . 'tools/importer/class-jatman-importer.php';

Jatman_Importer::purge();
$base       = ABSPATH . 'tests/fixtures/import';
$data       = json_decode( file_get_contents( "$base/posts.json" ), true, 512, JSON_THROW_ON_ERROR );
$count_media = static fn(): int => count( get_posts( [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => -1, 'fields' => 'ids' ] ) );

try {
	$first = ( new Jatman_Importer( $base ) )->run( $data );
	jt_same( 2, $first['posts']['created'], 'dua post valid dibuat' );
	jt_same( 1, count( $first['failed'] ), 'post berkategori tak dikenal dicatat gagal' );
	jt_assert( str_contains( $first['failed'][0] ?? '', 'tidak-ada' ), 'pesan gagal menyebut kategorinya' );

	$post = get_page_by_path( 'jt-post-satu', OBJECT, 'post' );
	jt_assert( $post instanceof WP_Post, 'post ditemukan lewat slug' );
	jt_same( 'Post Satu & Dua', $post->post_title, 'judul apa adanya' );
	jt_same( '2026-10-04 07:33:10', $post->post_date, 'tanggal terbit asli' );
	jt_same( 'Ringkasan satu.', $post->post_excerpt, 'ringkasan' );
	jt_same( [ 'nasional' ], wp_list_pluck( get_the_category( $post->ID ), 'slug' ), 'kategori' );
	jt_same( [ 'Harlah', 'Jatman' ], wp_list_pluck( wp_get_post_tags( $post->ID, [ 'orderby' => 'name' ] ), 'name' ), 'tag' );
	jt_assert( str_contains( $post->post_content, '\\\\' ), 'backslash di isi tidak hilang' );
	jt_assert( ! str_contains( $post->post_content, 'example.test/isi.jpg' ), 'URL gambar isi diganti' );
	jt_assert( str_contains( $post->post_content, '/wp-content/uploads/' ), 'gambar isi menunjuk ke uploads lokal' );

	$thumb = (int) get_post_thumbnail_id( $post );
	jt_assert( $thumb > 0, 'gambar utama terpasang' );
	jt_same( 'Keterangan foto', wp_get_attachment_caption( $thumb ), 'caption gambar utama' );
	jt_same( 'Alt utama', get_post_meta( $thumb, '_wp_attachment_image_alt', true ), 'alt gambar utama' );
	jt_assert( is_sticky( $post->ID ), 'flag sticky' );
	jt_same( '1', get_post_meta( $post->ID, 'jatman_pilihan', true ), 'flag pilihan' );

	$author = get_user_by( 'slug', 'jt-penulis-a' );
	jt_same( 'Penulis A', $author->display_name, 'nama penulis' );
	jt_same( 'Bio A', $author->description, 'bio penulis' );
	jt_assert( (int) get_user_meta( $author->ID, 'jatman_avatar_id', true ) > 0, 'foto penulis' );
	jt_same( $author->ID, (int) $post->post_author, 'post milik penulis' );
	jt_same( 0, (int) get_post_thumbnail_id( get_page_by_path( 'jt-post-dua', OBJECT, 'post' ) ), 'post tanpa gambar tetap masuk' );

	$media_before = $count_media();
	$second       = ( new Jatman_Importer( $base ) )->run( $data );
	jt_same( 0, $second['posts']['created'], 'impor ulang tidak membuat post baru' );
	jt_same( 2, $second['posts']['updated'], 'impor ulang memperbarui post' );
	jt_same( 0, $second['media']['created'], 'impor ulang tidak mengunggah ulang media' );
	jt_same( $media_before, $count_media(), 'jumlah media tetap' );
	jt_same( 1, count( get_users( [ 'meta_key' => 'jatman_imported' ] ) ), 'penulis tidak terduplikasi' );

	$data['posts'][0]['flags'] = [];
	( new Jatman_Importer( $base ) )->run( $data );
	jt_assert( ! is_sticky( $post->ID ), 'sticky dicabut bila flag hilang' );
	jt_same( '', get_post_meta( $post->ID, 'jatman_pilihan', true ), 'pilihan dicabut bila flag hilang' );
} finally {
	Jatman_Importer::purge();
}
jt_assert( null === get_page_by_path( 'jt-post-satu', OBJECT, 'post' ), 'purge menghapus post sample' );
jt_same( 0, count( get_users( [ 'meta_key' => 'jatman_imported' ] ) ), 'purge menghapus penulis sample' );
```

Run: `npm run test:php`
Expected: FAIL. Peringatan `test-importer.php: Error: Failed opening required … class-jatman-importer.php`.

- [ ] **Step 2: Implementasi importer**

`tools/importer/class-jatman-importer.php`:
```php
<?php
/**
 * Importer sumber-agnostik. Menerima data ternormalisasi (format tools/sample/data/posts.json)
 * dan meng-upsert penulis, media, serta post. Dipakai sample sekarang dan migrasi Varient nanti:
 * yang berganti hanya penghasil JSON-nya.
 */

defined( 'ABSPATH' ) || exit;

class Jatman_Importer {

	private string $base_dir;

	/** @var array<string, int> */
	private array $category_ids;

	private array $stats = [
		'authors' => [ 'created' => 0, 'updated' => 0 ],
		'posts'   => [ 'created' => 0, 'updated' => 0 ],
		'media'   => [ 'created' => 0, 'reused' => 0 ],
		'failed'  => [],
	];

	public function __construct( string $base_dir ) {
		$this->base_dir = rtrim( $base_dir, '/' );
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		// Konten berasal dari web lama milik sendiri; jangan disaring kses (wp-cli berjalan tanpa user).
		kses_remove_filters();
		$this->category_ids = jatman_ensure_categories();
	}

	public function run( array $data ): array {
		$author_ids = [];
		foreach ( $data['authors'] ?? [] as $slug => $author ) {
			try {
				$author_ids[ $slug ] = $this->upsert_author( $author );
			} catch ( Throwable $e ) {
				$this->stats['failed'][] = "penulis $slug: " . $e->getMessage();
			}
		}
		foreach ( $data['posts'] ?? [] as $post ) {
			try {
				if ( ! isset( $author_ids[ $post['author'] ] ) ) {
					throw new RuntimeException( "penulis '{$post['author']}' tidak tersedia" );
				}
				$this->upsert_post( $post, $author_ids[ $post['author'] ] );
			} catch ( Throwable $e ) {
				$this->stats['failed'][] = 'post ' . ( $post['slug'] ?? '?' ) . ': ' . $e->getMessage();
			}
		}
		return $this->stats;
	}

	public function upsert_author( array $a ): int {
		$user   = get_user_by( 'slug', $a['slug'] );
		$fields = [ 'display_name' => $a['name'], 'nickname' => $a['name'], 'description' => $a['bio'] ?? '' ];
		if ( $user ) {
			$id = wp_update_user( [ 'ID' => $user->ID ] + $fields );
			$this->stats['authors']['updated']++;
		} else {
			$id = wp_insert_user(
				[
					'user_login'    => $a['slug'],
					'user_nicename' => $a['slug'],
					'user_email'    => $a['slug'] . '@jatman.invalid',
					'user_pass'     => wp_generate_password( 32 ),
					'role'          => 'author',
				] + $fields
			);
			$this->stats['authors']['created']++;
		}
		if ( is_wp_error( $id ) ) {
			throw new RuntimeException( $id->get_error_message() );
		}
		update_user_meta( $id, 'jatman_imported', 1 );
		if ( ! empty( $a['avatar']['file'] ) ) {
			update_user_meta( $id, 'jatman_avatar_id', $this->import_media( $a['avatar']['file'], $a['avatar']['url'], 0, $a['name'] ) );
		}
		return (int) $id;
	}

	public function upsert_post( array $p, int $author_id ): int {
		if ( ! isset( $this->category_ids[ $p['category'] ] ) ) {
			throw new RuntimeException( "kategori '{$p['category']}' tidak dikenal" );
		}
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $p['date'] ?? '' ) ) {
			throw new RuntimeException( "tanggal tidak valid: '" . ( $p['date'] ?? '' ) . "'" );
		}
		$existing = get_posts( [ 'name' => $p['slug'], 'post_type' => 'post', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ] );
		$args     = [
			'post_type'      => 'post',
			'post_status'    => 'publish',
			'post_name'      => $p['slug'],
			'post_title'     => $p['title'],
			'post_excerpt'   => $p['excerpt'] ?? '',
			'post_content'   => $p['content'],
			'post_author'    => $author_id,
			'post_date'      => $p['date'],
			'post_date_gmt'  => get_gmt_from_date( $p['date'] ),
			'post_category'  => [ $this->category_ids[ $p['category'] ] ],
			'tags_input'     => $p['tags'] ?? [],
			'comment_status' => 'closed',
			'ping_status'    => 'closed',
		];
		if ( $existing ) {
			$args['ID'] = (int) $existing[0];
		}
		$id = wp_insert_post( wp_slash( $args ), true );
		if ( is_wp_error( $id ) ) {
			throw new RuntimeException( $id->get_error_message() );
		}
		$this->stats['posts'][ $existing ? 'updated' : 'created' ]++;
		update_post_meta( $id, 'jatman_source_url', $p['source_url'] );

		// Gambar di dalam isi: unggah, lalu ganti URL lama dengan URL lokal.
		$replacements = [];
		foreach ( $p['inline_images'] ?? [] as $img ) {
			$replacements[ $img['url'] ] = wp_get_attachment_url( $this->import_media( $img['file'], $img['url'], $id ) );
		}
		if ( $replacements ) {
			wp_update_post( wp_slash( [ 'ID' => $id, 'post_content' => strtr( $p['content'], $replacements ) ] ) );
		}

		if ( ! empty( $p['image']['file'] ) ) {
			$att = $this->import_media( $p['image']['file'], $p['image']['url'], $id, $p['image']['alt'] ?? '' );
			wp_update_post( [ 'ID' => $att, 'post_excerpt' => $p['image']['caption'] ?? '' ] );
			set_post_thumbnail( $id, $att );
		} else {
			delete_post_thumbnail( $id );
		}

		$flags = $p['flags'] ?? [];
		in_array( 'pilihan', $flags, true ) ? update_post_meta( $id, 'jatman_pilihan', true ) : delete_post_meta( $id, 'jatman_pilihan' );
		in_array( 'sticky', $flags, true ) ? stick_post( $id ) : unstick_post( $id );
		return (int) $id;
	}

	public function import_media( string $file, string $source_url, int $parent = 0, string $alt = '' ): int {
		$existing = get_posts(
			[
				'post_type'   => 'attachment',
				'post_status' => 'inherit',
				'meta_key'    => 'jatman_source_url',
				'meta_value'  => $source_url,
				'fields'      => 'ids',
				'numberposts' => 1,
			]
		);
		if ( $existing ) {
			$this->stats['media']['reused']++;
			return (int) $existing[0];
		}
		$path = $this->base_dir . '/' . ltrim( $file, '/' );
		if ( ! is_readable( $path ) ) {
			throw new RuntimeException( "file media tidak ada: $file" );
		}
		$tmp = wp_tempnam( basename( $path ) );
		copy( $path, $tmp );
		$id = media_handle_sideload( [ 'name' => basename( $path ), 'tmp_name' => $tmp ], $parent );
		if ( is_wp_error( $id ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			throw new RuntimeException( $id->get_error_message() );
		}
		update_post_meta( $id, 'jatman_source_url', $source_url );
		if ( $alt ) {
			update_post_meta( $id, '_wp_attachment_image_alt', $alt );
		}
		$this->stats['media']['created']++;
		return (int) $id;
	}

	/** @param array{slug: string, title: string, content: string} $page */
	public function upsert_page( array $page ): int {
		$existing = get_page_by_path( $page['slug'], OBJECT, 'page' );
		$args     = [
			'post_type'    => 'page',
			'post_status'  => 'publish',
			'post_name'    => $page['slug'],
			'post_title'   => $page['title'],
			'post_content' => $page['content'],
		];
		if ( $existing ) {
			$args['ID'] = $existing->ID;
		}
		$id = wp_insert_post( wp_slash( $args ), true );
		if ( is_wp_error( $id ) ) {
			throw new RuntimeException( $id->get_error_message() );
		}
		update_post_meta( $id, 'jatman_sample_page', 1 );
		return (int) $id;
	}

	/** Hapus semua konten dan penulis hasil impor. */
	public static function purge(): array {
		$ids = get_posts(
			[
				'post_type'   => [ 'post', 'page', 'attachment' ],
				'post_status' => 'any',
				'numberposts' => -1,
				'fields'      => 'ids',
				'meta_query'  => [
					'relation' => 'OR',
					[ 'key' => 'jatman_source_url', 'compare' => 'EXISTS' ],
					[ 'key' => 'jatman_sample_page', 'compare' => 'EXISTS' ],
				],
			]
		);
		foreach ( $ids as $id ) {
			unstick_post( $id );
			'attachment' === get_post_type( $id ) ? wp_delete_attachment( $id, true ) : wp_delete_post( $id, true );
		}
		require_once ABSPATH . 'wp-admin/includes/user.php';
		$users = get_users( [ 'meta_key' => 'jatman_imported', 'fields' => 'ID' ] );
		foreach ( $users as $user_id ) {
			wp_delete_user( (int) $user_id );
		}
		return [ 'content' => count( $ids ), 'authors' => count( $users ) ];
	}
}
```

`tools/sample/pages.php`:
```php
<?php
/**
 * Halaman statis sample. Teks Tentang adalah draf yang perlu ditinjau redaksi.
 *
 * @return array<int, array{slug: string, title: string, content: string}>
 */

$jatman_placeholder = static fn( string $what ): string =>
	"<!-- wp:paragraph -->\n<p>Isi halaman $what akan dipindahkan dari web lama saat migrasi.</p>\n<!-- /wp:paragraph -->";

return [
	[
		'slug'    => 'tentang',
		'title'   => 'Tentang JATMAN',
		'content' => implode(
			"\n\n",
			[
				"<!-- wp:paragraph -->\n<p>Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah (JATMAN) merupakan organisasi keagamaan yang menjadi wadah para pengamal ajaran at-thariqah al-mu’tabarah, sekaligus badan otonom Nahdlatul Ulama.</p>\n<!-- /wp:paragraph -->",
				"<!-- wp:paragraph -->\n<p>JATMAN lahir dari Kongres Alim Ulama Ahli Thariqah di Tegalrejo, Magelang. Berdasarkan kajian Idarah Aliyyah atas manuskrip <em>Risālah Al-Mu’tamar Al-Awwal</em>, Hari Lahir JATMAN ditetapkan pada 13 Oktober 1957.</p>\n<!-- /wp:paragraph -->",
				"<!-- wp:paragraph -->\n<p>JATMAN mengamalkan dan menyebarkan ajaran Ahlussunnah wal Jama’ah dalam syari’ah, thariqah, haqiqah, dan ma’rifah dalam bingkai Negara Kesatuan Republik Indonesia.</p>\n<!-- /wp:paragraph -->",
				"<!-- wp:heading -->\n<h2 class=\"wp-block-heading\">JATMAN Online</h2>\n<!-- /wp:heading -->",
				"<!-- wp:paragraph -->\n<p>JATMAN Online adalah media informasi resmi JATMAN yang dikelola tim LTN JATMAN.</p>\n<!-- /wp:paragraph -->",
			]
		),
	],
	[ 'slug' => 'redaksi', 'title' => 'Redaksi', 'content' => $jatman_placeholder( 'Redaksi' ) ],
	[ 'slug' => 'kontak', 'title' => 'Kontak', 'content' => $jatman_placeholder( 'Kontak' ) ],
	[ 'slug' => 'kirim-tulisan', 'title' => 'Kirim Tulisan', 'content' => $jatman_placeholder( 'Kirim Tulisan' ) ],
];
```

`tools/sample/import.php`:
```php
<?php
/**
 * Impor sample ke WordPress lokal. Jalankan: npm run sample:import (setelah npm run sample:fetch).
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}
require_once ABSPATH . 'tools/importer/class-jatman-importer.php';

$jatman_base = ABSPATH . 'tools/sample/data';
if ( ! is_readable( "$jatman_base/posts.json" ) ) {
	WP_CLI::error( 'tools/sample/data/posts.json belum ada. Jalankan dulu: npm run sample:fetch' );
}
$jatman_data     = json_decode( file_get_contents( "$jatman_base/posts.json" ), true, 512, JSON_THROW_ON_ERROR );
$jatman_importer = new Jatman_Importer( $jatman_base );
$jatman_stats    = $jatman_importer->run( $jatman_data );
foreach ( require ABSPATH . 'tools/sample/pages.php' as $jatman_page ) {
	$jatman_importer->upsert_page( $jatman_page );
}
flush_rewrite_rules( false ); // slug post baru bisa bentrok dengan path kategori

WP_CLI::log( sprintf( 'Penulis: %d dibuat, %d diperbarui', $jatman_stats['authors']['created'], $jatman_stats['authors']['updated'] ) );
WP_CLI::log( sprintf( 'Post: %d dibuat, %d diperbarui', $jatman_stats['posts']['created'], $jatman_stats['posts']['updated'] ) );
WP_CLI::log( sprintf( 'Media: %d diunggah, %d dipakai ulang', $jatman_stats['media']['created'], $jatman_stats['media']['reused'] ) );
foreach ( $jatman_stats['failed'] as $jatman_fail ) {
	WP_CLI::warning( $jatman_fail );
}
WP_CLI::success(
	sprintf(
		'%d post masuk, %d gagal.',
		$jatman_stats['posts']['created'] + $jatman_stats['posts']['updated'],
		count( $jatman_stats['failed'] )
	)
);
```

`tools/sample/reset.php`:
```php
<?php
/**
 * Hapus semua konten & penulis sample. Dipakai oleh npm run sample:reset sebelum impor ulang.
 */

if ( ! defined( 'WP_CLI' ) ) {
	exit;
}
require_once ABSPATH . 'tools/importer/class-jatman-importer.php';

$jatman_purged = Jatman_Importer::purge();
WP_CLI::success( sprintf( '%d konten dan %d penulis sample dihapus.', $jatman_purged['content'], $jatman_purged['authors'] ) );
```

- [ ] **Step 3: Jalankan tes PHP sampai lulus**

Run: `npm run test:php`
Expected: PASS (`Success: NN lulus`).

- [ ] **Step 4: Impor data asli + tes e2e idempotensi**

Run: `npm run sample:import`
Expected: `Post: 15 dibuat, 0 diperbarui`, lalu `Success: 15 post masuk, 0 gagal.`

`tests/e2e/import.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { samplePosts, wpCount } from './helpers';

const counts = () => [
  wpCount('post', 'list', '--post_type=post', '--meta_key=jatman_source_url', '--format=count'),
  wpCount('user', 'list', '--meta_key=jatman_imported', '--format=count'),
  wpCount('post', 'list', '--post_type=attachment', '--post_status=inherit', '--meta_key=jatman_source_url', '--format=count'),
];

test('impor sample idempotent dan lengkap', async () => {
  test.setTimeout(300_000);
  const before = counts();
  expect(before[0]).toBe(samplePosts().length);
  execFileSync('npm', ['run', 'sample:import'], { stdio: 'ignore' });
  expect(counts()).toEqual(before);
});
```

Run: `npx playwright test --project=e2e tests/e2e/import.spec.ts`
Expected: PASS.

- [ ] **Step 5: Lint lalu commit**

Run: `npm run lint:php` → exit 0.
```bash
git add tools/importer tools/sample/import.php tools/sample/reset.php tools/sample/pages.php tests/fixtures/import/posts.json tests/php/test-importer.php tests/e2e/import.spec.ts
git commit -m "feat(importer): importer sumber-agnostik + impor 15 artikel sample"
```

---

### Task 7: Aset brand dan font

**Files:**
- Create: `tools/brand/build.mjs`
- Create: `tools/brand/src/jatman-online-logo.png`, `tools/brand/src/Logo_of_JATMAN.svg` (diunduh)
- Create (hasil build, di-commit): `theme/jatman/assets/img/{knot.svg,favicon.svg,lambang-jatman.svg,pattern.svg}`, `theme/jatman/assets/fonts/*.woff2`
- Test: `tests/unit/brand-assets.test.mjs`

**Interfaces:**
- Produces:
  - `knot.svg`: punya `viewBox`, tanpa `width`/`height`, dan memakai `fill="currentColor"`, jadi warnanya mengikuti CSS `color`.
  - `favicon.svg`: knot berwarna `#00712D`.
  - `lambang-jatman.svg`: lambang JATMAN yang sudah dioptimasi.
  - `pattern.svg`: ubin geometri 80×80 dengan garis `#F7F3EA`.
  - Font: `plus-jakarta-sans-latin{,-ext}-wght-normal.woff2`, `source-serif-4-latin{,-ext}-wght-{normal,italic}.woff2`, `uthman-taha-id-{400,700}.woff2`.

- [ ] **Step 1: Unduh sumber logo**

```bash
mkdir -p tools/brand/src
curl -sL -A "Mozilla/5.0" -o tools/brand/src/jatman-online-logo.png https://jatman.or.id/uploads/logo/logo_64e92c5262e347-65260281.png
curl -sL -A "Mozilla/5.0" -o tools/brand/src/Logo_of_JATMAN.svg https://upload.wikimedia.org/wikipedia/commons/0/02/Logo_of_JATMAN.svg
file tools/brand/src/*
```
Expected: `PNG image data, 1297 x 931` dan `SVG Scalable Vector Graphics image`.

Pastikan font Uthman Taha tersedia: `ls "../uthman-taha/UthmanTN1-ID Ver10.ttf" "../uthman-taha/UthmanTN1B-ID Ver10.ttf"` → kedua file ada. Kalau repo-nya ada di lokasi lain, set `UTHMAN_TAHA_DIR=/path/ke/uthman-taha` saat menjalankan build.

- [ ] **Step 2: Tulis tes aset yang masih gagal**

`tests/unit/brand-assets.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const IMG = 'theme/jatman/assets/img';
const FONTS = 'theme/jatman/assets/fonts';
const svgTag = (svg) => svg.match(/<svg[^>]*>/)[0];

test('knot.svg siap di-inline: viewBox, currentColor, tanpa ukuran tetap, ringan', () => {
  const svg = readFileSync(`${IMG}/knot.svg`, 'utf8');
  assert.match(svgTag(svg), /viewBox="/);
  assert.doesNotMatch(svgTag(svg), /\s(width|height)="/);
  assert.match(svg, /currentColor/);
  assert.ok(svg.length < 40_000, `knot.svg ${svg.length} byte`);
});

test('favicon.svg berwarna hijau brand', () => {
  assert.match(readFileSync(`${IMG}/favicon.svg`, 'utf8'), /#00712D/i);
});

test('lambang-jatman.svg teroptimasi dan punya viewBox', () => {
  const svg = readFileSync(`${IMG}/lambang-jatman.svg`, 'utf8');
  assert.match(svgTag(svg), /viewBox="/);
  assert.ok(svg.length < 200_000, `lambang ${svg.length} byte`);
});

test('pattern.svg ada', () => {
  assert.match(readFileSync(`${IMG}/pattern.svg`, 'utf8'), /<svg/);
});

test('semua font berformat woff2', () => {
  const files = [
    'plus-jakarta-sans-latin-wght-normal.woff2', 'plus-jakarta-sans-latin-ext-wght-normal.woff2',
    'source-serif-4-latin-wght-normal.woff2', 'source-serif-4-latin-ext-wght-normal.woff2',
    'source-serif-4-latin-wght-italic.woff2', 'source-serif-4-latin-ext-wght-italic.woff2',
    'uthman-taha-id-400.woff2', 'uthman-taha-id-700.woff2',
  ];
  for (const f of files) assert.equal(readFileSync(`${FONTS}/${f}`).subarray(0, 4).toString('latin1'), 'wOF2', f);
});
```

Run: `node --test tests/unit/brand-assets.test.mjs`
Expected: FAIL `ENOENT … knot.svg`.

- [ ] **Step 3: Tulis skrip build**

`tools/brand/build.mjs`:
```js
#!/usr/bin/env node
/**
 * Bangun aset brand tema dari sumbernya:
 * - knot.svg (currentColor) + favicon.svg: hasil trace dari logo PNG JATMAN Online
 * - lambang-jatman.svg: SVG Wikimedia yang dioptimasi
 * - pattern.svg: ubin geometri bintang delapan
 * - font woff2: Plus Jakarta Sans & Source Serif 4 (fontsource), Uthman Taha -ID (repo ../uthman-taha)
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import potrace from 'potrace';
import { optimize } from 'svgo';
import wawoff2 from 'wawoff2';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/brand/src');
const IMG = path.join(ROOT, 'theme/jatman/assets/img');
const FONTS = path.join(ROOT, 'theme/jatman/assets/fonts');
const UTHMAN = process.env.UTHMAN_TAHA_DIR ?? path.resolve(ROOT, '../uthman-taha');

async function traceKnot() {
  // Logo 1297×931: knot di atas, wordmark "JATMAN ONLINE" mulai ±y=800. Ambil knot saja.
  const png = await sharp(path.join(SRC, 'jatman-online-logo.png'))
    .extract({ left: 0, top: 0, width: 1297, height: 770 })
    .flatten({ background: '#ffffff' })
    .trim()
    .grayscale()
    .png()
    .toBuffer();
  const raw = await new Promise((resolve, reject) =>
    potrace.trace(png, { threshold: 160, turdSize: 8, optTolerance: 0.3, color: 'currentColor', background: 'transparent' },
      (err, svg) => (err ? reject(err) : resolve(svg)))
  );
  return optimize(raw, { multipass: true, plugins: ['preset-default', 'removeDimensions'] }).data;
}

const PATTERN = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="none" stroke="#F7F3EA" stroke-width="1"><path d="M40 12 68 40 40 68 12 40z"/><path d="M20.2 20.2h39.6v39.6H20.2z"/><circle cx="40" cy="40" r="7"/><path d="M0 0 12 12M80 0 68 12M0 80l12-12M80 80 68 68"/></g></svg>`;

const FONTSOURCE = [
  ['@fontsource-variable/plus-jakarta-sans', 'plus-jakarta-sans-latin-wght-normal.woff2'],
  ['@fontsource-variable/plus-jakarta-sans', 'plus-jakarta-sans-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-wght-italic.woff2'],
  ['@fontsource-variable/source-serif-4', 'source-serif-4-latin-ext-wght-italic.woff2'],
];
const UTHMAN_FILES = [
  ['UthmanTN1-ID Ver10.ttf', 'uthman-taha-id-400.woff2'],
  ['UthmanTN1B-ID Ver10.ttf', 'uthman-taha-id-700.woff2'],
];

async function main() {
  await mkdir(IMG, { recursive: true });
  await mkdir(FONTS, { recursive: true });

  const knot = await traceKnot();
  await writeFile(path.join(IMG, 'knot.svg'), knot);
  await writeFile(path.join(IMG, 'favicon.svg'), knot.replaceAll('currentColor', '#00712D'));

  const lambang = await readFile(path.join(SRC, 'Logo_of_JATMAN.svg'), 'utf8');
  await writeFile(path.join(IMG, 'lambang-jatman.svg'), optimize(lambang, { multipass: true, plugins: ['preset-default'] }).data);
  await writeFile(path.join(IMG, 'pattern.svg'), PATTERN);

  for (const [pkg, file] of FONTSOURCE) {
    await copyFile(path.join(ROOT, 'node_modules', pkg, 'files', file), path.join(FONTS, file));
  }
  for (const [ttf, out] of UTHMAN_FILES) {
    const woff2 = await wawoff2.compress(await readFile(path.join(UTHMAN, ttf)));
    await writeFile(path.join(FONTS, out), Buffer.from(woff2));
  }
  console.log('Aset brand & font selesai dibangun.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

- [ ] **Step 4: Build lalu jalankan tes sampai lulus**

Run: `npm run brand:build && node --test tests/unit/brand-assets.test.mjs`
Expected: `Aset brand & font selesai dibangun.` lalu PASS (5 tes). Kalau `lambang-jatman.svg` > 200 KB, tambahkan `{ name: 'preset-default', params: { overrides: { cleanupNumericValues: { floatPrecision: 1 } } } }` lalu build ulang.

- [ ] **Step 5: Cek visual hasil trace**

Run:
```bash
node --input-type=module -e "import sharp from 'sharp'; import {readFileSync} from 'node:fs'; for (const f of ['knot','favicon','lambang-jatman']) await sharp(Buffer.from(readFileSync('theme/jatman/assets/img/'+f+'.svg','utf8').replaceAll('currentColor','#00712D'))).resize(400).png().toFile('/tmp/jatman-'+f+'.png')"
```
Buka `/tmp/jatman-knot.png`, `/tmp/jatman-favicon.png`, dan `/tmp/jatman-lambang-jatman.png` (pakai Read untuk melihat gambarnya). Expected: knot tampil utuh (empat lengkung dan dua lengkung bawah yang menyapu) dengan tepi halus, tanpa huruf "JATMAN ONLINE". Lambang tampil lengkap dengan bintang, Ka'bah, tali, dan tulisan Arab. Kalau tepi knot bergerigi, turunkan `optTolerance` ke 0.2. Kalau ada bintik, naikkan `turdSize`.

- [ ] **Step 6: Commit**

```bash
git add tools/brand theme/jatman/assets/img theme/jatman/assets/fonts tests/unit/brand-assets.test.mjs
git commit -m "feat(brand): knot SVG hasil trace, lambang JATMAN, pola geometri, dan font self-hosted"
```

---

### Task 8: Fondasi tema (token, font, dark mode, registry block)

**Files:**
- Modify: `theme/jatman/theme.json` (ganti penuh)
- Create: `theme/jatman/inc/setup.php`, `theme/jatman/inc/svg.php`, `theme/jatman/inc/blocks.php`
- Create: `theme/jatman/assets/css/main.css` (bagian 1), `theme/jatman/assets/js/theme.js`, `theme/jatman/assets/js/editor-blocks.js`
- Create: `tests/validate-theme-json.mjs`
- Test: `tests/e2e/theme.spec.ts`

**Interfaces:**
- Produces:
  - CSS custom properties `--wp--preset--color--{brand,on-brand,night,on-night,gold,base,cream,ink,muted,line}`, `--wp--preset--font-family--{sans,serif,arabic}`, `--wp--preset--font-size--{small,medium,content,large,x-large,xx-large}`, `--jm-gutter`, `--jm-wide`, `--jm-radius`, `--jm-radius-sm`, `--jm-shadow`, `--jm-ease`.
  - Kelas utilitas `.jm-wrap`, `.screen-reader-text`.
  - `jatman_inline_svg( string $file, string $class = '' ): string`, file diambil dari `assets/img/`.
  - Setiap folder `theme/jatman/blocks/<nama>/block.json` otomatis terdaftar sebagai `jatman/<nama>` dan mendapat preview ServerSideRender di editor.
  - Atribut `<html data-theme>` (`light`|`dark`).
  - `theme.js` menangani `[data-jm-theme-toggle]` (toggle + `aria-pressed`), `[data-jm-copy]` (salin URL → `.jm-share__status`), dan kelas `.is-condensed` pada `.jm-header` ketika `scrollY > 80`.
  - Ukuran gambar `jatman-hero` (1240×700), `jatman-card` (640×400), `jatman-portrait` (480×600), semuanya crop.
  - Body class `is-teduh` dipasang di artikel atau arsip rubrik teduh.

- [ ] **Step 1: Tulis tes e2e tema yang masih gagal**

`tests/e2e/theme.spec.ts`:
```ts
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
```

Run: `npx playwright test --project=e2e tests/e2e/theme.spec.ts`
Expected: FAIL (tidak ada atribut `data-theme`).

- [ ] **Step 2: Ganti `theme/jatman/theme.json`**

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "appearanceTools": true,
    "layout": { "contentSize": "720px", "wideSize": "1240px" },
    "color": {
      "custom": false,
      "customDuotone": false,
      "customGradient": false,
      "defaultDuotone": false,
      "defaultGradients": false,
      "defaultPalette": false,
      "palette": [
        { "slug": "brand", "name": "Hijau Thariqah", "color": "#00712D" },
        { "slug": "on-brand", "name": "Teks di Hijau Thariqah", "color": "#FFFFFF" },
        { "slug": "night", "name": "Hijau Malam", "color": "#063D27" },
        { "slug": "on-night", "name": "Teks di Hijau Malam", "color": "#F7F3EA" },
        { "slug": "gold", "name": "Emas", "color": "#B8913A" },
        { "slug": "base", "name": "Latar", "color": "#FFFFFF" },
        { "slug": "cream", "name": "Krem", "color": "#F7F3EA" },
        { "slug": "ink", "name": "Teks", "color": "#15201A" },
        { "slug": "muted", "name": "Teks Redup", "color": "#5B6B62" },
        { "slug": "line", "name": "Garis", "color": "#E3E8E4" }
      ]
    },
    "typography": {
      "customFontSize": false,
      "defaultFontSizes": false,
      "dropCap": false,
      "fluid": true,
      "fontFamilies": [
        {
          "slug": "sans",
          "name": "Plus Jakarta Sans",
          "fontFamily": "\"Uthman Taha\", \"Plus Jakarta Sans\", system-ui, sans-serif",
          "fontFace": [
            {
              "fontFamily": "Plus Jakarta Sans", "fontStyle": "normal", "fontWeight": "200 800", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2"],
              "unicodeRange": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
            },
            {
              "fontFamily": "Plus Jakarta Sans", "fontStyle": "normal", "fontWeight": "200 800", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2"],
              "unicodeRange": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"
            }
          ]
        },
        {
          "slug": "serif",
          "name": "Source Serif 4",
          "fontFamily": "\"Uthman Taha\", \"Source Serif 4\", Georgia, serif",
          "fontFace": [
            {
              "fontFamily": "Source Serif 4", "fontStyle": "normal", "fontWeight": "200 900", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/source-serif-4-latin-wght-normal.woff2"],
              "unicodeRange": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
            },
            {
              "fontFamily": "Source Serif 4", "fontStyle": "normal", "fontWeight": "200 900", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/source-serif-4-latin-ext-wght-normal.woff2"],
              "unicodeRange": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"
            },
            {
              "fontFamily": "Source Serif 4", "fontStyle": "italic", "fontWeight": "200 900", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/source-serif-4-latin-wght-italic.woff2"],
              "unicodeRange": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
            },
            {
              "fontFamily": "Source Serif 4", "fontStyle": "italic", "fontWeight": "200 900", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/source-serif-4-latin-ext-wght-italic.woff2"],
              "unicodeRange": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF"
            }
          ]
        },
        {
          "slug": "arabic",
          "name": "Uthman Taha",
          "fontFamily": "\"Uthman Taha\", serif",
          "fontFace": [
            {
              "fontFamily": "Uthman Taha", "fontStyle": "normal", "fontWeight": "400", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/uthman-taha-id-400.woff2"],
              "unicodeRange": "U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F, U+25CC"
            },
            {
              "fontFamily": "Uthman Taha", "fontStyle": "normal", "fontWeight": "700", "fontDisplay": "swap",
              "src": ["file:./assets/fonts/uthman-taha-id-700.woff2"],
              "unicodeRange": "U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F, U+25CC"
            }
          ]
        }
      ],
      "fontSizes": [
        { "slug": "small", "name": "Kecil", "size": "0.875rem", "fluid": false },
        { "slug": "medium", "name": "Sedang", "size": "1rem", "fluid": false },
        { "slug": "content", "name": "Isi artikel", "size": "1.1875rem", "fluid": { "min": "1.0625rem", "max": "1.1875rem" } },
        { "slug": "large", "name": "Besar", "size": "1.25rem", "fluid": { "min": "1.125rem", "max": "1.25rem" } },
        { "slug": "x-large", "name": "Sangat besar", "size": "1.625rem", "fluid": { "min": "1.375rem", "max": "1.625rem" } },
        { "slug": "xx-large", "name": "Judul", "size": "2.5rem", "fluid": { "min": "1.875rem", "max": "2.5rem" } }
      ]
    },
    "spacing": { "units": ["px", "rem", "%", "vw", "vh"] },
    "shadow": { "defaultPresets": false }
  },
  "styles": {
    "color": { "background": "var:preset|color|base", "text": "var:preset|color|ink" },
    "typography": { "fontFamily": "var:preset|font-family|sans", "fontSize": "var:preset|font-size|medium", "lineHeight": "1.6" },
    "spacing": { "blockGap": "1.25rem" },
    "elements": {
      "link": { "color": { "text": "var:preset|color|brand" } },
      "heading": {
        "color": { "text": "var:preset|color|ink" },
        "typography": { "fontFamily": "var:preset|font-family|sans", "fontWeight": "800", "lineHeight": "1.2", "letterSpacing": "-0.01em" }
      },
      "button": {
        "color": { "background": "var:preset|color|brand", "text": "var:preset|color|on-brand" },
        "border": { "radius": "999px" },
        "typography": { "fontWeight": "700" }
      }
    },
    "blocks": {
      "core/post-content": {
        "typography": { "fontFamily": "var:preset|font-family|serif", "fontSize": "var:preset|font-size|content", "lineHeight": "1.75" }
      }
    }
  },
  "templateParts": [
    { "name": "topbar", "title": "Top bar", "area": "header" },
    { "name": "header", "title": "Header", "area": "header" },
    { "name": "footer", "title": "Footer", "area": "footer" }
  ]
}
```

`tests/validate-theme-json.mjs`:
```js
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';

const schema = await (await fetch('https://schemas.wp.org/trunk/theme.json')).json();
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const ok = validate(JSON.parse(readFileSync('theme/jatman/theme.json', 'utf8')));
if (!ok) {
  for (const e of validate.errors) console.error(`${e.instancePath || '/'} ${e.message}`);
  process.exitCode = 1;
} else {
  console.log('theme.json valid');
}
```

- [ ] **Step 3: Tulis PHP tema**

`theme/jatman/inc/setup.php`:
```php
<?php
/**
 * Setup tema: aset, dark mode tanpa kedipan, preload font, ukuran gambar, varian teduh.
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'after_setup_theme',
	static function (): void {
		add_theme_support( 'editor-styles' );
		add_editor_style( 'assets/css/main.css' );
		add_image_size( 'jatman-hero', 1240, 700, true );
		add_image_size( 'jatman-card', 640, 400, true );
		add_image_size( 'jatman-portrait', 480, 600, true );
	}
);

add_action(
	'wp_enqueue_scripts',
	static function (): void {
		$version = wp_get_theme()->get( 'Version' );
		wp_enqueue_style( 'jatman', get_theme_file_uri( 'assets/css/main.css' ), [], $version );
		wp_enqueue_script( 'jatman', get_theme_file_uri( 'assets/js/theme.js' ), [], $version, [ 'strategy' => 'defer', 'in_footer' => true ] );
	}
);

/** Pasang data-theme sebelum body dirender. localStorage bisa diblokir, jadi dibungkus try/catch. */
add_action(
	'wp_head',
	static function (): void {
		wp_print_inline_script_tag(
			"(function(){var s=null;try{s=localStorage.getItem('jatman-theme');}catch(e){}" .
			"var d=s==='dark'||(s!=='light'&&!!window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);" .
			"document.documentElement.setAttribute('data-theme',d?'dark':'light');})();"
		);
	},
	0
);

add_action(
	'wp_head',
	static function (): void {
		foreach ( [ 'plus-jakarta-sans-latin-wght-normal.woff2', 'source-serif-4-latin-wght-normal.woff2' ] as $font ) {
			printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n", esc_url( get_theme_file_uri( 'assets/fonts/' . $font ) ) );
		}
		if ( ! has_site_icon() ) {
			printf( '<link rel="icon" href="%s" type="image/svg+xml">' . "\n", esc_url( get_theme_file_uri( 'assets/img/favicon.svg' ) ) );
		}
	},
	1
);

// Tanpa emoji CDN (s.w.org): tidak boleh ada request ke pihak ketiga.
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
remove_action( 'admin_print_styles', 'print_emoji_styles' );
add_filter(
	'wp_resource_hints',
	static function ( array $urls, string $type ): array {
		if ( 'dns-prefetch' !== $type ) {
			return $urls;
		}
		return array_values( array_filter( $urls, static fn( $u ) => ! str_contains( is_array( $u ) ? ( $u['href'] ?? '' ) : (string) $u, 's.w.org' ) ) );
	},
	10,
	2
);

add_filter(
	'body_class',
	static function ( array $classes ): array {
		if ( function_exists( 'jatman_is_teduh' ) && ( ( is_singular( 'post' ) && jatman_is_teduh( get_queried_object_id() ) ) || ( is_category() && jatman_is_teduh() ) ) ) {
			$classes[] = 'is-teduh';
		}
		return $classes;
	}
);
```

`theme/jatman/inc/svg.php`:
```php
<?php
/**
 * SVG inline dari assets/img (supaya bisa diwarnai lewat CSS currentColor).
 */

defined( 'ABSPATH' ) || exit;

function jatman_inline_svg( string $file, string $class = '' ): string {
	static $cache = [];
	if ( ! isset( $cache[ $file ] ) ) {
		$path           = get_theme_file_path( 'assets/img/' . basename( $file ) );
		$cache[ $file ] = is_readable( $path ) ? (string) file_get_contents( $path ) : '';
	}
	$p = new WP_HTML_Tag_Processor( $cache[ $file ] );
	if ( ! $p->next_tag( 'svg' ) ) {
		return '';
	}
	if ( $class ) {
		$p->add_class( $class );
	}
	$p->set_attribute( 'aria-hidden', 'true' );
	$p->set_attribute( 'focusable', 'false' );
	return $p->get_updated_html();
}
```

`theme/jatman/inc/blocks.php`:
```php
<?php
/**
 * Block dinamis tema: setiap folder blocks/<nama>/block.json didaftarkan otomatis.
 * Di editor ditampilkan lewat ServerSideRender (tanpa build step).
 */

defined( 'ABSPATH' ) || exit;

add_action(
	'init',
	static function (): void {
		$names = [];
		foreach ( glob( get_theme_file_path( 'blocks/*/block.json' ) ) ?: [] as $json ) {
			$type = register_block_type( dirname( $json ) );
			if ( $type ) {
				$names[] = $type->name;
			}
		}
		wp_register_script(
			'jatman-editor-blocks',
			get_theme_file_uri( 'assets/js/editor-blocks.js' ),
			[ 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-server-side-render' ],
			wp_get_theme()->get( 'Version' ),
			true
		);
		wp_add_inline_script( 'jatman-editor-blocks', 'window.jatmanBlocks = ' . wp_json_encode( $names ) . ';', 'before' );
	}
);

add_action(
	'enqueue_block_editor_assets',
	static function (): void {
		wp_enqueue_script( 'jatman-editor-blocks' );
	}
);
```

`theme/jatman/assets/js/editor-blocks.js`:
```js
( function ( wp, names ) {
	const el = wp.element.createElement;
	const ServerSideRender = wp.serverSideRender;
	const { useBlockProps } = wp.blockEditor;
	names.forEach( ( name ) => {
		wp.blocks.registerBlockType( name, {
			edit: ( props ) => el( 'div', useBlockProps(), el( ServerSideRender, { block: name, attributes: props.attributes } ) ),
			save: () => null,
		} );
	} );
} )( window.wp, window.jatmanBlocks || [] );
```

`theme/jatman/assets/js/theme.js`:
```js
( () => {
	const root = document.documentElement;
	const KEY = 'jatman-theme';

	const syncToggles = () => {
		document.querySelectorAll( '[data-jm-theme-toggle]' ).forEach( ( btn ) => {
			btn.setAttribute( 'aria-pressed', String( root.dataset.theme === 'dark' ) );
		} );
	};

	document.addEventListener( 'click', ( event ) => {
		const toggle = event.target.closest( '[data-jm-theme-toggle]' );
		if ( toggle ) {
			const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
			root.dataset.theme = next;
			try {
				localStorage.setItem( KEY, next );
			} catch ( e ) {
				// Penyimpanan diblokir: pilihan hanya berlaku di halaman ini.
			}
			syncToggles();
		}

		const copy = event.target.closest( '[data-jm-copy]' );
		if ( copy && navigator.clipboard ) {
			navigator.clipboard.writeText( copy.dataset.jmCopy ).then( () => {
				const status = copy.closest( '.jm-share' )?.querySelector( '.jm-share__status' );
				if ( status ) status.textContent = 'Tautan disalin';
			}, () => {} );
		}
	} );

	syncToggles();

	// Header mengecil setelah halaman di-scroll.
	const header = document.querySelector( '.jm-header' );
	if ( header ) {
		const onScroll = () => header.classList.toggle( 'is-condensed', window.scrollY > 80 );
		window.addEventListener( 'scroll', onScroll, { passive: true } );
		onScroll();
	}
} )();
```

`theme/jatman/assets/css/main.css` (bagian 1; bagian berikutnya ditambahkan oleh Task 9–12):
```css
/* ==========================================================================
   JATMAN Online — main.css
   Token warna/tipografi dari theme.json (--wp--preset--*). Dark mode menimpa
   token yang sama lewat :root[data-theme="dark"].
   ========================================================================== */

/* == 1. Token & dasar ======================================================= */
:root {
	--jm-gutter: clamp(1rem, 4vw, 2rem);
	--jm-wide: 1240px;
	--jm-radius: 14px;
	--jm-radius-sm: 8px;
	--jm-shadow: 0 1px 2px rgb(6 61 39 / .06), 0 12px 32px -16px rgb(6 61 39 / .22);
	--jm-ease: cubic-bezier(.2, .7, .2, 1);
	color-scheme: light;
}

:root[data-theme="dark"],
:root[data-theme="dark"] body {
	color-scheme: dark;
	--wp--preset--color--brand: #4FBF7F;
	--wp--preset--color--on-brand: #0E1512;
	--wp--preset--color--night: #0A2A1C;
	--wp--preset--color--on-night: #E6ECE8;
	--wp--preset--color--gold: #D9B65C;
	--wp--preset--color--base: #0E1512;
	--wp--preset--color--cream: #16201B;
	--wp--preset--color--ink: #E6ECE8;
	--wp--preset--color--muted: #9DB0A5;
	--wp--preset--color--line: #24312A;
	--jm-shadow: 0 1px 2px rgb(0 0 0 / .4), 0 12px 32px -16px rgb(0 0 0 / .6);
}

html { scroll-padding-top: 6rem; }
body { -webkit-font-smoothing: antialiased; }
.wp-site-blocks { padding: 0; }
.wp-site-blocks > * { margin-block: 0; }
img { height: auto; }
a { text-underline-offset: .18em; text-decoration-thickness: 1px; }
:where(a, button, input, summary):focus-visible {
	outline: 3px solid var(--wp--preset--color--gold);
	outline-offset: 2px;
	border-radius: 4px;
}
.screen-reader-text {
	border: 0; clip-path: inset(50%); height: 1px; margin: -1px; overflow: hidden;
	padding: 0; position: absolute; width: 1px; word-wrap: normal !important;
}
.jm-wrap { width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin-inline: auto; }

/* Teks Arab: Uthman Taha sudah di depan font stack (unicode-range Arab); ini mengatur ukuran & arah. */
[lang="ar"] { font-family: var(--wp--preset--font-family--arabic); font-size: 1.25em; line-height: 1.9; }
[lang="ar"] [lang="ar"] { font-size: inherit; }
p.jm-arab { font-size: 1.45em; line-height: 2.1; text-align: right; }

@media (prefers-reduced-motion: reduce) {
	*, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 4: Jalankan tes sampai lulus**

Run: `npm run lint:theme-json && npx playwright test --project=e2e tests/e2e/theme.spec.ts tests/e2e/smoke.spec.ts`
Expected: `theme.json valid`, lalu PASS untuk semua tes (8 tes).

- [ ] **Step 5: Lint lalu commit**

Run: `npm run lint:php` → exit 0.
```bash
git add theme/jatman tests/e2e/theme.spec.ts tests/validate-theme-json.mjs
git commit -m "feat(theme): token warna & font, dark mode tanpa kedipan, registry block dinamis"
```

---

### Task 9: Top bar, header, navigasi, footer

**Files:**
- Create: `theme/jatman/blocks/brand/{block.json,render.php}`, `blocks/topbar/{block.json,render.php}`, `blocks/theme-toggle/{block.json,render.php}`
- Create: `theme/jatman/parts/topbar.html`, `parts/header.html`, `parts/footer.html`, `theme/jatman/patterns/footer.php`
- Modify: `theme/jatman/templates/index.html` (pasang parts), `theme/jatman/assets/css/main.css` (tambah bagian 2)
- Test: `tests/e2e/chrome.spec.ts`

**Interfaces:**
- Consumes: `jatman_inline_svg()`, `theme.js` (Task 8)
- Produces: block `jatman/brand`, `jatman/topbar`, `jatman/theme-toggle`; template part `topbar`, `header` (wrapper `.jm-header-part`, isi `.jm-header` > `.jm-header__inner`), `footer`; navigasi `.jm-nav`; ikon `.jm-icon--sun`/`.jm-icon--moon`. Setiap template sesudah ini memakai pembuka dan penutup berikut:
```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->
…
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 1: Tulis tes e2e yang masih gagal**

`tests/e2e/chrome.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

const MENU: Record<string, string> = {
  'Tanya Jawab': 'tanya-jawab', 'Pustaka Tasawuf': 'pustaka-tasawuf', Artikel: 'artikel',
  Thariqah: 'thariqah', Dawuh: 'dawuh', Tokoh: 'tokoh', Hikmah: 'hikmah',
};

test('top bar: lambang, penerbit resmi, tanggal Masehi', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.jm-topbar');
  await expect(bar).toContainText('Media resmi');
  await expect(bar.locator('img')).toHaveAttribute('src', /lambang-jatman\.svg$/);
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
  for (const url of ['facebook.com/JATMAN.Online', 'instagram.com/jatman.online', 'tiktok.com/@jatman.online', 'youtube.com/@jatmanonline']) {
    await expect(footer.locator(`a[href*="${url}"]`)).toHaveCount(1);
  }
});
```

Run: `npx playwright test --project=e2e tests/e2e/chrome.spec.ts`
Expected: FAIL (`.jm-topbar` tidak ditemukan).

- [ ] **Step 2: Block brand, topbar, theme-toggle**

`theme/jatman/blocks/brand/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/brand",
  "title": "Logo JATMAN Online",
  "category": "theme",
  "description": "Lockup knot + wordmark JATMAN Online, tertaut ke beranda.",
  "supports": { "html": false },
  "render": "file:./render.php"
}
```

`theme/jatman/blocks/brand/render.php`:
```php
<?php
/** Lockup JATMAN Online: knot (warna mengikuti tema) + wordmark teks. */
?>
<a <?php echo get_block_wrapper_attributes( [ 'class' => 'jm-brand' ] ); ?> href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
	<?php echo jatman_inline_svg( 'knot.svg', 'jm-brand__mark' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
	<span class="jm-brand__word"><span class="jm-brand__jatman">JATMAN</span> <span class="jm-brand__online">Online</span></span>
</a>
```

`theme/jatman/blocks/topbar/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/topbar",
  "title": "Top bar penerbit",
  "category": "theme",
  "description": "Lambang JATMAN, keterangan media resmi, dan tanggal hari ini.",
  "supports": { "html": false },
  "render": "file:./render.php"
}
```

`theme/jatman/blocks/topbar/render.php`:
```php
<?php
/** Pita tipis di atas header: penanda penerbit resmi + tanggal Masehi. */
?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'jm-topbar' ] ); ?>>
	<div class="jm-topbar__inner">
		<a class="jm-topbar__org" href="<?php echo esc_url( home_url( '/tentang/' ) ); ?>">
			<span class="jm-lambang"><img src="<?php echo esc_url( get_theme_file_uri( 'assets/img/lambang-jatman.svg' ) ); ?>" alt="" width="22" height="22"></span>
			<span class="jm-topbar__long">Media resmi Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah</span>
			<span class="jm-topbar__short">Media resmi JATMAN</span>
		</a>
		<time class="jm-topbar__date" datetime="<?php echo esc_attr( wp_date( 'Y-m-d' ) ); ?>"><?php echo esc_html( wp_date( 'l, j F Y' ) ); ?></time>
	</div>
</div>
```

`theme/jatman/blocks/theme-toggle/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/theme-toggle",
  "title": "Tombol mode gelap",
  "category": "theme",
  "supports": { "html": false },
  "render": "file:./render.php"
}
```

`theme/jatman/blocks/theme-toggle/render.php`:
```php
<?php
/** Tombol toggle tema. aria-pressed disinkronkan oleh assets/js/theme.js. */
?>
<button <?php echo get_block_wrapper_attributes( [ 'class' => 'jm-theme-toggle' ] ); ?> type="button" aria-pressed="false" aria-label="Mode gelap" data-jm-theme-toggle>
	<svg class="jm-icon jm-icon--moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.7 14.6A8.5 8.5 0 0 1 9.4 3.3a.7.7 0 0 0-.9-.9 10 10 0 1 0 13.1 13.1.7.7 0 0 0-.9-.9z"/></svg>
	<svg class="jm-icon jm-icon--sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>
</button>
```

- [ ] **Step 3: Template part dan pattern footer**

`theme/jatman/parts/topbar.html`:
```html
<!-- wp:jatman/topbar /-->
```

`theme/jatman/parts/header.html`:
```html
<!-- wp:group {"tagName":"header","className":"jm-header","layout":{"type":"default"}} -->
<header class="wp-block-group jm-header"><!-- wp:group {"className":"jm-header__inner","layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"space-between"}} -->
<div class="wp-block-group jm-header__inner"><!-- wp:jatman/brand /-->

<!-- wp:navigation {"overlayMenu":"mobile","className":"jm-nav","layout":{"type":"flex","justifyContent":"center","flexWrap":"nowrap"}} -->
<!-- wp:navigation-submenu {"label":"Berita","url":"/berita/","kind":"custom"} -->
<!-- wp:navigation-link {"label":"Semua","url":"/berita/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Nasional","url":"/berita/nasional/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Daerah","url":"/berita/daerah/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Internasional","url":"/berita/internasional/","kind":"custom"} /-->
<!-- /wp:navigation-submenu -->
<!-- wp:navigation-link {"label":"Tanya Jawab","url":"/tanya-jawab/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Pustaka Tasawuf","url":"/pustaka-tasawuf/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Artikel","url":"/artikel/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Thariqah","url":"/thariqah/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Dawuh","url":"/dawuh/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Tokoh","url":"/tokoh/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Hikmah","url":"/hikmah/","kind":"custom"} /-->
<!-- /wp:navigation -->

<!-- wp:group {"className":"jm-header__tools","layout":{"type":"flex","flexWrap":"nowrap"}} -->
<div class="wp-block-group jm-header__tools"><!-- wp:search {"label":"Cari","showLabel":false,"placeholder":"Cari berita, dawuh, tokoh…","buttonText":"Cari","buttonPosition":"button-only","buttonUseIcon":true,"isSearchFieldHidden":true} /-->

<!-- wp:jatman/theme-toggle /--></div>
<!-- /wp:group --></div>
<!-- /wp:group --></header>
<!-- /wp:group -->
```

`theme/jatman/parts/footer.html`:
```html
<!-- wp:pattern {"slug":"jatman/footer"} /-->
```

`theme/jatman/patterns/footer.php`:
```php
<?php
/**
 * Title: Footer JATMAN Online
 * Slug: jatman/footer
 * Categories: footer
 * Inserter: no
 */

$jatman_img = static fn( string $file ): string => esc_url( get_theme_file_uri( 'assets/img/' . $file ) );
?>
<!-- wp:group {"className":"jm-footer","layout":{"type":"default"}} -->
<div class="wp-block-group jm-footer"><!-- wp:html -->
<div class="jm-footer__ids">
	<section class="jm-footer__id" aria-labelledby="jm-footer-org">
		<span class="jm-lambang jm-lambang--lg"><img src="<?php echo $jatman_img( 'lambang-jatman.svg' ); ?>" alt="Lambang JATMAN" width="72" height="72" loading="lazy"></span>
		<div>
			<h2 id="jm-footer-org" class="jm-footer__name">Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah</h2>
			<p>Badan otonom Nahdlatul Ulama, wadah para pengamal ajaran at-thariqah al-mu’tabarah.</p>
		</div>
	</section>
	<section class="jm-footer__id" aria-labelledby="jm-footer-media">
		<?php echo jatman_inline_svg( 'knot.svg', 'jm-footer__knot' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		<div>
			<h2 id="jm-footer-media" class="jm-footer__name">JATMAN Online</h2>
			<p>Media informasi resmi JATMAN, dikelola tim LTN JATMAN.</p>
		</div>
	</section>
</div>
<!-- /wp:html -->

<!-- wp:group {"className":"jm-footer__row","layout":{"type":"default"}} -->
<div class="wp-block-group jm-footer__row"><!-- wp:html -->
<nav aria-label="Tautan footer"><ul class="jm-footer__links">
	<li><a href="<?php echo esc_url( home_url( '/tentang/' ) ); ?>">Tentang</a></li>
	<li><a href="<?php echo esc_url( home_url( '/redaksi/' ) ); ?>">Redaksi</a></li>
	<li><a href="<?php echo esc_url( home_url( '/kontak/' ) ); ?>">Kontak</a></li>
	<li><a href="<?php echo esc_url( home_url( '/kirim-tulisan/' ) ); ?>">Kirim Tulisan</a></li>
</ul></nav>
<!-- /wp:html -->

<!-- wp:social-links {"className":"jm-social is-style-logos-only"} -->
<ul class="wp-block-social-links jm-social is-style-logos-only"><!-- wp:social-link {"url":"https://facebook.com/JATMAN.Online","service":"facebook","label":"Facebook JATMAN Online"} /-->

<!-- wp:social-link {"url":"https://instagram.com/jatman.online","service":"instagram","label":"Instagram JATMAN Online"} /-->

<!-- wp:social-link {"url":"https://www.tiktok.com/@jatman.online","service":"tiktok","label":"TikTok JATMAN Online"} /-->

<!-- wp:social-link {"url":"https://www.youtube.com/@jatmanonline","service":"youtube","label":"YouTube JATMAN Online"} /--></ul>
<!-- /wp:social-links --></div>
<!-- /wp:group -->

<!-- wp:paragraph {"className":"jm-footer__copy"} -->
<p class="jm-footer__copy">© <?php echo esc_html( wp_date( 'Y' ) ); ?> JATMAN Online. Seluruh hak dilindungi.</p>
<!-- /wp:paragraph --></div>
<!-- /wp:group -->
```

Ganti `theme/jatman/templates/index.html` (sementara, sampai Task 12):
```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->

<!-- wp:group {"tagName":"main","className":"jm-wrap","layout":{"type":"default"}} -->
<main class="wp-block-group jm-wrap"><!-- wp:query {"query":{"inherit":true}} -->
<div class="wp-block-query"><!-- wp:post-template -->
<!-- wp:post-title {"isLink":true} /-->
<!-- /wp:post-template --></div>
<!-- /wp:query --></main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 4: Tambah CSS bagian 2 ke `main.css`**

```css
/* == 2. Top bar, header, navigasi, footer =================================== */
.jm-topbar { background: var(--wp--preset--color--night); color: var(--wp--preset--color--on-night); font-size: .8125rem; }
.jm-topbar__inner {
	width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin-inline: auto; min-height: 36px;
	display: flex; align-items: center; justify-content: space-between; gap: 1rem;
}
.jm-topbar__org { display: inline-flex; align-items: center; gap: .5rem; color: inherit; text-decoration: none; }
.jm-topbar__org:hover .jm-topbar__long, .jm-topbar__org:hover .jm-topbar__short { text-decoration: underline; }
.jm-topbar__short { display: none; }
.jm-topbar__date { opacity: .85; white-space: nowrap; }
@media (max-width: 720px) { .jm-topbar__long { display: none; } .jm-topbar__short { display: inline; } }

.jm-lambang { display: inline-grid; place-items: center; flex: none; border-radius: 50%; }
.jm-lambang img { display: block; }
.jm-topbar .jm-lambang, .jm-lambang--lg, [data-theme="dark"] .jm-lambang { background: #F7F3EA; padding: 2px; }
.jm-lambang--lg { padding: 4px; }

.jm-header-part { position: sticky; top: var(--wp-admin--admin-bar--height, 0px); z-index: 50; }
.jm-header { background: var(--wp--preset--color--base); border-bottom: 1px solid var(--wp--preset--color--line); transition: box-shadow .25s var(--jm-ease); }
.jm-header.is-condensed { box-shadow: var(--jm-shadow); }
.jm-header__inner {
	width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin-inline: auto;
	min-height: 72px; gap: 1.25rem; transition: min-height .25s var(--jm-ease);
}
.jm-header.is-condensed .jm-header__inner { min-height: 56px; }

.jm-brand { display: inline-flex; align-items: center; gap: .6rem; color: var(--wp--preset--color--ink); text-decoration: none; flex: none; }
.jm-brand__mark { height: 40px; width: auto; color: var(--wp--preset--color--brand); transition: height .25s var(--jm-ease); }
.is-condensed .jm-brand__mark { height: 32px; }
.jm-brand__word { font-size: 1.0625rem; letter-spacing: .06em; text-transform: uppercase; line-height: 1; white-space: nowrap; }
.jm-brand__jatman { font-weight: 800; }
.jm-brand__online { font-weight: 500; color: var(--wp--preset--color--brand); }

.jm-nav { font-weight: 600; font-size: .9375rem; flex: 1 1 auto; }
.jm-nav .wp-block-navigation-item__content { padding: .5rem .2rem; color: var(--wp--preset--color--ink); text-decoration: none; }
.jm-nav .wp-block-navigation-item__content:hover,
.jm-nav .current-menu-item > .wp-block-navigation-item__content { color: var(--wp--preset--color--brand); }
.jm-nav .wp-block-navigation__submenu-container {
	background: var(--wp--preset--color--base) !important; color: var(--wp--preset--color--ink) !important;
	border: 1px solid var(--wp--preset--color--line) !important; border-radius: var(--jm-radius-sm);
	box-shadow: var(--jm-shadow); padding: .375rem; min-width: 12rem !important;
}
.jm-nav .wp-block-navigation__submenu-container .wp-block-navigation-item__content { padding: .5rem .75rem; border-radius: 6px; }
.jm-nav .wp-block-navigation__submenu-container .wp-block-navigation-item__content:hover { background: var(--wp--preset--color--cream); }
.jm-nav .wp-block-navigation__responsive-container-open,
.jm-nav .wp-block-navigation__responsive-container-close {
	width: 40px; height: 40px; place-items: center; border-radius: 50%; color: var(--wp--preset--color--ink);
}
.jm-nav .wp-block-navigation__responsive-container.is-menu-open {
	background: var(--wp--preset--color--base) !important; color: var(--wp--preset--color--ink) !important;
	padding: 1.25rem var(--jm-gutter);
}
.jm-nav .is-menu-open .wp-block-navigation__container { gap: .25rem; font-size: 1.25rem; }
.jm-nav .is-menu-open .wp-block-navigation__submenu-container { border: 0 !important; box-shadow: none; padding: 0 0 0 1rem; background: transparent !important; }
/* Laci menu bawaan aktif sampai 1099px: delapan rubrik tidak muat di tablet. */
@media (max-width: 1099px) {
	.jm-header__inner .jm-nav { order: 3; flex: none; }
}
@media (min-width: 600px) and (max-width: 1099px) {
	.jm-nav .wp-block-navigation__responsive-container-open:not(.always-shown) { display: grid; }
	.jm-nav .wp-block-navigation__responsive-container:not(.hidden-by-default):not(.is-menu-open) { display: none; }
}

.jm-header__tools { gap: .5rem; flex: none; }
.jm-header .wp-block-search__button,
.jm-theme-toggle {
	width: 40px; height: 40px; padding: 0; display: grid; place-items: center; border-radius: 50%;
	border: 1px solid var(--wp--preset--color--line); background: transparent; color: var(--wp--preset--color--ink); cursor: pointer;
}
.jm-header .wp-block-search__button:hover, .jm-theme-toggle:hover { border-color: var(--wp--preset--color--brand); color: var(--wp--preset--color--brand); }
.jm-header .wp-block-search__button svg { fill: currentColor; }
.jm-header .wp-block-search__input { border: 1px solid var(--wp--preset--color--line); border-radius: 999px; background: var(--wp--preset--color--base); color: var(--wp--preset--color--ink); }
.jm-theme-toggle svg { width: 20px; height: 20px; }
.jm-theme-toggle .jm-icon--sun, [data-theme="dark"] .jm-theme-toggle .jm-icon--moon { display: none; }
[data-theme="dark"] .jm-theme-toggle .jm-icon--sun { display: block; }

.jm-footer {
	position: relative; isolation: isolate; overflow: hidden;
	background: var(--wp--preset--color--night); color: var(--wp--preset--color--on-night);
	padding-block: clamp(2.5rem, 6vw, 4rem) 1.5rem; margin-top: clamp(3rem, 8vw, 5rem);
}
.jm-footer::before { content: ""; position: absolute; inset: 0; z-index: -1; background: url(../img/pattern.svg) repeat; background-size: 80px; opacity: .06; }
.jm-footer > * { width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin-inline: auto; }
.jm-footer a { color: inherit; }
.jm-footer__ids {
	display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
	padding-bottom: 2rem; border-bottom: 1px solid rgb(247 243 234 / .15);
}
.jm-footer__id { display: flex; gap: 1rem; align-items: flex-start; }
.jm-footer__name { font-size: 1.0625rem; font-weight: 700; margin: 0 0 .35rem; color: inherit; letter-spacing: 0; }
.jm-footer__id p { margin: 0; opacity: .8; font-size: .9375rem; line-height: 1.6; }
.jm-footer__knot { width: 72px; height: auto; color: #F7F3EA; flex: none; }
.jm-footer__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; padding-block: 1.5rem; }
.jm-footer__links { display: flex; flex-wrap: wrap; gap: .25rem 1.25rem; list-style: none; margin: 0; padding: 0; font-weight: 600; font-size: .9375rem; }
.jm-footer__links a { text-decoration: none; }
.jm-footer__links a:hover { text-decoration: underline; }
.jm-social.wp-block-social-links { gap: .5rem; margin: 0; }
.jm-social .wp-social-link { color: var(--wp--preset--color--on-night) !important; border: 1px solid rgb(247 243 234 / .3); border-radius: 50%; }
.jm-social .wp-social-link a { padding: .55rem; }
.jm-footer__copy { font-size: .8125rem; opacity: .75; margin: 0; }
```

- [ ] **Step 5: Jalankan tes sampai lulus**

Run: `npx playwright test --project=e2e tests/e2e/chrome.spec.ts tests/e2e/theme.spec.ts`
Expected: PASS. Kalau tes laci 768px gagal karena tombol tidak tampil, periksa selector core di `wp-includes/blocks/navigation/style.css` milik versi WP yang terpasang (`npm run wp -- eval "echo ABSPATH;"`), lalu sesuaikan dua selector di media query `600–1099px` supaya tombol buka tampil dan container tertutup di rentang itu.

- [ ] **Step 6: Commit**

```bash
git add theme/jatman tests/e2e/chrome.spec.ts
git commit -m "feat(theme): top bar penerbit, header sticky dengan logo & menu, footer dua identitas"
```

---

### Task 10: Kartu post, block `post-list`, dan beranda

**Files:**
- Create: `theme/jatman/inc/cards.php`, `theme/jatman/inc/post-list.php`
- Create: `theme/jatman/blocks/post-list/{block.json,render.php}`
- Create: `theme/jatman/templates/front-page.html`
- Modify: `theme/jatman/assets/css/main.css` (tambah bagian 3)
- Test: `tests/php/test-post-list.php`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `jatman_categories()`/meta `jatman_pilihan` (Task 2), ukuran gambar (Task 8)
- Produces:
  - `jatman_card( WP_Post $post, string $variant ): string`. Variant: `hero-main|hero-side|list|compact|feature|title|card|portrait|qa`.
  - `jatman_card_meta( WP_Post $post ): string`
  - `jatman_primary_category( WP_Post $post ): ?WP_Term` (kategori terdalam)
  - `jatman_reading_time( WP_Post $post ): int` (menit, minimal 1, 200 kata/menit)
  - `jatman_render_post_list( array $attributes ): string`. Atribut: `layout` (`hero|list|compact|regions|quote|cards|portrait|qa|related`), `category` (slug; dipisah koma = gabungan), `count`, `pilihan`, `title`, `moreLabel`, `band` (`''|cream|night`), `dedupe`. Mengembalikan `''` kalau tidak ada post.
  - `jatman_seen_ids( array $add = [] ): array` (state di `$GLOBALS['jatman_seen']`)
  - Kelas `.jm-section.jm-section--<layout>`, `.jm-section__title`, `.jm-hero__main`, `.jm-card`, `.jm-label`, `.jm-meta`.

- [ ] **Step 1: Tulis tes PHP yang masih gagal**

`tests/php/test-post-list.php`:
```php
<?php
jatman_ensure_categories();
$jt_cat  = static fn( string $slug ): int => (int) get_term_by( 'slug', $slug, 'category' )->term_id;
$jt_ids  = [];
$jt_make = static function ( string $title, array $cats, string $date, string $excerpt = '' ) use ( $jt_cat, &$jt_ids ): int {
	$id = wp_insert_post( [
		'post_title'    => $title,
		'post_status'   => 'publish',
		'post_content'  => '<!-- wp:paragraph --><p>Isi singkat.</p><!-- /wp:paragraph -->',
		'post_excerpt'  => $excerpt,
		'post_date'     => $date,
		'post_category' => array_map( $jt_cat, $cats ),
	] );
	$jt_ids[] = $id;
	return $id;
};

try {
	$GLOBALS['jatman_seen'] = [];
	jt_same( '', jatman_render_post_list( [ 'layout' => 'cards', 'category' => 'hikmah', 'title' => 'Hikmah' ] ), 'rubrik kosong tidak dirender sama sekali' );

	$a = $jt_make( "Jam'iyyah & Thariqah", [ 'berita', 'nasional' ], '2026-10-05 08:00:00', 'Ringkasan "kutip" & dan' );
	$b = $jt_make( 'Kabar Daerah', [ 'daerah' ], '2026-10-04 08:00:00' );
	$c = $jt_make( 'Hikmah Pagi', [ 'hikmah' ], '2026-10-03 08:00:00' );
	$d = $jt_make( 'Dawuh Kiai', [ 'dawuh' ], '2026-10-02 08:00:00', 'Ilmu itu cahaya.' );
	stick_post( $b );

	$GLOBALS['jatman_seen'] = [];
	$hero      = jatman_render_post_list( [ 'layout' => 'hero' ] );
	$hero_main = explode( 'jm-hero__side', explode( 'jm-hero__main', $hero )[1] ?? '' )[0];
	jt_assert( str_contains( $hero_main, 'Kabar Daerah' ), 'post sticky jadi berita utama hero' );
	jt_assert( str_contains( $hero, 'Jam&#8217;iyyah &#038; Thariqah' ), 'judul dengan apostrof & ampersand ter-escape sekali' );
	jt_assert( ! str_contains( $hero, '&amp;amp;' ) && ! str_contains( $hero, '&amp;#' ), 'tidak ada escape ganda' );

	$latest = jatman_render_post_list( [ 'layout' => 'list', 'count' => 8, 'dedupe' => true, 'title' => 'Terbaru' ] );
	foreach ( [ 'Kabar Daerah', 'Hikmah Pagi', 'Dawuh Kiai' ] as $t ) {
		jt_assert( ! str_contains( $latest, $t ), "Terbaru tidak mengulang '$t' dari hero" );
	}

	update_post_meta( $c, 'jatman_pilihan', true );
	$pilihan = jatman_render_post_list( [ 'layout' => 'compact', 'pilihan' => true, 'count' => 5, 'title' => 'Pilihan Redaksi' ] );
	jt_assert( str_contains( $pilihan, 'Hikmah Pagi' ) && ! str_contains( $pilihan, 'Kabar Daerah' ), 'Pilihan Redaksi hanya post bertanda' );

	$cards = jatman_render_post_list( [ 'layout' => 'cards', 'category' => 'hikmah,dawuh', 'count' => 4, 'title' => 'Hikmah' ] );
	jt_assert( str_contains( $cards, 'Hikmah Pagi' ) && str_contains( $cards, 'Dawuh Kiai' ), 'kategori dipisah koma = gabungan' );
	jt_assert( ! str_contains( $cards, 'jm-card__media' ), 'post tanpa gambar utama tidak merender wadah gambar' );

	$quote = jatman_render_post_list( [ 'layout' => 'quote', 'category' => 'dawuh', 'count' => 1, 'title' => 'Dawuh', 'band' => 'cream' ] );
	jt_assert( str_contains( $quote, 'Ilmu itu cahaya.' ) && str_contains( $quote, 'jm-band--cream' ), 'kutipan Dawuh dari ringkasan, di pita krem' );
	jt_assert( str_contains( $quote, 'Lihat semua<span class="screen-reader-text"> Dawuh</span>' ), 'tautan Lihat semua punya nama yang jelas' );

	$regions = jatman_render_post_list( [ 'layout' => 'regions', 'category' => 'nasional,daerah,internasional', 'count' => 4, 'title' => 'Berita' ] );
	jt_assert( str_contains( $regions, '>Nasional<' ) && str_contains( $regions, '>Daerah<' ), 'kolom wilayah berisi tampil' );
	jt_assert( ! str_contains( $regions, '>Internasional<' ), 'kolom wilayah kosong tidak dirender' );

	jt_same( 'nasional', jatman_primary_category( get_post( $a ) )->slug, 'kategori utama = anak terdalam' );
	jt_same( 1, jatman_reading_time( get_post( $a ) ), 'waktu baca minimal 1 menit' );
	$long     = $jt_make( 'Panjang', [ 'artikel' ], '2026-01-01 08:00:00' );
	wp_update_post( [ 'ID' => $long, 'post_content' => str_repeat( 'kata ', 450 ) ] );
	jt_same( 3, jatman_reading_time( get_post( $long ) ), '450 kata = 3 menit' );
} finally {
	foreach ( $jt_ids as $id ) {
		unstick_post( $id );
		wp_delete_post( $id, true );
	}
}
```

Run: `npm run test:php`
Expected: FAIL. Peringatan `test-post-list.php: Error: Call to undefined function jatman_render_post_list()`.

- [ ] **Step 2: Implementasi kartu dan post-list**

`theme/jatman/inc/cards.php`:
```php
<?php
/**
 * Kartu post yang dipakai di semua daftar. Judul/ringkasan di-escape sekali (esc_html tidak
 * meng-encode ulang entitas hasil wptexturize).
 */

defined( 'ABSPATH' ) || exit;

/** Kategori terdalam milik post, mis. "Nasional" (bukan "Berita"). */
function jatman_primary_category( WP_Post $post ): ?WP_Term {
	$cats = get_the_category( $post->ID );
	if ( ! $cats ) {
		return null;
	}
	usort( $cats, static fn( WP_Term $x, WP_Term $y ): int => count( get_ancestors( $y->term_id, 'category' ) ) <=> count( get_ancestors( $x->term_id, 'category' ) ) );
	return $cats[0];
}

/** Perkiraan waktu baca dalam menit (200 kata/menit, minimal 1). */
function jatman_reading_time( WP_Post $post ): int {
	$text  = wp_strip_all_tags( strip_shortcodes( $post->post_content ) );
	$words = preg_split( '/\s+/u', trim( $text ), -1, PREG_SPLIT_NO_EMPTY ) ?: [];
	return max( 1, (int) ceil( count( $words ) / 200 ) );
}

function jatman_card_meta( WP_Post $post ): string {
	return sprintf(
		'<p class="jm-meta"><span class="jm-meta__author">%s</span><time datetime="%s">%s</time></p>',
		esc_html( get_the_author_meta( 'display_name', (int) $post->post_author ) ),
		esc_attr( get_the_date( 'c', $post ) ),
		esc_html( get_the_date( 'j M Y', $post ) )
	);
}

function jatman_card( WP_Post $post, string $variant ): string {
	$url      = get_permalink( $post );
	$with_img = in_array( $variant, [ 'hero-main', 'hero-side', 'list', 'feature', 'card', 'portrait' ], true ) && has_post_thumbnail( $post );
	$size     = [ 'hero-main' => 'jatman-hero', 'portrait' => 'jatman-portrait' ][ $variant ] ?? 'jatman-card';
	$heading  = match ( $variant ) {
		'hero-main'        => 'h2',
		'feature', 'title' => 'h4',
		default            => 'h3',
	};
	$cat      = in_array( $variant, [ 'hero-main', 'hero-side', 'list', 'card' ], true ) ? jatman_primary_category( $post ) : null;
	$excerpt  = in_array( $variant, [ 'hero-main', 'list', 'feature' ], true )
		? wp_trim_words( get_the_excerpt( $post ), 'hero-main' === $variant ? 40 : 22 )
		: '';
	$eager    = 'hero-main' === $variant;

	$html = '<article class="jm-card jm-card--' . esc_attr( $variant ) . '">';
	if ( $with_img ) {
		$html .= sprintf(
			'<a class="jm-card__media" href="%s" tabindex="-1" aria-hidden="true">%s</a>',
			esc_url( $url ),
			get_the_post_thumbnail(
				$post,
				$size,
				[
					'alt'           => '',
					'loading'       => $eager ? 'eager' : 'lazy',
					'fetchpriority' => $eager ? 'high' : 'auto',
					'decoding'      => 'async',
				]
			)
		);
	}
	$html .= '<div class="jm-card__body">';
	if ( 'qa' === $variant ) {
		$html .= '<span class="jm-label jm-label--qa">Tanya</span>';
	}
	if ( $cat ) {
		$html .= sprintf( '<a class="jm-label" href="%s">%s</a>', esc_url( get_term_link( $cat ) ), esc_html( $cat->name ) );
	}
	$html .= sprintf( '<%1$s class="jm-card__title"><a href="%2$s">%3$s</a></%1$s>', $heading, esc_url( $url ), esc_html( get_the_title( $post ) ) );
	if ( $excerpt ) {
		$html .= '<p class="jm-card__excerpt">' . esc_html( $excerpt ) . '</p>';
	}
	if ( ! in_array( $variant, [ 'qa', 'title' ], true ) ) {
		$html .= jatman_card_meta( $post );
	}
	return $html . '</div></article>';
}
```

`theme/jatman/inc/post-list.php`:
```php
<?php
/**
 * Bagian daftar post (beranda, artikel terkait, 404). Kategori lewat slug, bukan ID, supaya
 * template tetap benar setelah migrasi.
 */

defined( 'ABSPATH' ) || exit;

/** ID post yang sudah tampil di halaman ini (dipakai bagian ber-dedupe). */
function jatman_seen_ids( array $add = [] ): array {
	$GLOBALS['jatman_seen'] = array_values( array_unique( array_merge( $GLOBALS['jatman_seen'] ?? [], array_map( 'intval', $add ) ) ) );
	return $GLOBALS['jatman_seen'];
}

function jatman_post_list_defaults(): array {
	return [
		'layout'    => 'list',
		'category'  => '',
		'count'     => 6,
		'pilihan'   => false,
		'title'     => '',
		'moreLabel' => 'Lihat semua',
		'band'      => '',
		'dedupe'    => false,
	];
}

/** @return WP_Post[] */
function jatman_query_posts( array $a, array $exclude = [] ): array {
	$args = [
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'posts_per_page'      => max( 1, (int) $a['count'] ),
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
		'post__not_in'        => array_values( array_filter( array_merge( $a['dedupe'] ? jatman_seen_ids() : [], $exclude ) ) ),
	];
	if ( '' !== $a['category'] ) {
		$args['category_name'] = $a['category'];
	}
	if ( $a['pilihan'] ) {
		$args['meta_query'] = [ [ 'key' => 'jatman_pilihan', 'value' => '1' ] ];
	}
	return get_posts( $args );
}

function jatman_render_post_list( array $attributes ): string {
	$a = wp_parse_args( $attributes, jatman_post_list_defaults() );
	[ $html, $posts ] = match ( $a['layout'] ) {
		'hero'    => jatman_layout_hero( $a ),
		'regions' => jatman_layout_regions( $a ),
		'related' => jatman_layout_related( $a ),
		default   => jatman_layout_simple( $a ),
	};
	jatman_seen_ids( wp_list_pluck( $posts, 'ID' ) );
	return jatman_section( $html, $a );
}

function jatman_section( string $inner, array $a ): string {
	if ( '' === $inner ) {
		return '';
	}
	$more = '';
	if ( $a['title'] && $a['category'] && ! str_contains( $a['category'], ',' ) && 'related' !== $a['layout'] ) {
		$term = get_term_by( 'slug', $a['category'], 'category' );
		if ( $term ) {
			$more = sprintf(
				'<a class="jm-section__more" href="%s">%s<span class="screen-reader-text"> %s</span><span aria-hidden="true"> →</span></a>',
				esc_url( get_term_link( $term ) ),
				esc_html( $a['moreLabel'] ),
				esc_html( $a['title'] )
			);
		}
	}
	$head = $a['title'] ? sprintf( '<header class="jm-section__head"><h2 class="jm-section__title">%s</h2>%s</header>', esc_html( $a['title'] ), $more ) : '';
	$band = in_array( $a['band'], [ 'cream', 'night' ], true ) ? ' jm-band jm-band--' . $a['band'] : '';
	return sprintf(
		'<section class="jm-section jm-section--%s%s"><div class="jm-section__inner">%s%s</div></section>',
		esc_attr( $a['layout'] ),
		$band,
		$head,
		$inner
	);
}

/** @return array{0: string, 1: WP_Post[]} */
function jatman_layout_simple( array $a ): array {
	$posts = jatman_query_posts( $a );
	if ( ! $posts ) {
		return [ '', [] ];
	}
	$cards = static fn( string $variant, bool $li = false ): string => implode(
		'',
		array_map( static fn( WP_Post $p ): string => $li ? '<li>' . jatman_card( $p, $variant ) . '</li>' : jatman_card( $p, $variant ), $posts )
	);
	$html = match ( $a['layout'] ) {
		'compact'  => '<ol class="jm-compact">' . $cards( 'compact', true ) . '</ol>',
		'qa'       => '<ul class="jm-qa">' . $cards( 'qa', true ) . '</ul>',
		'cards'    => '<div class="jm-cards">' . $cards( 'card' ) . '</div>',
		'portrait' => '<div class="jm-portraits">' . $cards( 'portrait' ) . '</div>',
		'quote'    => jatman_dawuh_quote( $posts[0] ),
		default    => '<div class="jm-list">' . $cards( 'list' ) . '</div>',
	};
	return [ $html, 'quote' === $a['layout'] ? [ $posts[0] ] : $posts ];
}

/** Berita utama = post sticky terbaru (kalau ada), lalu 4 berita terbaru di dua kolom pendamping. */
function jatman_layout_hero( array $a ): array {
	$sticky = array_map( 'intval', (array) get_option( 'sticky_posts', [] ) );
	$main   = $sticky ? get_posts( [ 'post__in' => $sticky, 'posts_per_page' => 1, 'ignore_sticky_posts' => true, 'post_status' => 'publish', 'no_found_rows' => true ] ) : [];
	$rest   = jatman_query_posts( [ 'count' => $main ? 4 : 5, 'dedupe' => false, 'pilihan' => false ] + $a, wp_list_pluck( $main, 'ID' ) );
	$posts  = array_merge( $main, $rest );
	if ( ! $posts ) {
		return [ '', [] ];
	}
	$side = static fn( array $ps, string $mod ): string => $ps
		? '<div class="jm-hero__side jm-hero__side--' . $mod . '">' . implode( '', array_map( static fn( WP_Post $p ): string => jatman_card( $p, 'hero-side' ), $ps ) ) . '</div>'
		: '';
	$html = '<div class="jm-hero"><div class="jm-hero__main">' . jatman_card( $posts[0], 'hero-main' ) . '</div>'
		. $side( array_slice( $posts, 1, 2 ), 'left' )
		. $side( array_slice( $posts, 3, 2 ), 'right' )
		. '</div>';
	return [ $html, $posts ];
}

/** Satu kolom per kategori (Nasional/Daerah/Internasional); kolom kosong dilewati. */
function jatman_layout_regions( array $a ): array {
	$columns = '';
	$all     = [];
	foreach ( array_filter( array_map( 'trim', explode( ',', $a['category'] ) ) ) as $slug ) {
		$term  = get_term_by( 'slug', $slug, 'category' );
		$posts = $term ? jatman_query_posts( [ 'category' => $slug ] + $a ) : [];
		if ( ! $posts ) {
			continue;
		}
		$all     = array_merge( $all, $posts );
		$titles  = implode( '', array_map( static fn( WP_Post $p ): string => '<li>' . jatman_card( $p, 'title' ) . '</li>', array_slice( $posts, 1 ) ) );
		$columns .= sprintf(
			'<div class="jm-region"><h3 class="jm-region__title"><a href="%s">%s</a></h3>%s%s</div>',
			esc_url( get_term_link( $term ) ),
			esc_html( $term->name ),
			jatman_card( $posts[0], 'feature' ),
			$titles ? '<ul class="jm-region__list">' . $titles . '</ul>' : ''
		);
	}
	return [ $columns ? '<div class="jm-regions">' . $columns . '</div>' : '', $all ];
}

/** Artikel terkait: rubrik yang sama dengan artikel yang sedang dibuka, kecuali dirinya. */
function jatman_layout_related( array $a ): array {
	$current = get_queried_object_id();
	$post    = $current ? get_post( $current ) : null;
	$cat     = $post ? jatman_primary_category( $post ) : null;
	if ( ! $cat ) {
		return [ '', [] ];
	}
	$posts = jatman_query_posts( [ 'category' => $cat->slug, 'dedupe' => false ] + $a, [ $current ] );
	$html  = $posts ? '<div class="jm-cards jm-cards--related">' . implode( '', array_map( static fn( WP_Post $p ): string => jatman_card( $p, 'card' ), $posts ) ) . '</div>' : '';
	return [ $html, $posts ];
}

function jatman_dawuh_quote( WP_Post $post ): string {
	$text = has_excerpt( $post ) ? $post->post_excerpt : wp_trim_words( get_the_excerpt( $post ), 45 );
	return sprintf(
		'<figure class="jm-dawuh"><blockquote class="jm-dawuh__text"><p>%s</p></blockquote><figcaption class="jm-dawuh__cite"><a href="%s">%s</a><span>%s</span></figcaption></figure>',
		esc_html( wp_strip_all_tags( $text ) ),
		esc_url( get_permalink( $post ) ),
		esc_html( get_the_title( $post ) ),
		esc_html( get_the_author_meta( 'display_name', (int) $post->post_author ) )
	);
}
```

`theme/jatman/blocks/post-list/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/post-list",
  "title": "Daftar post JATMAN",
  "category": "theme",
  "description": "Bagian daftar post: hero, terbaru, pilihan redaksi, wilayah, dawuh, kartu, tokoh, tanya jawab, terkait.",
  "attributes": {
    "layout": { "type": "string", "default": "list", "enum": ["hero", "list", "compact", "regions", "quote", "cards", "portrait", "qa", "related"] },
    "category": { "type": "string", "default": "" },
    "count": { "type": "integer", "default": 6 },
    "pilihan": { "type": "boolean", "default": false },
    "title": { "type": "string", "default": "" },
    "moreLabel": { "type": "string", "default": "Lihat semua" },
    "band": { "type": "string", "default": "", "enum": ["", "cream", "night"] },
    "dedupe": { "type": "boolean", "default": false }
  },
  "supports": { "html": false },
  "render": "file:./render.php"
}
```

`theme/jatman/blocks/post-list/render.php`:
```php
<?php
/** @var array $attributes */
echo jatman_render_post_list( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput -- di-escape di dalam fungsi.
```

`theme/jatman/templates/front-page.html`:
```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->

<!-- wp:group {"tagName":"main","className":"jm-home","layout":{"type":"default"}} -->
<main class="wp-block-group jm-home"><!-- wp:heading {"level":1,"className":"screen-reader-text"} -->
<h1 class="wp-block-heading screen-reader-text">JATMAN Online</h1>
<!-- /wp:heading -->

<!-- wp:jatman/post-list {"layout":"hero"} /-->

<!-- wp:group {"className":"jm-split","layout":{"type":"default"}} -->
<div class="wp-block-group jm-split"><!-- wp:jatman/post-list {"layout":"list","count":8,"title":"Terbaru","dedupe":true} /-->

<!-- wp:jatman/post-list {"layout":"compact","count":5,"pilihan":true,"title":"Pilihan Redaksi"} /--></div>
<!-- /wp:group -->

<!-- wp:jatman/post-list {"layout":"regions","category":"nasional,daerah,internasional","count":4,"title":"Berita"} /-->

<!-- wp:jatman/post-list {"layout":"quote","category":"dawuh","count":1,"title":"Dawuh","band":"cream"} /-->

<!-- wp:jatman/post-list {"layout":"cards","category":"hikmah,pustaka-tasawuf","count":4,"title":"Hikmah & Pustaka Tasawuf","band":"night"} /-->

<!-- wp:jatman/post-list {"layout":"portrait","category":"tokoh","count":4,"title":"Tokoh"} /-->

<!-- wp:jatman/post-list {"layout":"qa","category":"tanya-jawab","count":4,"title":"Tanya Jawab"} /--></main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 3: Tambah CSS bagian 3 ke `main.css`**

```css
/* == 3. Kartu, bagian beranda, pita ========================================= */
.jm-label {
	display: inline-block; padding: .4em .6em; border-radius: 4px; text-decoration: none;
	font: 700 .6875rem/1 var(--wp--preset--font-family--sans); letter-spacing: .08em; text-transform: uppercase;
	background: var(--wp--preset--color--brand); color: var(--wp--preset--color--on-brand);
}
.jm-label:hover { filter: brightness(1.08); }
.jm-label--qa { background: var(--wp--preset--color--gold); color: #1D1606; }
.jm-meta { display: flex; flex-wrap: wrap; gap: .25rem .5rem; margin: 0; font-size: .8125rem; color: var(--wp--preset--color--muted); }
.jm-meta__author { font-weight: 600; color: var(--wp--preset--color--ink); }
.jm-meta time::before { content: "·"; margin-right: .5rem; }

.jm-card { display: grid; gap: .875rem; align-content: start; }
.jm-card__media { display: block; overflow: hidden; border-radius: var(--jm-radius-sm); background: var(--wp--preset--color--cream); aspect-ratio: 3 / 2; }
.jm-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s var(--jm-ease); }
.jm-card:hover .jm-card__media img { transform: scale(1.03); }
.jm-card__body { display: grid; gap: .5rem; align-content: start; justify-items: start; }
.jm-card__title { margin: 0; font-size: 1.0625rem; font-weight: 700; line-height: 1.35; letter-spacing: -.005em; }
.jm-card__title a {
	color: var(--wp--preset--color--ink); text-decoration: none;
	background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat; transition: background-size .3s var(--jm-ease);
}
.jm-card__title a:hover { color: var(--wp--preset--color--brand); background-size: 100% 1px; }
.jm-card__excerpt { margin: 0; color: var(--wp--preset--color--muted); font-size: .9375rem; line-height: 1.6; }

.jm-section { padding-block: clamp(2rem, 5vw, 3.5rem); }
.jm-section__inner { width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin-inline: auto; }
.jm-section__head {
	display: flex; align-items: baseline; justify-content: space-between; gap: 1rem;
	margin-bottom: 1.5rem; padding-bottom: .75rem; border-bottom: 1px solid var(--wp--preset--color--line);
}
.jm-section__title { margin: 0; font-size: clamp(1.25rem, 1rem + 1vw, 1.625rem); font-weight: 800; display: flex; align-items: center; gap: .6rem; }
.jm-section__title::before { content: ""; width: 4px; height: 1em; border-radius: 2px; background: var(--wp--preset--color--brand); }
.jm-section__more { font-size: .875rem; font-weight: 600; color: var(--wp--preset--color--brand); text-decoration: none; white-space: nowrap; }
.jm-section__more:hover { text-decoration: underline; }

.jm-section--hero { padding-top: clamp(1.25rem, 3vw, 2rem); }
.jm-hero { display: grid; gap: 1.5rem; }
.jm-hero__side { display: grid; gap: 1.5rem; align-content: start; }
.jm-card--hero-main .jm-card__media { aspect-ratio: 16 / 10; border-radius: var(--jm-radius); }
.jm-card--hero-main .jm-card__title { font-size: clamp(1.625rem, 1.1rem + 2.2vw, 2.5rem); font-weight: 800; line-height: 1.15; letter-spacing: -.02em; }
.jm-card--hero-main .jm-card__excerpt { font-size: 1.0625rem; }
.jm-card--hero-side .jm-card__media { aspect-ratio: 16 / 10; }
@media (min-width: 700px) {
	.jm-hero { grid-template-columns: 1fr 1fr; }
	.jm-hero__main { grid-column: 1 / -1; }
}
@media (min-width: 1100px) {
	.jm-hero { grid-template-columns: 1fr 2fr 1fr; grid-template-areas: "left main right"; gap: 2rem; }
	.jm-hero__main { grid-area: main; grid-column: auto; }
	.jm-hero__side--left { grid-area: left; }
	.jm-hero__side--right { grid-area: right; }
	.jm-hero__side > .jm-card + .jm-card { padding-top: 1.5rem; border-top: 1px solid var(--wp--preset--color--line); }
}

.jm-split { width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin-inline: auto; display: grid; gap: 0 3rem; }
.jm-split > .jm-section .jm-section__inner { width: 100%; }
@media (min-width: 1000px) {
	.jm-split { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
	.jm-split > .jm-section--compact .jm-section__inner { position: sticky; top: 5.5rem; }
}
.jm-list { display: grid; }
.jm-card--list { grid-template-columns: 112px 1fr; gap: 1rem; padding-block: 1.25rem; border-bottom: 1px solid var(--wp--preset--color--line); }
.jm-card--list:first-child { padding-top: 0; }
.jm-card--list:not(:has(.jm-card__media)) { grid-template-columns: 1fr; }
.jm-card--list .jm-card__media { aspect-ratio: 1; }
@media (min-width: 640px) {
	.jm-card--list { grid-template-columns: 200px 1fr; gap: 1.5rem; }
	.jm-card--list .jm-card__media { aspect-ratio: 3 / 2; }
	.jm-card--list .jm-card__title { font-size: 1.1875rem; }
}
@media (max-width: 639px) { .jm-card--list .jm-card__excerpt { display: none; } }
.jm-compact { list-style: none; margin: 0; padding: 0; counter-reset: jm; }
.jm-compact > li {
	counter-increment: jm; display: grid; grid-template-columns: 2.25rem 1fr; gap: .75rem;
	padding-block: 1rem; border-bottom: 1px solid var(--wp--preset--color--line);
}
.jm-compact > li:first-child { padding-top: 0; }
.jm-compact > li::before { content: counter(jm); font: 800 1.75rem/1 var(--wp--preset--font-family--sans); color: var(--wp--preset--color--brand); }
.jm-card--compact .jm-card__title { font-size: 1rem; }

.jm-regions { display: grid; gap: 2rem; }
@media (min-width: 900px) { .jm-regions { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.jm-region__title { margin: 0 0 1rem; font-size: .8125rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.jm-region__title a { color: var(--wp--preset--color--brand); text-decoration: none; }
.jm-region__list { list-style: none; margin: 1rem 0 0; padding: 0; }
.jm-region__list li { padding-block: .875rem; border-top: 1px solid var(--wp--preset--color--line); }
.jm-card--feature .jm-card__title { font-size: 1.1875rem; }
.jm-card--title .jm-card__title { font-size: 1rem; font-weight: 600; }

.jm-band { position: relative; isolation: isolate; }
.jm-band--cream { background: var(--wp--preset--color--cream); }
.jm-band--night { background: var(--wp--preset--color--night); color: var(--wp--preset--color--on-night); }
.jm-band--night::before { content: ""; position: absolute; inset: 0; z-index: -1; background: url(../img/pattern.svg) repeat; background-size: 80px; opacity: .07; }
.jm-band--night .jm-section__head { border-color: rgb(247 243 234 / .18); }
.jm-band--night .jm-section__title,
.jm-band--night .jm-card__title a,
.jm-band--night .jm-meta__author,
.jm-band--night .jm-section__more { color: var(--wp--preset--color--on-night); }
.jm-band--night .jm-section__title::before { background: var(--wp--preset--color--gold); }
.jm-band--night .jm-meta, .jm-band--night .jm-card__excerpt { color: rgb(247 243 234 / .78); }
.jm-band--night .jm-label { background: transparent; color: var(--wp--preset--color--on-night); box-shadow: inset 0 0 0 1px var(--wp--preset--color--gold); }

.jm-dawuh { margin: 0 auto; max-width: 46rem; text-align: center; }
.jm-dawuh::before {
	content: "۞"; display: block; margin-bottom: 1rem;
	font-family: var(--wp--preset--font-family--arabic); font-size: 2.5rem; line-height: 1; color: var(--wp--preset--color--gold);
}
.jm-dawuh__text { margin: 0; padding: 0; border: 0; }
.jm-dawuh__text p { margin: 0; font-family: var(--wp--preset--font-family--serif); font-size: clamp(1.25rem, 1rem + 1.2vw, 1.75rem); line-height: 1.5; color: var(--wp--preset--color--ink); }
.jm-dawuh__cite { margin-top: 1.25rem; display: grid; gap: .25rem; font-size: .9375rem; }
.jm-dawuh__cite a { font-weight: 700; color: var(--wp--preset--color--brand); text-decoration: none; }
.jm-dawuh__cite a:hover { text-decoration: underline; }
.jm-dawuh__cite span { color: var(--wp--preset--color--muted); }

.jm-cards { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); }
.jm-card--card .jm-card__media { aspect-ratio: 4 / 3; }
.jm-portraits { display: grid; gap: 1rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 900px) { .jm-portraits { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5rem; } }
.jm-card--portrait { position: relative; border-radius: var(--jm-radius); overflow: hidden; gap: 0; }
.jm-card--portrait .jm-card__media { aspect-ratio: 4 / 5; border-radius: 0; }
.jm-card--portrait .jm-card__body { position: absolute; inset: auto 0 0; padding: 3rem 1rem 1rem; background: linear-gradient(to top, rgb(6 20 13 / .92), rgb(6 20 13 / 0)); }
.jm-card--portrait .jm-card__title a, .jm-card--portrait .jm-meta, .jm-card--portrait .jm-meta__author { color: #FFFFFF; }
.jm-card--portrait:not(:has(.jm-card__media)) .jm-card__body { position: static; min-height: 12rem; align-content: end; background: var(--wp--preset--color--night); padding: 1.25rem; }
.jm-qa { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
@media (min-width: 900px) { .jm-qa { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.jm-qa > li {
	padding: 1.25rem; border-radius: var(--jm-radius-sm); background: var(--wp--preset--color--base);
	border: 1px solid var(--wp--preset--color--line); border-left: 3px solid var(--wp--preset--color--gold);
}
.jm-card--qa .jm-card__title { font-size: 1.0625rem; }
```

- [ ] **Step 4: Jalankan tes PHP sampai lulus**

Run: `npm run test:php`
Expected: PASS (`Success: NN lulus`).

- [ ] **Step 5: Tes e2e beranda**

`tests/e2e/home.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { norm, samplePosts } from './helpers';

test('hero menampilkan post sticky sebagai berita utama', async ({ page }) => {
  const sticky = samplePosts().find((p) => p.flags.includes('sticky'))!;
  await page.goto('/');
  expect(norm(await page.locator('.jm-hero__main .jm-card__title').innerText())).toBe(norm(sticky.title));
});

test('semua bagian beranda tampil berurutan', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.jm-section__title')).toHaveText([
    'Terbaru', 'Pilihan Redaksi', 'Berita', 'Dawuh', 'Hikmah & Pustaka Tasawuf', 'Tokoh', 'Tanya Jawab',
  ]);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('Pilihan Redaksi berisi post yang ditandai', async ({ page }) => {
  const pilihan = samplePosts().filter((p) => p.flags.includes('pilihan')).map((p) => norm(p.title));
  await page.goto('/');
  const shown = (await page.locator('.jm-section--compact .jm-card__title').allInnerTexts()).map(norm);
  expect(shown.sort()).toEqual(pilihan.sort());
});

test('Terbaru tidak mengulang berita di hero', async ({ page }) => {
  await page.goto('/');
  const hero = (await page.locator('.jm-hero .jm-card__title').allInnerTexts()).map(norm);
  const latest = (await page.locator('.jm-section--list .jm-card__title').allInnerTexts()).map(norm);
  expect(latest.filter((t) => hero.includes(t))).toEqual([]);
});

test('gambar hero dimuat eager, gambar lain lazy', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.jm-hero__main img')).toHaveAttribute('loading', 'eager');
  await expect(page.locator('.jm-section--list img').first()).toHaveAttribute('loading', 'lazy');
});
```

Run: `npx playwright test --project=e2e tests/e2e/home.spec.ts`
Expected: PASS.

- [ ] **Step 6: Lint lalu commit**

Run: `npm run lint:php` → exit 0.
```bash
git add theme/jatman tests/php/test-post-list.php tests/e2e/home.spec.ts
git commit -m "feat(theme): kartu post, block post-list, dan beranda (hero, terbaru, pilihan, rubrik)"
```

---

### Task 11: Halaman artikel (single) + varian teduh

**Files:**
- Create: `theme/jatman/inc/article.php`
- Create: `theme/jatman/blocks/{breadcrumb,dek,byline,featured-figure,share}/{block.json,render.php}`
- Create: `theme/jatman/templates/single.html`
- Modify: `theme/jatman/assets/css/main.css` (tambah bagian 4)
- Test: `tests/php/test-article.php`, `tests/e2e/single.spec.ts`

**Interfaces:**
- Consumes: `jatman_primary_category()`, `jatman_reading_time()`, `jatman_render_post_list()` layout `related` (Task 10), body class `is-teduh` (Task 8), `[data-jm-copy]` di `theme.js` (Task 8)
- Produces:
  - `jatman_render_breadcrumb( int $post_id ): string` → `nav.jm-breadcrumb > ol > li > a`: Beranda, lalu leluhur kategori, lalu kategori utama.
  - `jatman_render_dek( int $post_id ): string` → `p.jm-dek`, atau `''` kalau tidak ada ringkasan manual.
  - `jatman_render_byline( int $post_id ): string` → `.jm-byline`, `.jm-byline__author` (link ke /profile/), `.jm-byline__meta` ("N menit baca").
  - `jatman_render_featured_figure( int $post_id, string $wrapper_attributes ): string` → `figure.jm-figure` + `figcaption`.
  - `jatman_share_links( int $post_id ): array<string,string>` (WhatsApp, Facebook, X, Telegram), `jatman_render_share( int $post_id ): string` → `.jm-share`, `.jm-share__status`.

- [ ] **Step 1: Tulis tes PHP yang masih gagal**

`tests/php/test-article.php`:
```php
<?php
$ids  = jatman_ensure_categories();
$post = wp_insert_post( [
	'post_title'    => "Jam'iyyah & Thariqah",
	'post_status'   => 'publish',
	'post_excerpt'  => 'Ringkasan & dek',
	'post_content'  => '<!-- wp:paragraph --><p>Isi.</p><!-- /wp:paragraph -->',
	'post_category' => [ $ids['berita'], $ids['nasional'] ],
] );
try {
	$crumb = jatman_render_breadcrumb( $post );
	preg_match_all( '#<a href="[^"]+">([^<]+)</a>#', $crumb, $m );
	jt_same( [ 'Beranda', 'Berita', 'Nasional' ], $m[1], 'breadcrumb: Beranda › Berita › Nasional' );

	jt_same( '<p class="jm-dek">Ringkasan &amp; dek</p>', jatman_render_dek( $post ), 'dek dari ringkasan, di-escape sekali' );
	wp_update_post( [ 'ID' => $post, 'post_excerpt' => '' ] );
	jt_same( '', jatman_render_dek( $post ), 'tanpa ringkasan manual → dek tidak tampil' );

	$links = jatman_share_links( $post );
	jt_same( [ 'WhatsApp', 'Facebook', 'X', 'Telegram' ], array_keys( $links ), 'empat tujuan share' );
	jt_assert( str_contains( $links['WhatsApp'], 'Jam%E2%80%99iyyah%20%26%20Thariqah' ), 'judul di URL share di-decode lalu di-encode sekali' );
	jt_assert( ! str_contains( $links['X'], '%26%23' ), 'tidak ada entitas HTML di URL share' );

	$byline = jatman_render_byline( $post );
	jt_assert( str_contains( $byline, '1 menit baca' ), 'byline memuat waktu baca' );
	jt_assert( (bool) preg_match( '/\d{2}:\d{2} WIB/', $byline ), 'byline memuat jam WIB' );
	jt_same( '', jatman_render_featured_figure( $post, '' ), 'tanpa gambar utama → figure tidak dirender' );
} finally {
	wp_delete_post( $post, true );
}
```

Run: `npm run test:php`
Expected: FAIL (`Call to undefined function jatman_render_breadcrumb()`).

- [ ] **Step 2: Implementasi `inc/article.php`**

```php
<?php
/**
 * Bagian halaman artikel: breadcrumb, dek, byline, gambar utama, tombol bagikan.
 */

defined( 'ABSPATH' ) || exit;

function jatman_render_breadcrumb( int $post_id ): string {
	$post = get_post( $post_id );
	if ( ! $post ) {
		return '';
	}
	$items = [ [ 'Beranda', home_url( '/' ) ] ];
	$cat   = jatman_primary_category( $post );
	if ( $cat ) {
		foreach ( array_reverse( get_ancestors( $cat->term_id, 'category', 'taxonomy' ) ) as $ancestor_id ) {
			$ancestor = get_term( $ancestor_id, 'category' );
			$items[]  = [ $ancestor->name, get_term_link( $ancestor ) ];
		}
		$items[] = [ $cat->name, get_term_link( $cat ) ];
	}
	$lis = array_map( static fn( array $i ): string => sprintf( '<li><a href="%s">%s</a></li>', esc_url( $i[1] ), esc_html( $i[0] ) ), $items );
	return '<nav class="jm-breadcrumb" aria-label="Breadcrumb"><ol>' . implode( '', $lis ) . '</ol></nav>';
}

function jatman_render_dek( int $post_id ): string {
	$post = get_post( $post_id );
	return $post && has_excerpt( $post ) ? '<p class="jm-dek">' . esc_html( wp_strip_all_tags( $post->post_excerpt ) ) . '</p>' : '';
}

function jatman_render_byline( int $post_id ): string {
	$post = get_post( $post_id );
	if ( ! $post ) {
		return '';
	}
	$author = (int) $post->post_author;
	return sprintf(
		'<div class="jm-byline">%s<div class="jm-byline__text"><a class="jm-byline__author" href="%s">%s</a><p class="jm-byline__meta"><time datetime="%s">%s</time><span aria-hidden="true">·</span><span>%d menit baca</span></p></div></div>',
		get_avatar( $author, 44, '', '', [ 'class' => 'jm-byline__avatar' ] ),
		esc_url( get_author_posts_url( $author ) ),
		esc_html( get_the_author_meta( 'display_name', $author ) ),
		esc_attr( get_the_date( 'c', $post ) ),
		esc_html( get_the_date( 'l, j F Y · H:i T', $post ) ),
		jatman_reading_time( $post )
	);
}

function jatman_render_featured_figure( int $post_id, string $wrapper_attributes ): string {
	$image_id = (int) get_post_thumbnail_id( $post_id );
	if ( ! $image_id ) {
		return '';
	}
	$caption = wp_get_attachment_caption( $image_id );
	return sprintf(
		'<figure %s>%s%s</figure>',
		$wrapper_attributes ?: 'class="jm-figure"',
		wp_get_attachment_image( $image_id, 'jatman-hero', false, [ 'loading' => 'eager', 'fetchpriority' => 'high', 'sizes' => '(min-width: 1080px) 1024px, 100vw' ] ),
		$caption ? '<figcaption>' . esc_html( $caption ) . '</figcaption>' : ''
	);
}

/** @return array<string, string> nama tujuan => URL share */
function jatman_share_links( int $post_id ): array {
	$url   = rawurlencode( get_permalink( $post_id ) );
	$title = rawurlencode( html_entity_decode( get_the_title( $post_id ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
	return [
		'WhatsApp' => "https://wa.me/?text={$title}%20{$url}",
		'Facebook' => "https://www.facebook.com/sharer/sharer.php?u={$url}",
		'X'        => "https://x.com/intent/post?text={$title}&url={$url}",
		'Telegram' => "https://t.me/share/url?url={$url}&text={$title}",
	];
}

function jatman_render_share( int $post_id ): string {
	$links = '';
	foreach ( jatman_share_links( $post_id ) as $name => $href ) {
		$links .= sprintf(
			'<a href="%s" target="_blank" rel="noopener noreferrer"><span class="screen-reader-text">Bagikan ke </span>%s</a>',
			esc_url( $href ),
			esc_html( $name )
		);
	}
	return sprintf(
		'<div class="jm-share"><span class="jm-share__label">Bagikan</span>%s<button type="button" data-jm-copy="%s">Salin tautan</button><span class="jm-share__status" role="status" aria-live="polite"></span></div>',
		$links,
		esc_attr( get_permalink( $post_id ) )
	);
}
```

- [ ] **Step 3: Lima block artikel**

Kelima block memakai `block.json` dengan pola yang sama. Bedanya hanya `name`, `title`, dan `supports` untuk featured-figure.

`theme/jatman/blocks/breadcrumb/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/breadcrumb",
  "title": "Breadcrumb artikel",
  "category": "theme",
  "usesContext": ["postId"],
  "supports": { "html": false },
  "render": "file:./render.php"
}
```
`theme/jatman/blocks/breadcrumb/render.php`:
```php
<?php
/** @var WP_Block $block */
echo jatman_render_breadcrumb( (int) ( $block->context['postId'] ?? get_queried_object_id() ) ); // phpcs:ignore WordPress.Security.EscapeOutput
```

`theme/jatman/blocks/dek/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/dek",
  "title": "Dek (ringkasan) artikel",
  "category": "theme",
  "usesContext": ["postId"],
  "supports": { "html": false },
  "render": "file:./render.php"
}
```
`theme/jatman/blocks/dek/render.php`:
```php
<?php
/** @var WP_Block $block */
echo jatman_render_dek( (int) ( $block->context['postId'] ?? get_queried_object_id() ) ); // phpcs:ignore WordPress.Security.EscapeOutput
```

`theme/jatman/blocks/byline/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/byline",
  "title": "Byline artikel",
  "category": "theme",
  "usesContext": ["postId"],
  "supports": { "html": false },
  "render": "file:./render.php"
}
```
`theme/jatman/blocks/byline/render.php`:
```php
<?php
/** @var WP_Block $block */
echo jatman_render_byline( (int) ( $block->context['postId'] ?? get_queried_object_id() ) ); // phpcs:ignore WordPress.Security.EscapeOutput
```

`theme/jatman/blocks/featured-figure/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/featured-figure",
  "title": "Gambar utama + keterangan",
  "category": "theme",
  "usesContext": ["postId"],
  "supports": { "html": false },
  "render": "file:./render.php"
}
```
`theme/jatman/blocks/featured-figure/render.php`:
```php
<?php
/** @var WP_Block $block */
echo jatman_render_featured_figure( // phpcs:ignore WordPress.Security.EscapeOutput
	(int) ( $block->context['postId'] ?? get_queried_object_id() ),
	get_block_wrapper_attributes( [ 'class' => 'jm-figure' ] )
);
```

`theme/jatman/blocks/share/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/share",
  "title": "Tombol bagikan",
  "category": "theme",
  "usesContext": ["postId"],
  "supports": { "html": false },
  "render": "file:./render.php"
}
```
`theme/jatman/blocks/share/render.php`:
```php
<?php
/** @var WP_Block $block */
echo jatman_render_share( (int) ( $block->context['postId'] ?? get_queried_object_id() ) ); // phpcs:ignore WordPress.Security.EscapeOutput
```

- [ ] **Step 4: Template `single.html`**

```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->

<!-- wp:group {"tagName":"main","className":"jm-single","layout":{"type":"default"}} -->
<main class="wp-block-group jm-single"><!-- wp:group {"tagName":"article","className":"jm-article","layout":{"type":"default"}} -->
<article class="wp-block-group jm-article"><!-- wp:group {"tagName":"header","className":"jm-article__head","layout":{"type":"default"}} -->
<header class="wp-block-group jm-article__head"><!-- wp:jatman/breadcrumb /-->

<!-- wp:post-title {"level":1,"className":"jm-article__title"} /-->

<!-- wp:jatman/dek /-->

<!-- wp:jatman/byline /--></header>
<!-- /wp:group -->

<!-- wp:jatman/featured-figure /-->

<!-- wp:post-content {"className":"jm-article__body","layout":{"type":"default"}} /-->

<!-- wp:group {"tagName":"footer","className":"jm-article__foot","layout":{"type":"default"}} -->
<footer class="wp-block-group jm-article__foot"><!-- wp:post-terms {"term":"post_tag","prefix":"Tag","separator":" ","className":"jm-tags"} /-->

<!-- wp:jatman/share /-->

<!-- wp:post-author {"avatarSize":48,"showBio":true,"isLink":true,"byline":"Ditulis oleh","className":"jm-authorbox"} /--></footer>
<!-- /wp:group --></article>
<!-- /wp:group -->

<!-- wp:jatman/post-list {"layout":"related","count":3,"title":"Artikel terkait"} /--></main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

- [ ] **Step 5: Tambah CSS bagian 4 ke `main.css`**

```css
/* == 4. Artikel ============================================================= */
.jm-single { padding-top: clamp(1.5rem, 4vw, 3rem); }
.jm-article__head, .jm-article__body, .jm-article__foot { width: min(100% - 2 * var(--jm-gutter), 46rem); margin-inline: auto; }
.jm-article__head { display: grid; gap: 1rem; }
.jm-breadcrumb ol { list-style: none; display: flex; flex-wrap: wrap; gap: .25rem .5rem; margin: 0; padding: 0; font-size: .8125rem; font-weight: 600; }
.jm-breadcrumb li + li::before { content: "/"; margin-right: .5rem; color: var(--wp--preset--color--muted); opacity: .5; }
.jm-breadcrumb a { color: var(--wp--preset--color--muted); text-decoration: none; }
.jm-breadcrumb a:hover { color: var(--wp--preset--color--brand); }
.jm-breadcrumb li:last-child a { color: var(--wp--preset--color--brand); }
.jm-article__title { margin: 0; font-size: clamp(1.875rem, 1.2rem + 2.6vw, 3rem); font-weight: 800; line-height: 1.12; letter-spacing: -.02em; }
.jm-dek { margin: 0; font-size: clamp(1.0625rem, 1rem + .3vw, 1.25rem); line-height: 1.55; color: var(--wp--preset--color--muted); }
.jm-byline { display: flex; align-items: center; gap: .75rem; padding-block: 1rem; border-block: 1px solid var(--wp--preset--color--line); }
.jm-byline__avatar { border-radius: 50%; width: 44px; height: 44px; object-fit: cover; }
.jm-byline__author { font-weight: 700; color: var(--wp--preset--color--ink); text-decoration: none; }
.jm-byline__author:hover { color: var(--wp--preset--color--brand); }
.jm-byline__meta { margin: .15rem 0 0; display: flex; flex-wrap: wrap; gap: .4rem; font-size: .8125rem; color: var(--wp--preset--color--muted); }

.jm-figure { width: min(100% - 2 * var(--jm-gutter), 64rem); margin: clamp(1.5rem, 4vw, 2.5rem) auto; }
.jm-figure img { width: 100%; display: block; border-radius: var(--jm-radius); }
.jm-figure figcaption { margin-top: .6rem; font-size: .8125rem; color: var(--wp--preset--color--muted); }

.jm-article__body > * { margin-block: 0 1.25em; }
.jm-article__body :where(h2, h3, h4) { font-family: var(--wp--preset--font-family--sans); margin-top: 2em; line-height: 1.3; }
.jm-article__body a { color: var(--wp--preset--color--brand); }
.jm-article__body .wp-block-quote { border-left: 3px solid var(--wp--preset--color--gold); margin-inline: 0; padding-left: 1.25rem; font-style: italic; }
.jm-article__body .wp-block-image img { border-radius: var(--jm-radius-sm); }
.jm-article__body figcaption { font: .8125rem/1.5 var(--wp--preset--font-family--sans); color: var(--wp--preset--color--muted); }

.jm-article__foot { display: grid; gap: 1.5rem; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--wp--preset--color--line); }
.jm-tags { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; font-size: .875rem; }
.jm-tags .wp-block-post-terms__prefix { font-weight: 700; margin-right: .25rem; }
.jm-tags a { padding: .3rem .75rem; border-radius: 999px; background: var(--wp--preset--color--cream); color: var(--wp--preset--color--ink); text-decoration: none; }
.jm-tags a:hover { color: var(--wp--preset--color--brand); }
.jm-share { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.jm-share__label { font-weight: 700; font-size: .875rem; margin-right: .25rem; }
.jm-share a, .jm-share button {
	display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .9rem; border-radius: 999px; cursor: pointer;
	border: 1px solid var(--wp--preset--color--line); background: var(--wp--preset--color--base); color: var(--wp--preset--color--ink);
	font: 600 .8125rem/1 var(--wp--preset--font-family--sans); text-decoration: none;
}
.jm-share a:hover, .jm-share button:hover { border-color: var(--wp--preset--color--brand); color: var(--wp--preset--color--brand); }
.jm-share__status { font-size: .8125rem; color: var(--wp--preset--color--brand); }
.jm-authorbox { display: grid; grid-template-columns: auto 1fr; gap: 1rem; padding: 1.25rem; border-radius: var(--jm-radius); background: var(--wp--preset--color--cream); }
.jm-authorbox .wp-block-post-author__avatar img { border-radius: 50%; display: block; }
.jm-authorbox .wp-block-post-author__byline { margin: 0; font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: var(--wp--preset--color--muted); }
.jm-authorbox .wp-block-post-author__name { margin: .15rem 0 0; font-weight: 700; }
.jm-authorbox .wp-block-post-author__name a { color: var(--wp--preset--color--ink); }
.jm-authorbox .wp-block-post-author__bio { margin: .4rem 0 0; font-size: .9375rem; color: var(--wp--preset--color--muted); }
.jm-section--related { border-top: 1px solid var(--wp--preset--color--line); margin-top: clamp(2rem, 5vw, 3rem); }

/* Varian teduh: Dawuh, Hikmah, Pustaka Tasawuf */
.is-teduh .jm-single { background: var(--wp--preset--color--cream); }
.is-teduh .jm-article__head { text-align: center; justify-items: center; }
.is-teduh .jm-breadcrumb ol { justify-content: center; }
.is-teduh .jm-article__title { font-family: var(--wp--preset--font-family--serif); font-weight: 700; letter-spacing: -.01em; }
.is-teduh .jm-article__head::after {
	content: "۞"; font-family: var(--wp--preset--font-family--arabic); font-size: 1.75rem; line-height: 1; color: var(--wp--preset--color--gold);
}
.is-teduh .jm-byline { justify-content: center; border-color: color-mix(in srgb, var(--wp--preset--color--gold) 35%, transparent); }
.is-teduh .jm-authorbox, .is-teduh .jm-tags a, .is-teduh .jm-share a, .is-teduh .jm-share button { background: var(--wp--preset--color--base); }
```

- [ ] **Step 6: Jalankan tes PHP sampai lulus**

Run: `npm run test:php`
Expected: PASS.

- [ ] **Step 7: Tes e2e artikel**

`tests/e2e/single.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { DAWUH, NEWS, norm, samplePosts } from './helpers';

test('artikel berita: semua bagian lengkap', async ({ page }) => {
  const post = samplePosts().find((p) => p.slug === NEWS)!;
  await page.goto(`/${NEWS}/`);
  await expect(page.locator('.jm-breadcrumb a')).toHaveText(['Beranda', 'Berita', 'Nasional']);
  await expect(page.locator('h1')).toHaveCount(1);
  expect(norm(await page.locator('h1').innerText())).toBe(norm(post.title));
  await expect(page.locator('.jm-dek')).toBeVisible();
  await expect(page.locator('.jm-byline__author')).toHaveAttribute('href', /\/profile\/syahril-mubarok\/$/);
  await expect(page.locator('.jm-byline__meta')).toContainText(/\d+ menit baca/);
  await expect(page.locator('.jm-figure figcaption')).toHaveText('Logo Harlah Ke-69 JATMAN');
  await expect(page.locator('.jm-article__body p').first()).toBeVisible();
  await expect(page.locator('.jm-tags a').first()).toBeVisible();
  for (const name of ['WhatsApp', 'Facebook', 'X', 'Telegram']) {
    await expect(page.getByRole('link', { name: `Bagikan ke ${name}` })).toHaveAttribute('href', /localhost%3A8888/);
  }
  await expect(page.locator('.jm-authorbox')).toContainText('Syahril Mubarok');
  const related = page.locator('.jm-section--related .jm-card__title a');
  expect(await related.count()).toBeGreaterThan(0);
  expect(await related.count()).toBeLessThanOrEqual(3);
  for (const href of await related.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))) {
    expect(href).not.toContain(NEWS);
  }
  await expect(page.locator('body')).not.toHaveClass(/is-teduh/);
});

test('artikel Dawuh memakai varian teduh', async ({ page }) => {
  await page.goto(`/${DAWUH}/`);
  await expect(page.locator('body')).toHaveClass(/is-teduh/);
  const bg = await page.locator('.jm-single').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(247, 243, 234)');
});

test('salin tautan memberi konfirmasi', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/${NEWS}/`);
  await page.getByRole('button', { name: 'Salin tautan' }).click();
  await expect(page.locator('.jm-share__status')).toHaveText('Tautan disalin');
});

test('setiap artikel sample punya gambar utama atau tetap rapi tanpa gambar', async ({ page }) => {
  for (const p of samplePosts().slice(0, 5)) {
    await page.goto(`/${p.slug}/`);
    const figures = await page.locator('.jm-figure').count();
    expect(figures).toBeLessThanOrEqual(1);
    if (figures) await expect(page.locator('.jm-figure img')).toHaveAttribute('src', /\/wp-content\/uploads\//);
  }
});
```

Run: `npx playwright test --project=e2e tests/e2e/single.spec.ts`
Expected: PASS.

- [ ] **Step 8: Lint lalu commit**

Run: `npm run lint:php` → exit 0.
```bash
git add theme/jatman tests/php/test-article.php tests/e2e/single.spec.ts
git commit -m "feat(theme): halaman artikel (breadcrumb, byline, figure, bagikan, penulis, terkait) + varian teduh"
```

---

### Task 12: Arsip, penulis, tag, pencarian, 404, halaman statis

**Files:**
- Create: `theme/jatman/inc/archive.php`
- Create: `theme/jatman/blocks/archive-header/{block.json,render.php}`, `theme/jatman/blocks/card/{block.json,render.php}`
- Create: `theme/jatman/templates/{archive,search,404,page,page-tentang}.html`, `theme/jatman/patterns/lambang-tentang.php`
- Modify: `theme/jatman/templates/index.html` (sama dengan archive), `theme/jatman/assets/css/main.css` (tambah bagian 5)
- Test: `tests/e2e/archives.spec.ts`

**Interfaces:**
- Consumes: `jatman_card()` (Task 10), `jatman_categories()` (Task 2)
- Produces:
  - `jatman_render_archive_header(): string` → `.jm-archive-head > .jm-archive-head__inner` dengan `h1`. Konteks: kategori/tag (eyebrow Rubrik/Tag, deskripsi, tab Berita), penulis (avatar, bio, "N tulisan"), pencarian ("N hasil untuk “q”" + form).
  - `jatman_berita_tabs( WP_Term $term ): string` → `nav.jm-tabs`, dengan `aria-current="page"` pada tab aktif.
  - Block `jatman/card` (context `postId`, atribut `variant`).

- [ ] **Step 1: Tulis tes e2e yang masih gagal**

`tests/e2e/archives.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('rubrik Berita: pita, sub-tab, grid kartu', async ({ page }) => {
  await page.goto('/berita/nasional/');
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Nasional');
  await expect(page.locator('.jm-tabs a')).toHaveText(['Semua', 'Nasional', 'Daerah', 'Internasional']);
  await expect(page.locator('.jm-tabs a[aria-current="page"]')).toHaveText('Nasional');
  expect(await page.locator('.jm-grid .jm-card').count()).toBeGreaterThan(0);
});

test('rubrik /berita/ memuat berita dari semua sub-rubrik', async ({ page }) => {
  await page.goto('/berita/');
  await expect(page.locator('.jm-tabs a[aria-current="page"]')).toHaveText('Semua');
  expect(await page.locator('.jm-grid .jm-card').count()).toBeGreaterThanOrEqual(7);
});

test('rubrik teduh memakai pita krem', async ({ page }) => {
  await page.goto('/hikmah/');
  await expect(page.locator('body')).toHaveClass(/is-teduh/);
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Hikmah');
  await expect(page.locator('.jm-tabs')).toHaveCount(0);
});

test('halaman penulis: foto, nama, jumlah tulisan, daftar tulisan', async ({ page }) => {
  await page.goto('/profile/syahril-mubarok/');
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Syahril Mubarok');
  await expect(page.locator('.jm-archive-head__count')).toHaveText(/^\d+ tulisan$/);
  await expect(page.locator('.jm-archive-head__avatar')).toBeVisible();
  expect(await page.locator('.jm-grid .jm-card').count()).toBeGreaterThan(0);
});

test('halaman tag', async ({ page }) => {
  const res = await page.goto('/tag/jatman/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('.jm-archive-head h1')).toHaveText('Jatman');
});

test('pencarian menghitung hasil', async ({ page }) => {
  await page.goto('/?s=JATMAN');
  await expect(page.locator('.jm-archive-head h1')).toHaveText(/^\d+ hasil untuk “JATMAN”$/);
  await expect(page.locator('.jm-archive-head input[type="search"]')).toHaveValue('JATMAN');
});

test('pencarian dengan HTML ter-escape dan 0 hasil tetap rapi', async ({ page }) => {
  await page.goto('/?s=' + encodeURIComponent('<b>zzqx</b>'));
  await expect(page.locator('.jm-archive-head h1')).toHaveText('0 hasil untuk “<b>zzqx</b>”');
  await expect(page.locator('.jm-archive-head h1 b')).toHaveCount(0);
  await expect(page.getByText('Tidak ada hasil. Coba kata kunci lain.')).toBeVisible();
});

test('404 ramah: status 404, pesan, form cari, berita terbaru', async ({ page }) => {
  const res = await page.goto('/halaman-yang-tidak-ada/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Halaman tidak ditemukan');
  await expect(page.locator('main input[type="search"]')).toBeVisible();
  await expect(page.locator('.jm-section__title')).toHaveText(['Berita terbaru']);
});

test('halaman Tentang menampilkan lambang JATMAN', async ({ page }) => {
  await page.goto('/tentang/');
  await expect(page.locator('main').getByRole('img', { name: 'Lambang JATMAN' })).toBeVisible();
  await expect(page.locator('main h1')).toHaveText('Tentang JATMAN');
});
```

Run: `npx playwright test --project=e2e tests/e2e/archives.spec.ts`
Expected: FAIL (`.jm-archive-head` tidak ditemukan).

- [ ] **Step 2: Implementasi `inc/archive.php` dan block**

`theme/jatman/inc/archive.php`:
```php
<?php
/**
 * Pita judul untuk arsip rubrik/tag, halaman penulis, dan pencarian.
 */

defined( 'ABSPATH' ) || exit;

function jatman_render_archive_header(): string {
	$eyebrow = '';
	$title   = '';
	$desc    = '';
	$extra   = '';
	$media   = '';

	if ( is_category() || is_tag() ) {
		$term    = get_queried_object();
		$eyebrow = is_category() ? 'Rubrik' : 'Tag';
		$title   = $term->name;
		$desc    = term_description( $term );
		$extra   = is_category() ? jatman_berita_tabs( $term ) : '';
	} elseif ( is_author() ) {
		$user    = get_queried_object();
		$eyebrow = 'Penulis';
		$title   = $user->display_name;
		$desc    = $user->description ? wpautop( esc_html( $user->description ) ) : '';
		$media   = get_avatar( $user->ID, 96, '', '', [ 'class' => 'jm-archive-head__avatar' ] );
		$extra   = sprintf( '<p class="jm-archive-head__count">%s tulisan</p>', esc_html( number_format_i18n( count_user_posts( $user->ID, 'post', true ) ) ) );
	} elseif ( is_search() ) {
		global $wp_query;
		$eyebrow = 'Pencarian';
		$title   = sprintf( '%s hasil untuk “%s”', number_format_i18n( (int) $wp_query->found_posts ), get_search_query( false ) );
		$extra   = do_blocks( '<!-- wp:search {"label":"Cari","showLabel":false,"placeholder":"Cari berita, dawuh, tokoh…","buttonText":"Cari"} /-->' );
	} else {
		$title = wp_strip_all_tags( get_the_archive_title() );
	}

	return sprintf(
		'<div class="jm-archive-head"><div class="jm-archive-head__inner">%s%s<h1>%s</h1>%s%s</div></div>',
		$media,
		$eyebrow ? '<p class="jm-archive-head__eyebrow">' . esc_html( $eyebrow ) . '</p>' : '',
		esc_html( $title ),
		$desc ? '<div class="jm-archive-head__desc">' . wp_kses_post( $desc ) . '</div>' : '',
		$extra
	);
}

/** Tab Semua/Nasional/Daerah/Internasional untuk rubrik Berita dan anak-anaknya. */
function jatman_berita_tabs( WP_Term $term ): string {
	if ( ! function_exists( 'jatman_categories' ) ) {
		return '';
	}
	$root = $term;
	while ( $root->parent ) {
		$root = get_term( $root->parent, 'category' );
	}
	if ( 'berita' !== $root->slug ) {
		return '';
	}
	$items = [ [ 'Semua', $root ] ];
	foreach ( jatman_categories() as $slug => [ , $parent ] ) {
		$child = 'berita' === $parent ? get_term_by( 'slug', $slug, 'category' ) : false;
		if ( $child ) {
			$items[] = [ $child->name, $child ];
		}
	}
	$lis = '';
	foreach ( $items as [ $label, $t ] ) {
		$lis .= sprintf(
			'<li><a href="%s"%s>%s</a></li>',
			esc_url( get_term_link( $t ) ),
			$t->term_id === $term->term_id ? ' aria-current="page"' : '',
			esc_html( $label )
		);
	}
	return '<nav class="jm-tabs" aria-label="Sub-rubrik Berita"><ul>' . $lis . '</ul></nav>';
}
```

`theme/jatman/blocks/archive-header/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/archive-header",
  "title": "Pita judul arsip",
  "category": "theme",
  "description": "Judul rubrik/tag/penulis/pencarian dengan pita bermotif.",
  "supports": { "html": false },
  "render": "file:./render.php"
}
```
`theme/jatman/blocks/archive-header/render.php`:
```php
<?php
echo jatman_render_archive_header(); // phpcs:ignore WordPress.Security.EscapeOutput
```

`theme/jatman/blocks/card/block.json`:
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "jatman/card",
  "title": "Kartu post JATMAN",
  "category": "theme",
  "usesContext": ["postId"],
  "attributes": { "variant": { "type": "string", "default": "card" } },
  "supports": { "html": false },
  "render": "file:./render.php"
}
```
`theme/jatman/blocks/card/render.php`:
```php
<?php
/**
 * @var array    $attributes
 * @var WP_Block $block
 */
$jatman_post = get_post( (int) ( $block->context['postId'] ?? 0 ) );
echo $jatman_post ? jatman_card( $jatman_post, $attributes['variant'] ?? 'card' ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput
```

- [ ] **Step 3: Template dan pattern**

`theme/jatman/templates/archive.html`, lalu salin persis ke `theme/jatman/templates/index.html`:
```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->

<!-- wp:group {"tagName":"main","className":"jm-archive","layout":{"type":"default"}} -->
<main class="wp-block-group jm-archive"><!-- wp:jatman/archive-header /-->

<!-- wp:group {"className":"jm-archive__body","layout":{"type":"default"}} -->
<div class="wp-block-group jm-archive__body"><!-- wp:query {"queryId":1,"query":{"inherit":true},"layout":{"type":"default"}} -->
<div class="wp-block-query"><!-- wp:post-template {"className":"jm-grid"} -->
<!-- wp:jatman/card /-->
<!-- /wp:post-template -->

<!-- wp:query-pagination {"className":"jm-pagination","layout":{"type":"flex","justifyContent":"center"}} -->
<!-- wp:query-pagination-previous {"label":"Sebelumnya"} /-->
<!-- wp:query-pagination-numbers /-->
<!-- wp:query-pagination-next {"label":"Berikutnya"} /-->
<!-- /wp:query-pagination -->

<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p>Belum ada tulisan di sini.</p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results --></div>
<!-- /wp:query --></div>
<!-- /wp:group --></main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

`theme/jatman/templates/search.html`: sama dengan `archive.html`, kecuali paragraf di `query-no-results` diganti:
```html
<!-- wp:paragraph -->
<p>Tidak ada hasil. Coba kata kunci lain.</p>
<!-- /wp:paragraph -->
```

`theme/jatman/templates/404.html`:
```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->

<!-- wp:group {"tagName":"main","className":"jm-404","layout":{"type":"default"}} -->
<main class="wp-block-group jm-404"><!-- wp:group {"className":"jm-page","layout":{"type":"default"}} -->
<div class="wp-block-group jm-page"><!-- wp:heading {"level":1} -->
<h1 class="wp-block-heading">Halaman tidak ditemukan</h1>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Tautan yang Anda buka mungkin sudah berubah atau tidak pernah ada. Coba cari tulisan yang Anda maksud.</p>
<!-- /wp:paragraph -->

<!-- wp:search {"label":"Cari","showLabel":false,"placeholder":"Cari berita, dawuh, tokoh…","buttonText":"Cari"} /--></div>
<!-- /wp:group -->

<!-- wp:jatman/post-list {"layout":"list","count":4,"title":"Berita terbaru"} /--></main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

`theme/jatman/templates/page.html`:
```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->

<!-- wp:group {"tagName":"main","className":"jm-page","layout":{"type":"default"}} -->
<main class="wp-block-group jm-page"><!-- wp:post-title {"level":1} /-->

<!-- wp:post-content {"className":"jm-article__body","layout":{"type":"default"}} /--></main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

`theme/jatman/templates/page-tentang.html`:
```html
<!-- wp:template-part {"slug":"topbar","tagName":"div"} /-->
<!-- wp:template-part {"slug":"header","tagName":"div","className":"jm-header-part"} /-->

<!-- wp:group {"tagName":"main","className":"jm-page","layout":{"type":"default"}} -->
<main class="wp-block-group jm-page"><!-- wp:pattern {"slug":"jatman/lambang-tentang"} /-->

<!-- wp:post-title {"level":1,"textAlign":"center"} /-->

<!-- wp:post-content {"className":"jm-article__body","layout":{"type":"default"}} /--></main>
<!-- /wp:group -->

<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```

`theme/jatman/patterns/lambang-tentang.php`:
```php
<?php
/**
 * Title: Lambang JATMAN (halaman Tentang)
 * Slug: jatman/lambang-tentang
 * Inserter: no
 */
?>
<!-- wp:html -->
<figure class="jm-page__lambang">
	<img src="<?php echo esc_url( get_theme_file_uri( 'assets/img/lambang-jatman.svg' ) ); ?>" alt="Lambang JATMAN" width="220" height="220">
	<figcaption>Lambang Jam’iyyah Ahlith Thariqah al-Mu’tabarah an-Nahdliyyah</figcaption>
</figure>
<!-- /wp:html -->
```

- [ ] **Step 4: Tambah CSS bagian 5 ke `main.css`**

```css
/* == 5. Arsip, pencarian, halaman ========================================== */
.jm-archive-head {
	position: relative; isolation: isolate; padding-block: clamp(2rem, 6vw, 3.5rem);
	background: var(--wp--preset--color--night); color: var(--wp--preset--color--on-night);
}
.jm-archive-head::before { content: ""; position: absolute; inset: 0; z-index: -1; background: url(../img/pattern.svg) repeat; background-size: 80px; opacity: .08; }
.jm-archive-head__inner { width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin-inline: auto; display: grid; gap: .75rem; justify-items: start; }
.jm-archive-head__eyebrow { margin: 0; font-size: .75rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; opacity: .85; }
.jm-archive-head h1 { margin: 0; font-size: clamp(1.875rem, 1.2rem + 2.6vw, 3rem); font-weight: 800; letter-spacing: -.02em; color: inherit; overflow-wrap: anywhere; }
.jm-archive-head__desc { max-width: 40rem; opacity: .88; }
.jm-archive-head__desc p { margin: 0; }
.jm-archive-head__avatar { border-radius: 50%; box-shadow: 0 0 0 3px var(--wp--preset--color--gold); }
.jm-archive-head__count { margin: 0; font-weight: 600; opacity: .88; }
.jm-archive-head .wp-block-search { width: min(100%, 32rem); }
.jm-tabs ul { display: flex; flex-wrap: wrap; gap: .5rem; list-style: none; margin: .75rem 0 0; padding: 0; }
.jm-tabs a {
	display: inline-block; padding: .45rem 1rem; border-radius: 999px; border: 1px solid rgb(247 243 234 / .35);
	color: inherit; text-decoration: none; font-weight: 600; font-size: .875rem;
}
.jm-tabs a:hover { border-color: currentColor; }
.jm-tabs a[aria-current="page"] { background: var(--wp--preset--color--on-night); color: var(--wp--preset--color--night); border-color: transparent; }
.is-teduh .jm-archive-head { background: var(--wp--preset--color--cream); color: var(--wp--preset--color--ink); }
.is-teduh .jm-archive-head::before { filter: invert(1); opacity: .05; }

.jm-archive__body { width: min(100% - 2 * var(--jm-gutter), var(--jm-wide)); margin: clamp(2rem, 5vw, 3rem) auto 0; }
.jm-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 2rem 1.5rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
@media (min-width: 1000px) {
	body:not(.paged) .jm-grid > li:first-child { grid-column: span 2; grid-row: span 2; }
	body:not(.paged) .jm-grid > li:first-child .jm-card__media { aspect-ratio: 16 / 10; }
	body:not(.paged) .jm-grid > li:first-child .jm-card__title { font-size: 1.75rem; font-weight: 800; line-height: 1.2; }
}
.jm-pagination { margin-top: 3rem; gap: .5rem; font-weight: 600; }
.jm-pagination .page-numbers, .jm-pagination > a {
	display: inline-grid; place-items: center; min-width: 2.5rem; height: 2.5rem; padding-inline: .75rem; border-radius: 999px;
	border: 1px solid var(--wp--preset--color--line); color: var(--wp--preset--color--ink); text-decoration: none;
}
.jm-pagination .page-numbers.current { background: var(--wp--preset--color--brand); border-color: transparent; color: var(--wp--preset--color--on-brand); }

.wp-block-search__input {
	border-radius: 999px; border: 1px solid var(--wp--preset--color--line); padding: .7rem 1.1rem;
	background: var(--wp--preset--color--base); color: var(--wp--preset--color--ink);
}
.wp-block-search__button {
	border-radius: 999px; border: 0; padding: .7rem 1.25rem; font-weight: 700;
	background: var(--wp--preset--color--brand); color: var(--wp--preset--color--on-brand);
}

.jm-page { width: min(100% - 2 * var(--jm-gutter), 46rem); margin: clamp(2rem, 6vw, 4rem) auto 0; }
.jm-page h1 { font-size: clamp(1.875rem, 1.2rem + 2.6vw, 3rem); font-weight: 800; letter-spacing: -.02em; margin: 0 0 1.5rem; }
.jm-page .jm-article__body { width: auto; }
.jm-page__lambang { display: grid; justify-items: center; gap: .75rem; margin: 0 0 2rem; text-align: center; font-size: .875rem; color: var(--wp--preset--color--muted); }
.jm-page__lambang img { width: min(60vw, 220px); height: auto; }
[data-theme="dark"] .jm-page__lambang img { background: #F7F3EA; border-radius: 50%; padding: 10px; }
.jm-404 .jm-page { margin-bottom: 1rem; }
```

- [ ] **Step 5: Jalankan semua tes e2e sampai lulus**

Run: `npx playwright test --project=e2e`
Expected: PASS untuk semua spec yang sudah ada (smoke, editor, import, theme, chrome, home, single, archives).

- [ ] **Step 6: Lint lalu commit**

Run: `npm run lint:php` → exit 0.
```bash
git add theme/jatman tests/e2e/archives.spec.ts
git commit -m "feat(theme): arsip rubrik/tag/penulis, pencarian, 404, halaman Tentang"
```

---

### Task 13: Rangkaian verifikasi (URL lama, aksesibilitas, screenshot, debug log, Lighthouse) + README

**Files:**
- Create: `tests/e2e/urls.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/debuglog.spec.ts`, `tests/e2e/screens.spec.ts`, `tests/lighthouse.mjs`, `README.md`
- Modify: `.gitignore` (tambah `tests/output/`)

**Interfaces:**
- Consumes: semua halaman dari Task 9–12, helper e2e (Task 1)
- Produces: `npm run screens` menghasilkan `tests/output/screens/<halaman>-<lebar>-<mode>.png`. `npm run lighthouse` keluar dengan kode 1 kalau performa < 90.

- [ ] **Step 1: Tulis tes verifikasi**

`tests/e2e/urls.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { norm, samplePosts } from './helpers';

test('setiap slug artikel lama terbuka dengan path yang sama', async ({ page }) => {
  test.setTimeout(180_000);
  for (const p of samplePosts()) {
    const res = await page.goto(`/${p.slug}/`);
    expect(res?.status(), p.slug).toBe(200);
    expect(norm(await page.locator('h1').innerText()), p.slug).toBe(norm(p.title));
  }
});

test('URL lama tanpa garis miring akhir tetap sampai', async ({ request }) => {
  const p = samplePosts()[0];
  const res = await request.get(`/${p.slug}`);
  expect(res.status()).toBe(200);
  expect(res.url()).toMatch(new RegExp(`/${p.slug}/$`));
});

for (const path of ['/berita/', '/berita/nasional/', '/berita/daerah/', '/berita/internasional/', '/dawuh/', '/hikmah/', '/tokoh/',
  '/artikel/', '/thariqah/', '/tanya-jawab/', '/pustaka-tasawuf/', '/profile/syahril-mubarok/', '/tag/jatman/']) {
  test(`arsip ${path} = 200`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(200);
  });
}
```

`tests/e2e/a11y.spec.ts`:
```ts
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
```

`tests/e2e/debuglog.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import { DAWUH, NEWS, wp } from './helpers';

test('membuka semua halaman tidak memicu PHP notice/warning dari kode jatman', async ({ page }) => {
  test.setTimeout(120_000);
  wp('eval', 'file_put_contents( WP_CONTENT_DIR . "/debug.log", "" );');
  for (const path of ['/', `/${NEWS}/`, `/${DAWUH}/`, '/berita/', '/berita/nasional/', '/hikmah/', '/profile/syahril-mubarok/',
    '/tag/jatman/', '/?s=jatman', '/?s=zzqx', '/halaman-tidak-ada/', '/tentang/', '/redaksi/']) {
    await page.goto(path);
  }
  const log = wp('eval', 'echo (string) @file_get_contents( WP_CONTENT_DIR . "/debug.log" );');
  const ours = log.split('\n').filter((l) => /PHP (Notice|Warning|Fatal|Deprecated)/.test(l) && /(themes\/jatman|mu-plugins|\/tools\/)/.test(l));
  expect(ours).toEqual([]);
});
```

`tests/e2e/screens.spec.ts`:
```ts
import { test } from '@playwright/test';
import { DAWUH, NEWS } from './helpers';

const PAGES: Record<string, string> = {
  beranda: '/', artikel: `/${NEWS}/`, dawuh: `/${DAWUH}/`, berita: '/berita/', hikmah: '/hikmah/',
  penulis: '/profile/syahril-mubarok/', cari: '/?s=jatman', '404': '/halaman-tidak-ada/', tentang: '/tentang/',
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
        await page.screenshot({ path: `tests/output/screens/${name}-${width}-${mode}.png`, fullPage: true });
      }
    });
  }
}
```

`tests/lighthouse.mjs`:
```js
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const BASE = process.env.JATMAN_URL ?? 'http://localhost:8888';
const PAGES = ['/', '/idarah-aliyyah-jatman-launching-logo-harlah-ke-69/'];
const MIN_PERF = 90;

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
let failed = false;
try {
  for (const path of PAGES) {
    const { lhr } = await lighthouse(BASE + path, {
      port: chrome.port, output: 'json', logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    const s = Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    console.log(`${path}  perf ${s.performance}  a11y ${s.accessibility}  bp ${s['best-practices']}  seo ${s.seo}`);
    if (s.performance < MIN_PERF) {
      failed = true;
      for (const id of ['largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'server-response-time']) {
        console.log(`   ${id}: ${lhr.audits[id]?.displayValue ?? '-'}`);
      }
    }
  }
} finally {
  await chrome.kill();
}
process.exitCode = failed ? 1 : 0;
```

`README.md`:
````markdown
# JATMAN Online — WordPress

Tema block `jatman` + mu-plugin `jatman-core` untuk JATMAN Online, dengan sample artikel asli dari jatman.or.id.

## Menjalankan lokal

Butuh Docker dan Node 24. Repo font [`uthman-taha`](../uthman-taha) harus ada di sebelah repo ini (hanya untuk `npm run brand:build`).

```bash
npm install
npm run env:start        # WordPress di http://localhost:8888 (admin / password)
npm run sample:fetch     # ambil 15 artikel asli → tools/sample/data/
npm run sample:import    # masukkan ke WordPress
```

`npm run sample:reset` mengosongkan lalu mengimpor ulang sample. `npm run env:stop` mematikan WordPress.

## Struktur

- `theme/jatman/`: tampilan (theme.json, template, block dinamis di `blocks/`, CSS di `assets/css/main.css`)
- `mu-plugins/jatman-core/`: aturan konten yang harus tetap ada walau tema diganti (kategori, URL lama, avatar penulis, Pilihan Redaksi)
- `tools/importer/`: importer sumber-agnostik (dipakai sample, nanti migrasi Varient)
- `tools/sample/`: scraper sample dari web lama
- `tools/brand/`: build logo SVG dan font

## Tes

```bash
npm test                 # unit (node:test) + PHP (env tests) + e2e (Playwright)
npm run lint:php && npm run lint:theme-json
npm run screens          # screenshot semua halaman → tests/output/screens/
npm run lighthouse       # performa mobile beranda & artikel (minimal 90)
```

Spec: `docs/superpowers/specs/2026-10-10-jatman-wp-theme-design.md`
````

Tambahkan `tests/output/` ke `.gitignore`.

- [ ] **Step 2: Jalankan seluruh verifikasi**

Run berurutan:
```bash
npm test
npm run lint:php && npm run lint:theme-json
npm run screens
npm run lighthouse
```
Expected:
- `npm test`: semua unit, PHP, dan e2e lulus.
- Lint: exit 0, `theme.json valid`.
- `npm run screens`: 72 file PNG di `tests/output/screens/` (9 halaman × 4 lebar × 2 mode).
- `npm run lighthouse`: dua baris `perf ≥ 90`.

Kalau ada pelanggaran axe (biasanya `color-contrast`), perbaiki nilai warna di `main.css` atau `theme.json` dengan geseran sekecil mungkin dari tabel spec §5, lalu catat perubahannya di pesan commit. Kalau performa < 90, baca empat audit yang dicetak:
- `server-response-time` tinggi: penyebabnya wp-env (Apache dev tanpa page cache). Catat angkanya untuk laporan dan jangan dioptimasi di tema.
- LCP tinggi: pastikan gambar hero `loading="eager"` dan `fetchpriority="high"`, serta `srcset` tersedia.
- CLS: pastikan setiap `<img>` punya `width`/`height`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e tests/lighthouse.mjs README.md .gitignore
git commit -m "test: verifikasi URL lama, aksesibilitas, debug log, screenshot, Lighthouse + README"
```

---

### Task 14: Review visual dengan impeccable + polish

**Files:**
- Modify: `theme/jatman/assets/css/main.css`. Kalau perlu, juga markup di `theme/jatman/templates/*`, `parts/*`, `patterns/*`, dan `inc/*.php` (hanya markup kartu/bagian).

**Interfaces:**
- Consumes: screenshot `tests/output/screens/` (Task 13), situs di `http://localhost:8888`
- Produces: tidak ada interface baru. Nama kelas, nama fungsi, nilai token, dan semua tes tetap.

- [ ] **Step 1: Pastikan screenshot terbaru**

Run: `npm run screens`
Expected: 72 PNG baru di `tests/output/screens/`.

- [ ] **Step 2: Jalankan skill impeccable**

Panggil skill `impeccable` dengan arahan berikut (tempel sebagai argumen):
> Kritik lalu poles tema WordPress JATMAN Online yang berjalan di http://localhost:8888, dengan screenshot di tests/output/screens/ (9 halaman × 375/768/1280/1440 × terang/gelap). Arah desain ada di docs/superpowers/specs/2026-10-10-jatman-wp-theme-design.md §5–§6: portal berita modern yang terang dengan dark mode, hero headline yang jelas (pola NU Online), dan pita rubrik teduh bergaya quran.nu.or.id (krem, motif geometri, emas sebagai aksen langka). Batasan: jangan ubah nilai token warna di theme.json, jangan ubah nama kelas/fungsi/atribut yang dipakai tes di tests/, dan jangan tambah dependensi atau request pihak ketiga. Fokus: hierarki tipografi, ritme spasi, keseimbangan hero di 1280/1440, kerapian kartu tanpa gambar, laci menu di 375/768, kontras dan nuansa dark mode, serta kesan berwibawa dan teduh di rubrik Dawuh/Hikmah.

Ikuti alur skill tersebut. Setiap perubahan dibatasi ke file yang tercantum di bagian **Files** task ini.

- [ ] **Step 3: Verifikasi ulang setelah polish**

Run berurutan:
```bash
npm test
npm run lint:php && npm run lint:theme-json
npm run screens
npm run lighthouse
```
Expected: semua lulus seperti Task 13 Step 2. Lihat ulang screenshot beranda, artikel, dan dawuh di lebar 375 dan 1440 (terang dan gelap) untuk memastikan hasil polish benar-benar tampil.

- [ ] **Step 4: Commit**

```bash
git add theme/jatman
git commit -m "style: polish visual hasil review impeccable"
```

- [ ] **Step 5: Serah terima ke pengguna**

Laporkan ke pengguna:
- Cara membuka: `npm run env:start` lalu http://localhost:8888 (admin: `admin` / `password`). Data sample sudah terimpor.
- Halaman yang perlu di-review: beranda, satu artikel berita, satu artikel Dawuh (varian teduh), `/berita/`, `/hikmah/`, `/profile/syahril-mubarok/`, pencarian, 404, `/tentang/`. Coba juga toggle mode gelap dan tampilan HP.
- Hasil verifikasi: angka Lighthouse dan jumlah tes yang lulus, ditulis apa adanya.
- Hal terbuka: status "Pustaka Tasawuf" (kategori atau bukan, dicek saat migrasi), lisensi font Uthman Taha -ID untuk produksi, dan file logo JATMAN Online asli (AI/SVG) kalau ada (knot saat ini hasil trace dari PNG).
