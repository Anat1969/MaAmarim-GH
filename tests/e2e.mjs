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

// The entrance: what the magazine is, every issue with its number and question and a way in, and a legend for the issues.
await page.goto(BASE, { waitUntil: 'networkidle' });
ok(await page.locator('.ent-about h1').isVisible() && (await page.locator('.ent-about').innerText()).includes('מגזין אוצֵר'), 'the entrance presents the magazine');
const entRows = await page.locator('.ent-row').count();
ok(entRows >= 7, `the entrance lists every issue (${entRows})`);
ok(await page.locator('.ent-row .num').count() === entRows && await page.locator('.ent-row .issue-txt i').count() === entRows, 'each issue shows its number and its question');
ok(await page.locator('.ent-legend .lg-signs span').count() >= 4 && await page.locator('.ent-legend .src-link').count() >= 4, 'the issues have a legend of their own, with ways into the apps');
ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2), 'the entrance fits the screen with no page scroll');
await page.locator('.ent-row').last().click();
ok(page.url().includes('issue=issue-01') && await page.locator('.hero h1').isVisible(), 'a row on the entrance is a way into its issue');
// Every issue says in words why its articles are together: three steps, from what everyone sees to the hidden insight.
{
  const ids = await page.evaluate(async () => (await (await fetch('https://ktqmwpbzcnzkhjskqisy.supabase.co/rest/v1/mag_issues?select=id', { headers: { apikey: 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q' } })).json()).map((r) => r.id));
  let whole = 0, above = 0;
  for (const id of ids) {
    await page.goto(`${BASE}/?issue=${id}`, { waitUntil: 'networkidle' });
    const steps = await page.locator('.cover-link .steps > div').count();
    const hidden = await page.locator('.cover-link .hidden-big mark').count();
    if (steps === 3 && hidden >= 1) whole++;
    // the insight is the first thing under the question, whole on screen, before every fold
    if (await page.locator('.cover-link').evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight && el.getBoundingClientRect().top < document.querySelector('.folds').getBoundingClientRect().top).catch(() => false)) above++;
  }
  ok(ids.length >= 7 && whole === ids.length, `every issue explains the connection between its articles in three steps, ending in a marked insight (${whole} of ${ids.length})`);
  ok(above === ids.length, `the connection sits on the cover above the contents, visible without scrolling (${above} of ${ids.length})`);
  // Hierarchy (Anat, 2026-11-23): the insight is the largest text after the question, and the rest opens on request.
  const sizes = await page.evaluate(() => ['.question', '.hidden-big', '.steps dd', '.intro'].map((q) => parseFloat(getComputedStyle(document.querySelector(q)).fontSize)));
  ok(sizes[0] > sizes[1] && sizes[1] > sizes[2] && sizes[1] > sizes[3], `the insight stands between the question and the rest in size (${sizes.join(' > ')})`);
  ok(await page.locator('.folds details').count() >= 3 && await page.locator('.folds details[open]').count() === 0 && await page.locator('.folds summary').first().isVisible(), 'articles, thread, city and legend wait in folds that open on request');
  await page.locator('.folds summary').first().click();
  await page.locator('.folds summary').nth(1).click();
  ok(await page.locator('.folds details[open]').count() === 1, 'one fold open at a time');
  ok(await page.locator('.toc-head').textContent().then((t) => (t ?? '').includes('נכתב באפליקציה')), 'the list of articles names its columns, including the app that wrote each');
  ok(await page.locator('.issue-nav-row .cat').innerText().then((t) => t.includes('גיליונות')), 'the row of issue numbers says what it is');
  // No text below 13px on any screen, at Anat's window
  for (const path of ['/', '/?issue=issue-01', '/?view=library', '/?view=threads', '/?view=issues']) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const tiny = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() && e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 13).length);
    ok(tiny === 0, `${path}: no text smaller than 13px (${tiny})`);
  }
}
await page.locator('.brand').click();
ok(await page.locator('.ent-about h1').isVisible(), 'the name of the magazine returns to the entrance');

await page.goto(`${BASE}/?issue=issue-01`, { waitUntil: 'networkidle' });
ok(await page.locator('ai-menu .logo').isVisible().catch(() => false) || await page.locator('ai-menu').count() === 1, 'A&I logo button in the top bar');
ok(!(await page.locator('header >> text=העתקת קישור').first().isVisible().catch(() => false)), 'no loose development buttons in the bar');
ok(await page.locator('.hero h1').isVisible(), 'cover shows the issue title');
await page.locator('.folds summary').first().click();
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

await page.goto(`${BASE}/?view=library&src=chok`, { waitUntil: 'networkidle' });
const chok = await page.locator('.card').count();
ok(chok >= 1, `the fourth source, חוקי התנהגות, is in the library (${chok})`);
ok(await page.locator('.watch').count() === 0, 'readers do not see the sources watch');
await page.locator('.card').first().click();
await page.waitForSelector('.r-body .sec');
ok(await page.locator('.r-body .sec h3').count() >= 3 && await page.locator('.r-body .sec .insight').count() >= 1, 'a law article opens in its own template, with sections and insight lines');
const origin = await page.locator('.crumbs a.origin').getAttribute('href');
ok(/chok-tarbut\.vercel\.app\/articles\?law=[a-z0-9-]+$/.test(origin ?? ''), `the reader links to this article in the app that wrote it (${origin})`);
for (const src of ['culture', 'mahut', 'ishy']) {
  await page.goto(`${BASE}/?view=library&src=${src}`, { waitUntil: 'networkidle' });
  await page.locator('.card').first().click();
  await page.waitForSelector('.crumbs a.origin');
  const h = await page.locator('.crumbs a.origin').getAttribute('href');
  ok(/#\/(article|a)\/[0-9a-f-]{36}$/.test(h ?? ''), `${src}: direct link to the article in its own app`);
}
await page.goto(`${BASE}/?view=library&src=ishy`, { waitUntil: 'networkidle' });
ok(await page.locator('.card .card-img img').count() >= 1, 'an ishy article shows the image its own app shows (from the case readings)');
await page.evaluate(() => localStorage.setItem('hut-desk', '1'));
await page.goto(`${BASE}/?view=library`, { waitUntil: 'networkidle' });
await page.waitForSelector('.watch');
const watch = await page.locator('.watch').innerText();
ok(!watch.includes('chok_articles'), 'the watch no longer lists chok_articles as unconnected');
ok(await page.locator('.watch.alert').count() === 0, `no writing table is left outside the magazine: ${watch.split('\n')[0]}`);
await page.evaluate(() => localStorage.removeItem('hut-desk'));

await page.goto(`${BASE}/?view=library`, { waitUntil: 'networkidle' });
const cards = await page.locator('.card').count();
const linked = await page.locator('.card .src-link[data-href^="https://"]').count();
ok(cards > 0 && linked === cards, `every card in the library links to its article in the app that wrote it (${linked} of ${cards})`);
const [popup] = await Promise.all([page.waitForEvent('popup'), page.locator('.card .src-link').first().click()]);
ok(/cultura-GH|magazin-gh|magazinishy|chok-tarbut/.test(popup.url()) && !page.url().includes('a='), `the source sign opens the source app in a new tab and does not open the reader (${popup.url()})`);
await popup.close();
await page.goto(`${BASE}/?issue=issue-01`, { waitUntil: 'networkidle' });
ok(await page.locator('.toc .src-link').count() >= 3, 'the issue contents link each article to its app');

await page.goto(`${BASE}/?view=library&src=amirot`, { waitUntil: 'networkidle' });
const amirot = await page.locator('.card').count();
ok(amirot >= 9, `the fifth source, אמירות, is read from the open file its app publishes (${amirot})`);
ok(await page.locator('.card .card-img img').count() === amirot, 'every Amirot article shows the image its own app shows');
await page.locator('.card').first().click();
await page.waitForSelector('.r-body .sec');
ok(await page.locator('.r-body .pull').count() >= 1 && await page.locator('.r-body .insight').count() >= 1, 'an Amirot article opens in its own template: pulled quote and insight');
ok(/amirot-gh\.vercel\.app\/#\/article\?a=[a-z]+$/.test(await page.locator('.crumbs a.origin').getAttribute('href') ?? ''), 'an Amirot article links to itself in Amirot');

await page.goto(`${BASE}/?view=library&src=tzuna`, { waitUntil: 'networkidle' });
const tzuna = await page.locator('.card').count();
ok(tzuna >= 9, `the sixth source, מזון גוף ונפש, is read from the open file its app publishes (${tzuna})`);
await page.locator('.card').first().click();
await page.waitForSelector('.r-body .sec');
ok(await page.locator('.r-body .para').count() >= 4 && await page.locator('.r-body .haiku').count() === 1, 'a Tzuna article opens in its own template: four paragraphs, numbers, insight, haiku');
ok(/tzuna-gh\.vercel\.app\/#\/articles\?a=[a-z-]+$/.test(await page.locator('.crumbs a.origin').getAttribute('href') ?? ''), 'a Tzuna article links to itself in its app');

await page.goto(`${BASE}/?view=library&src=maslul`, { waitUntil: 'networkidle' });
const maslul = await page.locator('.card').count();
ok(maslul >= 6, `מסלול is read live from its database: every collection with a photograph for each look (${maslul})`);
await page.locator('.card').first().click();
await page.waitForSelector('.r-body .sec');
ok(/meatsevetofna-gh\.vercel\.app\/#\/articles\/[0-9a-f-]+$/.test(await page.locator('.crumbs a.origin').getAttribute('href') ?? ''), 'a מסלול article links to its own A4 page in the app');
ok(await page.locator('.r-body .haiku').count() === 4, 'a מסלול article carries the four haiku with their readings');

for (const [src, min, host] of [['pras', 21, 'prasnovel-gh'], ['refua', 7, 'refua-gh'], ['olam', 8, 'olam-gh']]) {
  await page.goto(`${BASE}/?view=library&src=${src}`, { waitUntil: 'networkidle' });
  const n = await page.locator('.card').count();
  ok(n >= min, `source ${src} is read from the open file its app publishes (${n})`);
  ok(await page.locator('.card .topic-dot.none').count() === 0, `every ${src} article has a topic`);
  await page.locator('.card').first().click();
  await page.waitForSelector('.r-body .sec');
  ok((await page.locator('.crumbs a.origin').getAttribute('href') ?? '').includes(`${host}.vercel.app/`) && await page.locator('.r-body .para, .r-body .pull, .r-body .insight').count() >= 2, `a ${src} article opens as blocks and links to itself in its app`);
}
await page.goto(`${BASE}/?view=issues`, { waitUntil: 'networkidle' });
ok(await page.locator('.complete').count() >= 1 && await page.locator('.complete .copy-row').count() >= 3, 'a question shows how to complete it: what to write, where, and a request ready to copy');
ok(await page.locator('.complete .btn').count() === 0, 'no button per row: the row itself copies the request');
await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
await page.locator('.complete > summary').first().click();
await page.locator('.complete .copy-row').first().click();
ok((await page.locator('.complete .copy-row').first().innerText()).includes('הועתק'), 'the request is copied in one click');

await page.goto(`${BASE}/?view=threads`, { waitUntil: 'networkidle' });
ok(await page.locator('.arc').count() >= 1, 'threads map draws the threads');
await page.locator('.t-row').nth(1).click();
ok(await page.locator('.t-row.on').count() === 1 && page.url().includes('thread='), 'a chosen thread is marked and kept in the address');
ok(await page.locator('.t-detail .seg').count() === 0, 'readers see no editing buttons');

// The format of an issue: its own address, a legend whose entries are ways in, and one action for the city.
for (const id of ['issue-02', 'issue-03', 'issue-04', 'issue-05', 'issue-06', 'issue-07']) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/?issue=${id}`, { waitUntil: 'networkidle' });
  const rows = await page.locator('.toc li a').count();
  const appsIn = await page.locator('.legend .src-link').count();
  ok(rows >= 5 && rows <= 7 && appsIn >= 3, `${id} opens by its own address: ${rows} articles from ${appsIn} apps`);
  ok(await page.locator('.do.city').count() === 1 && await page.locator('.cover-thread').count() === 1, `${id} has a golden thread and an action for the city`);
  ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2), `${id} fits the screen with no page scroll`);
}
ok((await page.locator('.legend .src-link').first().getAttribute('href') ?? '').startsWith('https://'), 'a legend entry is a direct way into the app');
await page.locator('.folds summary', { hasText: 'מקרא' }).click();
await page.locator('.legend .lg-topic').first().click();
ok(page.url().includes('view=library') && page.url().includes('topic='), 'a topic in the legend opens the collection on that topic');
await page.goto(`${BASE}/?issue=issue-01`, { waitUntil: 'networkidle' });
ok(await page.locator('.legend').count() === 1, 'the published issue carries a legend too');

await page.goto(`${BASE}/?view=issues`, { waitUntil: 'networkidle' });
ok(await page.locator('.kind').count() === 1 && await page.locator('.cand .ripe').count() >= 1, 'the issues screen names the kind of magazine and says which question is ripe');
ok(await page.locator('.issue-row').count() === 0, 'the list of issues lives on the entrance only, not again on the next-issue screen');
// One way to each place (Anat, 2026-11-23): what the bar already offers is not repeated on the page.
for (const path of ['/', '/?issue=issue-01', '/?view=library', '/?view=threads', '/?view=issues']) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  const dup = await page.evaluate(() => {
    const bar = new Set([...document.querySelectorAll('.bar nav a')].map((a) => a.getAttribute('href')));
    return [...document.querySelectorAll('main a')].filter((a) => a.classList.contains('btn') && bar.has(a.getAttribute('href'))).map((a) => a.textContent);
  });
  ok(dup.length === 0, `${path}: no button repeats a tab of the bar ${dup.join(' | ')}`);
}
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const cols = await page.evaluate(() => [...document.querySelectorAll('.ent-row')].map((r) => ['.num', '.issue-txt b', '.state'].map((q) => Math.round(r.querySelector(q).getBoundingClientRect().right)).join('/')));
ok(cols.length >= 7 && new Set(cols).size === 1, `the issues on the entrance stand on one grid: number, title and status line up in every row (${new Set(cols).size} column sets)`);

for (const [w, h] of [[1865, 1160], [1280, 720], [390, 844]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const path of ['/', '/?issue=issue-01', '/?view=library', '/?view=threads', '/?view=issues']) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    ok(!wide, `no horizontal scroll at ${w} on ${path}`);
  }
}
ok(errors.length === 0, `no page errors ${errors.join(' | ')}`);
await browser.close();
process.exit(failed ? 1 : 0);
