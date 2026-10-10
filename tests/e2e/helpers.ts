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
