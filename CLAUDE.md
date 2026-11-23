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

## The kind of magazine: מגזין אוצֵר (Anat, 2026-11-22, chose "לפי ההמלצה שלך")

Anat asked how the issues are arranged and asked for a name for the kind of magazine, a format, several issues, and a
difference between them, each with a legend and a direct way in. The idea comes from the museum: "כל המאמרים" is the
permanent COLLECTION (everything the apps wrote); an ISSUE is a temporary EXHIBITION out of it, with a curator's claim.
Most articles are in no issue, and that is right.
- What differs between issues: the QUESTION (one per issue; the topic questions are the first seven).
- Fixed format of every issue: one question and one cover image; the curator's claim (`intro`, one marked sentence); a lead
  article and up to six more, from AT LEAST THREE APPS; one golden thread (`mag_issues.thread_id`; a proposed thread shows as
  a proposal); "לעיר", one action for the city (`mag_issues.city`); a LEGEND; its own address (`?issue=<id>`, opens a draft too).
- The legend (`.legend` in `Cover.tsx`) is made of ways in: each app in the issue links to the app, each topic to the
  collection on that topic, plus the signs (lead, approved / proposed thread, the source link).
- THE ENTRANCE (Anat, 2026-11-22: "תוודא שיש דף כניסה למגזין... כמו שיש מקרא בתוך מגזין, יש מקרא למגזינים עצמם"): home
  (`Entrance.tsx`, the brand name returns to it) first presents the magazine, then lists every issue with its number, its
  question, its topic colour and a way in, and closes with a LEGEND OF THE ISSUES (order, colour = topic of the question,
  יצא / בהכנה, the topics already asked, the apps that write, each one a way in). The tab "הגיליון" opens the latest issue
  that is out; an issue lives at `?issue=<id>`.
- An issue in preparation is shown to everyone, marked "בהכנה" (on the entrance, on the issues screen and in the switcher
  on the cover, `.issue-nav`), so Anat sees every issue without switching the desk on.
