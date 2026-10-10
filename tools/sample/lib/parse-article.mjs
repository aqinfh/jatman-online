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
