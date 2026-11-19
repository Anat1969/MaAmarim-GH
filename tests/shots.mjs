// Screenshots of every main screen against the live data, for the eye check before delivery.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.OUT ?? new URL('./shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const pages = {
  cover: '/',
  culture: '/?a=culture:9892913b-52a3-4a81-a20e-f0108022aba1&from=issue:issue-01',
  mahut: '/?a=mahut:49e1a1d4-9338-47a2-adb9-49fa192b6b41&from=issue:issue-01',
  ishy: '/?a=ishy:532f74cc-41b5-422a-9c69-7d356c2ec7c5&from=issue:issue-01',
  library: '/?view=library',
  threads: '/?view=threads',
  issues: '/?view=issues',
};
const sizes = (process.env.SIZES ?? '1865x1160,1280x720,390x844').split(',').map((s) => s.split('x').map(Number));
const only = process.env.ONLY?.split(',');
const browser = await chromium.launch();
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  for (const [name, path] of Object.entries(pages)) {
    if (only && !only.includes(name)) continue;
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }));
    console.log(`${name} ${w}x${h} scroll ${m.sw}x${m.sh}${m.sw > m.iw ? ' HORIZONTAL SCROLL' : ''}`);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png` });
  }
  await ctx.close();
}
await browser.close();
