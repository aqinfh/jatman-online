import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const BASE = process.env.JATMAN_URL ?? 'http://localhost:8888';
const PAGES = ['/', '/idarah-aliyyah-jatman-launching-logo-harlah-ke-69/'];
const MIN_PERF = 90;
const RUNS = 3; // Lighthouse berfluktuasi antar-run; nilai yang dinilai adalah median.

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
let failed = false;
try {
  for (const path of PAGES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const { lhr } = await lighthouse(BASE + path, {
        port: chrome.port, output: 'json', logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      });
      runs.push(lhr);
    }
    const score = (cat) => median(runs.map((r) => Math.round(r.categories[cat].score * 100)));
    const perfs = runs.map((r) => Math.round(r.categories.performance.score * 100));
    console.log(`${path}  perf ${score('performance')} (run: ${perfs.join('/')})  a11y ${score('accessibility')}  bp ${score('best-practices')}  seo ${score('seo')}`);
    if (score('performance') < MIN_PERF) {
      failed = true;
      const worst = runs[perfs.indexOf(Math.min(...perfs))];
      for (const id of ['largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'server-response-time']) {
        console.log(`   ${id}: ${worst.audits[id]?.displayValue ?? '-'}`);
      }
    }
  }
} finally {
  await chrome.kill();
}
process.exitCode = failed ? 1 : 0;
