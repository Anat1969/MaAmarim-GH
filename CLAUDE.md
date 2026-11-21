# CLAUDE.md

## Communication

- Always answer Anat in Hebrew. No icons or emoji, also not in the UI.
- Rules live in https://github.com/Anat1969/Claude-GH (load the skill anat-standards first). Merge to `main` after green checks and deploy at once.
- Delivery: final URL plus one line. Every correction Anat makes about this app is added to this file.

## What this is

"חוט" (MaAmarim-GH): Anat's magazine above her apps. Her own app (not municipal), public. Built 2026-11-19.
Decision (Anat, 2026-11-19): the articles STAY in the apps that wrote them; the magazine is an editing layer on top.
It never copies or writes an article. It holds only the editor's decisions: topics, issues, threads.
The portfolio (AppOfApp-GH) has an entry page to it; the reading engine lives here.

Live: https://maamarim-gh.vercel.app · Pages: https://anat1969.github.io/MaAmarim-GH/

## Design brief (visual doctrine, section 7)

1. Message: articles written apart, one thread between them.
2. Audience and decision: Anat as editor (what belongs together, what is the next issue); a reader (what to read next).
3. Kind of information: long text (article spread, A4), relation (threads map with direction-free arcs, rule / insight / action).
4. Focus: the cover image of the issue; in the reader, the text spread; in threads, the map.
5. Circulation: issue -> article -> thread -> another article, and "חזרה אל" returns to the exact list.

DNA: serif headlines (Frank Ruhl Libre 300/400/500), soft ink #2E2E2B on warm paper, gold line for threads,
one muted colour per topic. A screen is a magazine spread sized to the window (rem scales with vw and vh).
Novelty logged for the evolution log: the threads map (two rails, one per source family; solid = approved, dashed = proposed).

## Stack

Vite + React 18 + TypeScript, plain CSS (`src/styles.css`), no router library: the whole state is in the query string
(`src/lib/route.ts`), so it works on Vercel and on Pages with no rewrites. Keep every path relative.

```bash
npm run build
npx vite preview --port 4173 & node tests/e2e.mjs     # 35 checks, reads live data, writes nothing
node tests/print.mjs                                   # every article prints on one A4 page (ALL=1 for all)
node tests/shots.mjs                                   # screenshots at 1865, 1280, 390 for the eye check
```
Playwright comes from the global install: `ln -s "$(npm root -g)/playwright" node_modules/playwright`.

## Data (Supabase cultura-GH, ktqmwpbzcnzkhjskqisy, prefix `mag_`)

| Object | Purpose |
|---|---|
| view `mag_articles` | one shape for every source (`key` = `<source>:<uuid>`, title, kicker, lede, quote, image, topic_id, raw). security_invoker: source RLS applies |
| `mag_topics` | 7 topics: label, question, colour |
| `mag_topic_map` | a hint the article already carries in its own app (human_need, topic, radar keyword) -> topic. New articles get a topic by themselves |
| `mag_article_topics` | the editor's override for one article |
| `mag_issues`, `mag_issue_items` | an issue is one question; items have role (lead / support), position, note |
| `mag_threads` | two articles + rule (why), insight (what it means), action (what to do in the city); proposed / approved / rejected |
| `mag_source_watch`, fn `mag_unlinked()` | the watch: writing sources not in the magazine yet (ignore / pending) |
| `mag_log` | safety net: every write with the row as it was before |

Sources today: `culture_articles` (תרבות וגילוי, 85), `mahut_articles` published (מהות, 20), `ishy_articles` published
(מהמרחב הפנימי, 5), `chok_articles` joined to `chok_laws` (חוקי התנהגות, 2; key `chok:<law_id>`, the body is one text with
`## heading` blocks that each end in a `**insight**` line; image from `chok_images`). `radar_articles` (relevant, with insight) is not an article of hers: it shows only as "מה קורא העולם" beside
an article of the same topic. To add a source: one more `union all` in the view, an entry in `src/lib/sources.ts`, a template in
`ArticleBody.tsx`, hints in `mag_topic_map`, and the key prefix in `mag-edit` (`KEY`).
NEW ARTICLES AND NEW APPS (Anat, 2026-11-21: "איך אתה דואג שמאמרים חדשים מאפליקציות חדשות יתווספו"): a new article in a
connected source appears by itself (the view reads the source table). A new writing app does not, so there is a watch:
`mag_unlinked()` (public RPC) lists every table in cultura-GH whose name says it holds writing (articles, essays, posts,
stories, maamar, katav) and that the view does not read; `mag_source_watch` holds the tables to ignore and the known sources
that are files, not tables (`pending`). The library shows it on the editing desk only (`Watch` in `Library.tsx`), and the
e2e test fails while a writing table is left outside. When building or upgrading an app that writes articles, connect it
here as part of the delivery. A source the code does not know is dropped in `loadData`, so a view change never breaks the page;
check a view change first through a copy (`VITE_MAG_VIEW=mag_articles_next npm run build`), then replace the real view after deploy.
Not yet in: creations.json of Amirot / Refua / Tzuna / PrasNovel / Olam (static files, not tables), TAARUCHA works (short captions), Drive.

RLS: public read, no write policies. Every write goes through the edge function `mag-edit` (`supabase/functions/mag-edit`,
service role, verify_jwt off). Actions: check, set_topic, save_issue, set_item, remove_item, save_thread, thread_status.

## Editing

Open on every device, no link, key or sign-in (Anat's standing rule). Because the magazine is public, the editing controls are
shown only when "שולחן העריכה" is switched on inside the A&I logo button (kept in localStorage `hut-desk`); it is a view, not a gate.
Readers see approved threads and proposals (dashed), never buttons. Each change saves at once and shows "נשמר".
Images are served small through Supabase image rendering (`img()` in `src/lib/supabase.ts`); the originals are about 1MB each.

## UI rules

- Top bar: name (home), four content tabs, and the one A&I logo button. Nothing else.
- Cover, reader and threads fit the screen with no page scroll; long text scrolls inside its frame. The library is a list and scrolls.
- An image is never cropped (object-fit: contain, or its natural ratio). No image: a plate drawn from the topic colour.
- Reader pager: fixed place and width, names the list it walks ("N מתוך M" + list name). "חזרה אל: <place>" returns with the same filters.
- Every source has its own article template; do not force one mould.
- Every sentence on its own line; the first sentence of a paragraph carries it. `**words**` render as a marker.
- Print: one article on one full A4 page. `beforeprint` sets `html.a4` and shrinks the type from 12pt until the page holds it.