- THE CONNECTION OF AN ISSUE (Anat, 2026-11-23: "בכל גליון יוסבר ויובן ותהיה תובנה חדשה על ומהקשר בין הכתבות שנבחרו...
  חייב להיות קשר גלוי מנוסח לחיבור מהמובן מאליו לנסתר"): every issue says in words why its articles are together, in three
  steps that go down like stairs: הגלוי (what everyone sees), מתחתיו (the pattern that joins them), הנסתר (a NEW insight that
  no single article says and only the whole issue gives, one marked sentence first). `mag_issues.link_obvious`, `link_under`,
  `link_hidden`; `.cover-link` in `Cover.tsx`, on the cover right under the question and above the contents, visible with no
  scroll; edited on the desk (three fields). It is about ALL the articles of the issue, unlike the golden thread, which joins
  two. The seven texts were written by Claude on 2026-11-23 from the articles themselves: proposals until Anat edits them.
  An issue without it is not finished: the e2e test fails. When drafting a new issue, write its three steps with it.
- Ripeness (`Issues.tsx`, `RIPE`): a question is ripe for an issue at 7 articles from 3 apps; otherwise the screen says what
  is missing. An unripe question is a pointer to what is worth writing next.
- HOW TO COMPLETE A QUESTION (Anat, 2026-11-22: "חשוב גם שתיתן לי את הפתרון. איך אני משלימה את מה שחסר. איזה אפליקציה
  לבנות, איזה מאמר לכתוב"): the ripeness screen never stops at the diagnosis. `Complete` in `Issues.tsx` lists, cheapest
  first: an article to write in an app that already writes (`WRITE_IDEAS` in `src/data/ripen.ts`), apps that have not
  written on the question yet, and an app to build (`BUILD_IDEAS`), each with the request READY TO COPY for the development
  chat of that app. After the seven topic questions, `NEW_QUESTIONS` proposes the next ones from articles already in the
  collection; on the desk one button opens a question as a new topic and moves its articles (`save_topic` in `mag-edit`).
  The help shows for a ripe question too ("איך מחזקים"): it must never vanish from the screen when everything is ripe.
  All of it is Claude's proposal, marked as such. When a question gets an issue or a topic, update `ripen.ts`.
- Issues: 01 התפר המוזהב (published). 02 הדף הלבן, 03 שולחן אחד, 04 משקל הרגע were drafted by Claude on 2026-11-22
  (articles, notes, claim, city action, one proposed thread): DRAFTS until Anat approves them on the desk.
  05 מי שגר (city), 06 לוח השנה של השדה (nature), 07 היד והחישוב (machine) were drafted the same day at her word ("תכין את
  שלושת טיוטות הגיליון למה שהבשיל"), each with a proposed golden thread. Also at her word the two new questions were opened
  as topics: `body` (גוף ובריאות) and `knowledge` (ידע ודורות); nine topics now. Next issues to draft: these two.
- חוקי התנהגות keeps most of its articles inside its code and saves to `chok_articles` only what was edited, so the
  magazine sees 2 of its 8. Anat got a full request for its development chat (2026-11-22) to save all of them to the table
  and to write five more; `mag_article_topics` already holds the topic of those laws (drift-law machine, chestertons-fence
  and eyes-on-the-street city, kleiber-law nature, teaching-law knowledge, naked-mole-rat-law body).

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
npx vite preview --port 4173 & node tests/e2e.mjs     # 94 checks, reads live data, writes nothing
node tests/print.mjs                                   # every article prints on one A4 page (ALL=1 for all)
node tests/shots.mjs                                   # screenshots at 1865, 1280, 390 for the eye check
```
Playwright comes from the global install: `ln -s "$(npm root -g)/playwright" node_modules/playwright`.

## Data (Supabase cultura-GH, ktqmwpbzcnzkhjskqisy, prefix `mag_`)

| Object | Purpose |
|---|---|
| view `mag_articles` | one shape for every source (`key` = `<source>:<uuid>`, title, kicker, lede, quote, image, topic_id, raw). security_invoker: source RLS applies |
| `mag_topics` | 9 topics: label, question, colour (7 at the start; `body` and `knowledge` opened 2026-11-22) |
| `mag_topic_map` | a hint the article already carries in its own app (human_need, topic, radar keyword) -> topic. New articles get a topic by themselves |
| `mag_article_topics` | the editor's override for one article |
| `mag_issues`, `mag_issue_items` | an issue is one question; `intro` = the curator's claim, `city` = the action for the city, `thread_id` = the golden thread; items have role (lead / support), position, note |
| `mag_threads` | two articles + rule (why), insight (what it means), action (what to do in the city); proposed / approved / rejected |
| `mag_source_watch`, fn `mag_unlinked()` | the watch: writing sources not in the magazine yet (ignore / pending) |
| `mag_log` | safety net: every write with the row as it was before |

Sources today: `culture_articles` (מושגי תרבות, 85; the app is cultura-GH on Pages, NOT תרבות וגילוי), `mahut_articles` published (מהות, 20), `ishy_articles` published
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
LINK TO THE SOURCE AND ITS IMAGE (Anat, 2026-11-21): every article links to itself in the app that wrote it, not to the
app's home: `originUrl()` in `src/lib/sources.ts` (culture `#/article/<id>`, mahut and ishy `#/a/<id>`, chok
`/articles?law=<id>`). Anat did not see it when it was only inside the open article ("עדיין לא ראיתי קישור"), so the link is
wherever an article appears: the source sign itself (`SourceTag` with `article`) on every library card, issue row, thread
and related article opens the article in its app in a new tab (a span with role link, because the card is a link); in the
reader a button in the top row ("לאפליקציה שכתבה את המאמר") and the closing line. The e2e test fails if a card has no such link. When adding a source, find its
single-article address and open it in a browser before delivery. The image is the one the source app shows, wherever it keeps
it: ishy has no image of its own and shows the case image from `merhav_readings` (synthesis first, then a lens).
FILE SOURCES (Anat, 2026-11-22: "למה אתה אומר שאין כתבות? ראה כתבות באמירות"): an app that keeps its articles in its own
code, not in a table, publishes them as an open file: `articles.json`, written on every build from its own data, with
`Access-Control-Allow-Origin: *` on that file. The magazine reads it in `loadData` (`FILE_SOURCES` in `src/lib/sources.ts`),
key `<source>:<id>`, topic by the same rule as the view (editor's choice, then `mag_topic_map` with hint = the article id),
body kept in memory for the reader. A file that does not answer leaves the magazine as it is. Such articles have no date
(`created_at` is empty: no date in the reader, group "בלי תאריך"). Connected this way: אמירות (9, template of blocks: p / h /
pull / insight / haiku, `==x==` is a marker). `tests/print.mjs` reads the view only, so file articles are not print-checked.
LESSON: before saying an app has no articles, OPEN THE APP and read its navigation; creations.json is not the list of articles.
Also connected this way (2026-11-22): מזון, גוף ונפש (Tzuna, 9 fixed articles; its file is committed and produced in a
browser by `scripts/articles.mjs` there, its e2e fails when stale; template: four paragraphs, from / to, quote, numbers,
insight, haiku, sources; "החודש" is a live page and is not in the file).
THREE MORE SOURCES AND A SECOND LESSON (Anat, 2026-11-22: "לא אישי! לחבר את גמד על כתפי ענקים. באפליקציה רפואה הכתבות
תחת שם שנקרא יצירות"): גמד על כתפי ענקים (`pras`, 21: six "הגילוי הבא" and fifteen evolution threads of Pritzker and Turing,
from its own articles.json, the [הערכה] / [הנחה] labels travel with the text); רפואה (`refua`, 7) and עולם נעלם (`olam`, 8) are
read straight from the `creations.json` they already publish, with NO change in those apps: by the shared creations standard
every topic there is one A4 article. `FILE_SOURCES` now has a `kind`: `articles` or `creations` (+ `page`, the hash of the
creations page; `?ar-open=<topic>` before it opens that article, added to the shared `creations.js` in AppOfApp-GH).
ANY APP WITH A CREATIONS PAGE IS A SOURCE: joining is one line in `FILE_SOURCES`, one entry in `SOURCES`, and topic hints.
Block sources (`BLOCKS` in `ArticleBody.tsx`: amirot, pras, refua, olam) share one template of blocks.
SECOND LESSON: articles are not always under a tab called "כתבות". Look for "יצירות" too, and read what the page says.
Every file article got a topic through `mag_topic_map` (hint = article id; Claude's assignment, the editor can change each).
`mag-edit` accepts any `<source>:<id>` key, so a new source needs no redeploy there.
A LIVE FILE SOURCE (Anat, 2026-11-22: "כך שאפליקצית מאמרים תקבל אותם גם כשנוצרת כתבה חדשה"): מסלול (`maslul`, the fashion
app MeatsevetOfna-GH) keeps its collections in the database, so its articles.json is not a build file but the edge function
`mo-articles` (read only, same shape, block template). Every collection whose three looks each have a photograph is an article;
a new one arrives with no build and no deploy. Each article opens on its own A4 page (`#/articles/<id>`).
A hint `*` in `mag_topic_map` is the topic of a whole source, so an article born later still gets a topic
(`maslul:*` -> `machine`, Claude's assignment; the editor can change each article).

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
