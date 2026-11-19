// MaAmarim-GH - every write the magazine makes.
//
// The magazine never writes an article: articles stay in the tables of the apps that wrote them.
// It writes only the editor's decisions: an article's topic, the issues and their order, and the threads.
// Editing is open on every device, with no link or key (Anat's standing rule). The safety net is mag_log:
// every write is recorded with the row as it was before, so any change can be undone.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SB = Deno.env.get('SUPABASE_URL') ?? '';
const SK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const service = { apikey: SK, Authorization: `Bearer ${SK}` };

async function rest(method: string, path: string, body?: unknown, prefer?: string) {
  const res = await fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: { ...service, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const get = (path: string) => rest('GET', path);
const upsert = (table: string, row: unknown) => rest('POST', table, row, 'resolution=merge-duplicates,return=representation');
const log = (action: string, payload: unknown, before: unknown) =>
  rest('POST', 'mag_log', { action, payload, before: before ?? null }, 'return=minimal');

const KEY = /^(culture|mahut|ishy):[0-9a-f-]{36}$/;
const ID = /^[a-z0-9-]{1,60}$/;
const UUID = /^[0-9a-f-]{36}$/;
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
class Bad extends Error {}
const need = (ok: unknown, msg: string) => { if (!ok) throw new Bad(msg); };
const enc = encodeURIComponent;

type P = Record<string, unknown>;

const actions: Record<string, (p: P) => Promise<unknown>> = {
  async check() {
    return { ok: true };
  },

  /** The editor's topic for one article. topic_id null returns the article to the topic its own app gave it. */
  async set_topic(p) {
    const key = String(p.key ?? '');
    need(KEY.test(key), 'מאמר לא מזוהה');
    const before = await get(`mag_article_topics?article_key=eq.${enc(key)}`);
    if (p.topic_id == null || p.topic_id === '') {
      await rest('DELETE', `mag_article_topics?article_key=eq.${enc(key)}`);
    } else {
      const topic = String(p.topic_id);
      need(ID.test(topic), 'נושא לא מזוהה');
      await upsert('mag_article_topics', { article_key: key, topic_id: topic, updated_at: new Date().toISOString() });
    }
    await log('set_topic', p, before);
    return { ok: true };
  },

  async save_issue(p) {
    const i = (p.issue ?? {}) as P;
    const title = text(i.title, 80);
    const question = text(i.question, 120);
    need(title && question, 'לגיליון חסרים שם ושאלה');
    let id = String(i.id ?? '');
    let number = Number(i.number);
    if (!id) {
      const last = await get('mag_issues?select=number&order=number.desc&limit=1');
      number = (last?.[0]?.number ?? 0) + 1;
      id = `issue-${String(number).padStart(2, '0')}`;
    }
    need(ID.test(id) && Number.isInteger(number) && number > 0, 'גיליון לא מזוהה');
    const before = await get(`mag_issues?id=eq.${enc(id)}`);
    const status = i.status === 'published' ? 'published' : 'draft';
    const row = {
      id, number, title, question, intro: text(i.intro, 600), status,
      published_at: status === 'published' ? (before?.[0]?.published_at ?? new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };
    const saved = await upsert('mag_issues', row);
    await log('save_issue', row, before);
    return { ok: true, issue: saved?.[0] ?? row };
  },

  /** Put an article in an issue, or change its place, role or note there. One lead per issue. */
  async set_item(p) {
    const issue = String(p.issue_id ?? '');
    const key = String(p.key ?? '');
    need(ID.test(issue) && KEY.test(key), 'גיליון או מאמר לא מזוהים');
    const role = p.role === 'lead' ? 'lead' : 'support';
    const before = await get(`mag_issue_items?issue_id=eq.${enc(issue)}`);
    if (role === 'lead') {
      await rest('PATCH', `mag_issue_items?issue_id=eq.${enc(issue)}&role=eq.lead`, { role: 'support' });
    }
    const mine = (before ?? []).find((r: P) => r.article_key === key);
    const position = Number.isFinite(Number(p.position)) && p.position != null
      ? Number(p.position)
      : mine?.position ?? Math.max(0, ...(before ?? []).map((r: P) => Number(r.position))) + 1;
    await upsert('mag_issue_items', {
      issue_id: issue, article_key: key, role, position, note: p.note == null ? (mine?.note ?? '') : text(p.note, 120),
    });
    await log('set_item', p, before);
    return { ok: true };
  },

  async remove_item(p) {
    const issue = String(p.issue_id ?? '');
    const key = String(p.key ?? '');
    need(ID.test(issue) && KEY.test(key), 'גיליון או מאמר לא מזוהים');
    const before = await get(`mag_issue_items?issue_id=eq.${enc(issue)}&article_key=eq.${enc(key)}`);
    await rest('DELETE', `mag_issue_items?issue_id=eq.${enc(issue)}&article_key=eq.${enc(key)}`);
    await log('remove_item', p, before);
    return { ok: true };
  },

  async save_thread(p) {
    const a = String(p.a_key ?? '');
    const b = String(p.b_key ?? '');
    need(KEY.test(a) && KEY.test(b) && a !== b, 'חוט מחבר שני מאמרים שונים');
    const rule = text(p.rule, 160);
    need(rule, 'לחוט חסר הכלל: למה שני המאמרים קשורים');
    const before = await get(`mag_threads?or=(and(a_key.eq.${enc(a)},b_key.eq.${enc(b)}),and(a_key.eq.${enc(b)},b_key.eq.${enc(a)}))`);
    const row = {
      ...(before?.[0] ? { id: before[0].id, a_key: before[0].a_key, b_key: before[0].b_key } : { a_key: a, b_key: b }),
      rule, insight: text(p.insight, 200), action: text(p.action, 200),
      status: 'approved', updated_at: new Date().toISOString(),
    };
    const saved = await rest('POST', 'mag_threads?on_conflict=a_key,b_key', row, 'resolution=merge-duplicates,return=representation');
    await log('save_thread', row, before);
    return { ok: true, thread: saved?.[0] ?? row };
  },

  async thread_status(p) {
    const id = String(p.id ?? '');
    const status = String(p.status ?? '');
    need(UUID.test(id) && ['proposed', 'approved', 'rejected'].includes(status), 'חוט לא מזוהה');
    const before = await get(`mag_threads?id=eq.${id}`);
    await rest('PATCH', `mag_threads?id=eq.${id}`, { status, updated_at: new Date().toISOString() });
    await log('thread_status', p, before);
    return { ok: true };
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST בלבד' }, 405);
  try {
    const body = (await req.json()) as P;
    const run = actions[String(body.action ?? '')];
    if (!run) return json({ error: 'פעולה לא מוכרת' }, 400);
    return json(await run(body));
  } catch (e) {
    if (e instanceof Bad) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: 'השמירה נכשלה. נסי שוב בעוד רגע.' }, 500);
  }
});
