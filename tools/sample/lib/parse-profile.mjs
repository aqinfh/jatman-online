import * as cheerio from 'cheerio';

/** Bio penulis dari halaman /profile/<slug> Varient. Kosong bila penulis tidak mengisi. */
export function parseProfile(html) {
  const $ = cheerio.load(html);
  return { bio: $('.profile-details .description').first().text().replace(/\s+/g, ' ').trim() };
}
