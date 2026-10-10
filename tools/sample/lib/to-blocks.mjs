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
