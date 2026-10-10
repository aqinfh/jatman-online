import { createHash } from 'node:crypto';
import path from 'node:path';

/** Nama file lokal yang stabil untuk sebuah URL gambar. */
export function mediaName(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  const safe = /^\.(jpe?g|png|webp|gif)$/.test(ext) ? ext : '.jpg';
  return createHash('sha1').update(url).digest('hex').slice(0, 16) + safe;
}
