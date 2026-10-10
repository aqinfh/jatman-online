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
