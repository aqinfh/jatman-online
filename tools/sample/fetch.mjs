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
import { dropImageBlocks, htmlToBlocks } from './lib/to-blocks.mjs';
import { mediaName } from './lib/media-name.mjs';
import { parsePage } from './lib/parse-page.mjs';

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
      const failedImages = [];
      for (const src of images) {
        try { inlineImages.push({ url: src, file: await download(src) }); }
        catch (e) { failedImages.push(src); console.warn(`! ${item.slug}: gambar isi gagal, dibuang dari isi (${src}): ${e.message}`); }
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
        tags: art.tags, author: art.author.slug, content: dropImageBlocks(markup, failedImages), inline_images: inlineImages, image,
        flags: item.flags, source_url: item.url,
      });
      console.log(`✓ ${item.slug}`);
    } catch (e) {
      failures.push({ slug: item.slug, reason: e.message });
      console.error(`✗ ${item.slug}: ${e.message}`);
    }
  }

  await writeFile(path.join(DATA, 'posts.json'), JSON.stringify({ generated_at: new Date().toISOString(), authors, posts }, null, 2));

  // Halaman statis dari footer web lama.
  const pages = {};
  for (const slug of ['kontak', 'kirim-tulisan', 'terms-conditions']) {
    try {
      pages[slug] = parsePage(await cachedHtml(`https://jatman.or.id/${slug}`, `page-${slug}`), slug);
      console.log(`✓ halaman ${slug}`);
    } catch (e) {
      failures.push({ slug: `halaman ${slug}`, reason: e.message });
      console.error(`✗ halaman ${slug}: ${e.message}`);
    }
  }
  await writeFile(path.join(DATA, 'pages.json'), JSON.stringify(pages, null, 2));
  console.log(`\n${posts.length} ok, ${failures.length} gagal`);
  for (const f of failures) console.log(`  - ${f.slug}: ${f.reason}`);
  if (!posts.length) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
