// End-to-end check against `vite preview` and the live magazine data (read only: nothing is written).
// Run: npm run build && (npx vite preview --port 4173 &) && node tests/e2e.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:4173';
let failed = 0;
const ok = (cond, name) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) failed++; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
ok(await page.locator('ai-menu .logo').isVisible().catch(() => false) || await page.locator('ai-menu').count() === 1, 'A&I logo button in the top bar');
ok(!(await page.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'no loose development buttons in the bar');
ok(await page.locator('.hero h1').isVisible(), 'cover shows the issue title');
const toc = await page.locator('.toc li a').count();
ok(toc >= 3, `issue contents listed (${toc})`);
ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2), 'cover fits the screen with no page scroll');

await page.locator('.toc li a').nth(1).click();
await page.waitForSelector('.r-body .sec');
ok(await page.locator('.r-hero h1').isVisible(), 'article opens with its title');
ok((await page.locator('.where').innerText()).includes('2 מתוך'), 'pager knows the place in the issue');
const before = await page.locator('.pager').boundingBox();
await page.locator('.pager .pg').last().click();
await page.waitForTimeout(600);
const after = await page.locator('.pager').boundingBox();
ok(before.y === after.y && before.x === after.x, 'pager stays in the same place between articles');
ok((await page.locator('.where').innerText()).includes('3 מתוך'), 'next article opened');
await page.locator('.back').click();
ok(await page.locator('.hero h1').isVisible(), '"חזרה אל" returns to the issue');

await page.goto(`${BASE}/?view=library`, { waitUntil: 'networkidle' });
const all = await page.locator('.card').count();
ok(all > 50, `library lists the articles (${all})`);
await page.locator('.search input').fill('קינצוגי');
await page.waitForTimeout(300);
const found = await page.locator('.card').count();
ok(found >= 1 && found < all, `search narrows the list (${found})`);
ok(page.url().includes('q='), 'search is kept in the address');
await page.locator('.search input').fill('אין-מאמר-כזה');
await page.waitForTimeout(300);
ok(await page.locator('.empty-state').isVisible(), 'empty search explains and offers a way back');

await page.goto(`${BASE}/?view=threads`, { waitUntil: 'networkidle' });
ok(await page.locator('.arc').count() >= 1, 'threads map draws the threads');
await page.locator('.t-row').nth(1).click();
ok(await page.locator('.t-row.on').count() === 1 && page.url().includes('thread='), 'a chosen thread is marked and kept in the address');
ok(await page.locator('.t-detail .seg').count() === 0, 'readers see no editing buttons');

await page.goto(`${BASE}/?view=issues`, { waitUntil: 'networkidle' });
ok(await page.locator('.issue-row').count() >= 1, 'issues are listed');

for (const [w, h] of [[1865, 1160], [1280, 720], [390, 844]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const path of ['/', '/?view=library', '/?view=threads', '/?view=issues']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    ok(!wide, `no horizontal scroll at ${w} on ${path}`);
  }
}
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
process.exit(failed ? 1 : 0);
