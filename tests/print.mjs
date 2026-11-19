// Every kind of article prints on exactly one A4 page. Run against `vite preview`.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE ?? 'http://localhost:4173';
const b = await chromium.launch(); const p = await b.newPage();
const rows = await (await fetch('https://ktqmwpbzcnzkhjskqisy.supabase.co/rest/v1/mag_articles?select=key,raw&apikey=sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q')).json();
rows.sort((a, c) => JSON.stringify(c.raw).length - JSON.stringify(a.raw).length);
const of = (s) => rows.filter((r) => r.key.startsWith(s));
const pick = process.env.ALL ? rows : [...of('mahut').slice(0, 3), ...of('mahut').slice(-1), ...of('culture').slice(0, 2), ...of('culture').slice(-1), ...of('ishy').slice(0, 2)];
let bad = 0;
for (const r of pick) {
  await p.goto(`${BASE}/?a=${r.key}`, { waitUntil: 'networkidle' });
  await p.waitForSelector('.r-body .sec, .r-body .turn');
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  const buf = await p.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  const n = (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const pt = await p.evaluate(() => document.documentElement.style.getPropertyValue('--print'));
  if (n !== 1) bad++;
  if (n !== 1 || !process.env.ALL) console.log(`${n === 1 ? 'ok  ' : 'FAIL'} ${r.key.slice(0, 16)} pages ${n} type ${pt}`);
  if (process.env.SAVE && r === pick[0]) fs.writeFileSync(process.env.SAVE, buf);
}
console.log(`${pick.length - bad} of ${pick.length} articles print on one A4 page`);
await b.close();
process.exit(bad ? 1 : 0);
