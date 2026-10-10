import * as cheerio from 'cheerio';
import { htmlToBlocks } from './to-blocks.mjs';

const squash = (s) => s.replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const para = (inner) => `<!-- wp:paragraph -->\n<p>${inner}</p>\n<!-- /wp:paragraph -->`;

/**
 * Halaman statis Varient (Kontak, Kirim Tulisan, Terms & Conditions) → judul + block markup.
 * Kontak: formulir lama (backend Varient + reCAPTCHA) diganti shortcode [jatman_kontak] dari mu-plugin.
 */
export function parsePage(html, slug) {
  const $ = cheerio.load(html);
  const title = squash($('h1.page-title').first().text());
  if (!title) throw new Error(`judul halaman ${slug} tidak ditemukan`);

  if (slug === 'kontak') {
    const intro = $('.page-content .font-text').first().html() ?? '';
    const info = $('.contact-info').first().text().split('\n').map(squash).filter(Boolean);
    const email = info.find((t) => /@/.test(t));
    const address = info.find((t) => !/@/.test(t) && t.length > 10);
    const blocks = [htmlToBlocks(intro).markup, '<!-- wp:shortcode -->\n[jatman_kontak]\n<!-- /wp:shortcode -->'];
    blocks.push('<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">Alamat redaksi</h3>\n<!-- /wp:heading -->');
    if (email) blocks.push(para(`<a href="mailto:${esc(email)}">${esc(email)}</a>`));
    if (address) blocks.push(para(esc(address)));
    return { title, content: blocks.filter(Boolean).join('\n\n') };
  }

  const body = $('.page-content').first();
  if (!body.length) throw new Error(`isi halaman ${slug} tidak ditemukan`);
  // Web lama menulis tebal dengan tanda **…** mentah; rapikan jadi <strong>.
  const cleaned = (body.html() ?? '').replace(/\*\*([^*<>]+?)\*\*/g, '<strong>$1</strong>');
  return { title, content: htmlToBlocks(cleaned).markup };
}
