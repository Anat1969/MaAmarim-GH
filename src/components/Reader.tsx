import { useEffect, useMemo, useState } from 'react';
import type { Article, Data, World } from '../lib/types';
import { edit, img, loadRaw, loadWorld } from '../lib/supabase';
import { SOURCES, RADAR, originUrl } from '../lib/sources';
import { type Route } from '../lib/route';
import { dayMonth, marked, plain } from '../lib/text';
import ArticleBody, { facts } from './ArticleBody';
import { Go, Plate, SourceTag, TopicDot, topicOf } from './bits';
import { libraryOrder } from './Library';

interface Props { data: Data; article: Article; route: Route; desk: boolean; onSaved: (m: string) => void; onError: (m: string) => void; onThread: (a: Article) => void }

/** The list the pager walks, the name of that list, and the place "חזרה" returns to. */
function context(data: Data, route: Route): { list: Article[]; name: string; back: Partial<Route> } {
  const f = route.from ?? '';
  if (f.startsWith('issue:')) {
    const id = f.slice(6);
    const issue = data.issues.find((i) => i.id === id);
    const list = data.items.filter((i) => i.issue_id === id).sort((a, b) => a.position - b.position).map((i) => data.byKey.get(i.article_key)).filter(Boolean) as Article[];
    if (issue && list.length) return { list, name: `גיליון ${String(issue.number).padStart(2, '0')}: ${issue.title}`, back: { issue: issue.id } };
  }
  if (f === 'threads') {
    const keys = new Set(data.threads.filter((t) => t.status !== 'rejected').flatMap((t) => [t.a_key, t.b_key]));
    return { list: data.articles.filter((a) => keys.has(a.key)), name: 'מאמרים שיש להם חוט', back: { view: 'threads', thread: route.thread } };
  }
  const state = { topic: route.topic, src: route.src, q: route.q, group: route.group };
  const topic = data.topics.find((t) => t.id === route.topic);
  const name = route.q ? `תוצאות החיפוש "${route.q}"` : topic ? `הנושא: ${topic.label}` : route.src ? `המקור: ${SOURCES[route.src as Article['source']]?.label ?? ''}` : 'כל המאמרים';
  return { list: libraryOrder(data, state), name, back: { view: 'library', ...state } };
}

export default function Reader({ data, article, route, desk, onSaved, onError, onThread }: Props) {
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [failed, setFailed] = useState(false);
  const [world, setWorld] = useState<World[]>([]);
  const topic = topicOf(data, article);

  useEffect(() => {
    let live = true;
    setRaw(null); setFailed(false);
    loadRaw(article.key).then((r) => live && setRaw(r ?? {})).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [article.key]);
  useEffect(() => {
    let live = true;
    setWorld([]);
    if (article.topic_id) loadWorld(article.topic_id).then((w) => live && setWorld(w)).catch(() => undefined);
    return () => { live = false; };
  }, [article.topic_id]);
  useEffect(() => { document.title = `${plain(article.title)} · חוט`; return () => { document.title = 'חוט · המגזין של ענת שטיבלמן'; }; }, [article.title]);

  // Print: one article on one full A4 page. Before printing, the type starts large and shrinks until the page holds it all.
  useEffect(() => {
    const root = document.documentElement;
    const fit = () => {
      root.classList.add('a4');
      const el = document.querySelector<HTMLElement>('.reader');
      if (!el) return;
      const max = ((297 - 24) * 96) / 25.4 - 14;
      let pt = 12.4;
      do { pt -= 0.3; root.style.setProperty('--print', `${pt.toFixed(1)}pt`); } while (el.offsetHeight > max && pt > 5.6);
    };
    const done = () => root.classList.remove('a4');
    window.addEventListener('beforeprint', fit);
    window.addEventListener('afterprint', done);
    return () => { window.removeEventListener('beforeprint', fit); window.removeEventListener('afterprint', done); done(); };
  }, []);

  const ctx = useMemo(() => context(data, route), [data, route]);
  const keep = { from: route.from, topic: route.topic, src: route.src, q: route.q, group: route.group, thread: route.thread };
  const at = ctx.list.findIndex((a) => a.key === article.key);
  const prev = at > 0 ? ctx.list[at - 1] : null;
  const next = at >= 0 && at < ctx.list.length - 1 ? ctx.list[at + 1] : null;

  const threads = data.threads
    .filter((t) => (t.a_key === article.key || t.b_key === article.key) && (t.status === 'approved' || (desk && t.status === 'proposed')))
    .map((t) => ({ t, other: data.byKey.get(t.a_key === article.key ? t.b_key : t.a_key) }))
    .filter((x) => x.other);
  const more = data.articles.filter((a) => a.topic_id === article.topic_id && a.key !== article.key && !threads.some((x) => x.other!.key === a.key)).slice(0, 4);
  const inIssues = data.items.filter((i) => i.article_key === article.key);
  const deskIssue = data.issues.find((i) => route.from === `issue:${i.id}`) ?? data.issues[0];
  const item = deskIssue ? inIssues.find((i) => i.issue_id === deskIssue.id) : undefined;

  const run = async (action: string, payload: Record<string, unknown>, msg: string) => {
    try { await edit(action, payload); onSaved(msg); } catch (e) { onError((e as Error).message); }
  };

  return (
    <main className="reader" style={{ '--c': topic?.color ?? '#77756F' } as React.CSSProperties}>
      <div className="crumbs">
        <Go to={ctx.back} className="btn back">חזרה אל: {ctx.name}</Go>
        <a className="origin" href={originUrl(article)} target="_blank" rel="noreferrer" title={`פתיחת המאמר באפליקציה ${SOURCES[article.source].label}`}>
          <span className="mono">המאמר במקור</span>{SOURCES[article.source].label}
        </a>
        <TopicDot topic={topic} />
        <span className="mono">{dayMonth(article.created_at)} {new Date(article.created_at).getFullYear()}</span>
        {desk && (
          <span className="desk-row">
            <label className="mono">נושא
              <select value={article.topic_id ?? ''} onChange={(e) => run('set_topic', { key: article.key, topic_id: e.target.value || null }, 'הנושא נשמר')}>
                <option value="">לפי האפליקציה שבה נכתב</option>
                {data.topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            {deskIssue && (
              <>
                <button className={`btn small ${item ? 'on' : ''}`} aria-pressed={!!item}
                  onClick={() => (item ? run('remove_item', { issue_id: deskIssue.id, key: article.key }, 'הוסר מהגיליון') : run('set_item', { issue_id: deskIssue.id, key: article.key }, 'נוסף לגיליון'))}>
                  {item ? `בגיליון ${String(deskIssue.number).padStart(2, '0')}` : `הוספה לגיליון ${String(deskIssue.number).padStart(2, '0')}`}
                </button>
                {item && (
                  <button className={`btn small ${item.role === 'lead' ? 'on' : ''}`} aria-pressed={item.role === 'lead'}
                    onClick={() => run('set_item', { issue_id: deskIssue.id, key: article.key, role: item.role === 'lead' ? 'support' : 'lead' }, 'נשמר')}>מאמר ראשי</button>
                )}
              </>
            )}
            <button className="btn small" onClick={() => onThread(article)}>חוט חדש מכאן</button>
          </span>
        )}
      </div>

      <aside className="r-side">
        <div className="r-hero">
          {article.image ? <img src={img(article.image, 960)} alt="" /> : <Plate article={article} topic={topic} />}
          <div className="veil">
            {article.kicker && <span className="mono">{article.kicker}</span>}
            <h1>{plain(article.title)}</h1>
            {article.quote && <q>{plain(article.quote)}</q>}
          </div>
        </div>
        {facts(article, raw).length > 0 && (
          <dl className="facts">
            {facts(article, raw).map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
          </dl>
        )}
        <div className="r-links">
          <h2>{threads.length ? `${threads.length === 1 ? 'חוט אחד יוצא' : `${threads.length} חוטים יוצאים`} מהמאמר הזה` : 'עוד באותו נושא'}</h2>
          {threads.map(({ t, other }) => (
            <div key={t.id} className={`thread-card ${t.status}`}>
              <Go to={{ ...keep, a: other!.key }}><SourceTag source={other!.source} /><b>{plain(other!.title)}</b></Go>
              <p className="rule">{t.rule}{t.status === 'proposed' && <span className="mono"> · הצעה, מחכה להחלטה</span>}</p>
              <p className="insight">{marked(t.insight)}</p>
              {t.action && <p className="do"><span className="mono">בעיר</span>{t.action}</p>}
            </div>
          ))}
          {!threads.length && <p className="small">עדיין לא נמתח חוט מהמאמר הזה. בינתיים, מאמרים שעונים על אותה שאלה: {topic?.question}</p>}
          {(threads.length < 2 ? more : more.slice(0, 2)).map((a) => (
            <Go key={a.key} to={{ ...keep, a: a.key }} className="more"><SourceTag source={a.source} /><b>{plain(a.title)}</b><i>{plain(a.lede)}</i></Go>
          ))}
          {world.length > 0 && (
            <>
              <h2>מה קורא העולם על זה</h2>
              {world.map((w) => (
                <a key={w.id} className="more world" href={w.url} target="_blank" rel="noreferrer">
                  <span className="src">{w.source ?? RADAR.label}</span><b>{w.title_he || w.title}</b><i>{plain(w.insight)}</i>
                </a>
              ))}
            </>
          )}
        </div>
      </aside>

      <article className="r-body">
        {article.lede && <p className="lede">{marked(article.lede)}</p>}
        {raw ? <div className="cols"><ArticleBody article={article} raw={raw} back={keep} /></div>
          : failed ? <div className="empty-state"><h2>המאמר לא נטען</h2><p>החיבור למאגר נכשל. רענון הדף מנסה שוב.</p><button className="btn on" onClick={() => location.reload()}>רענון</button></div>
          : <p className="mono loading">טוען את המאמר</p>}
        <p className="origin-line">
          נכתב באפליקציה <a href={SOURCES[article.source].url} target="_blank" rel="noreferrer">{SOURCES[article.source].label}</a>. {SOURCES[article.source].about} המגזין קורא אותו משם, ולא מחזיק עותק. <a href={originUrl(article)} target="_blank" rel="noreferrer">לפתיחת המאמר הזה שם</a>.
        </p>
      </article>

      <nav className="pager" aria-label="מעבר בין מאמרים">
        {prev ? <Go to={{ ...keep, a: prev.key }} className="btn pg"><span className="mono">הקודם</span><b>{plain(prev.title)}</b></Go> : <span className="btn pg off"><span className="mono">הקודם</span><b>זה הראשון ברשימה</b></span>}
        <span className="where mono">{at >= 0 ? `${at + 1} מתוך ${ctx.list.length}` : ''}<i>{ctx.name}</i></span>
        {next ? <Go to={{ ...keep, a: next.key }} className="btn pg"><span className="mono">הבא</span><b>{plain(next.title)}</b></Go> : <span className="btn pg off"><span className="mono">הבא</span><b>זה האחרון ברשימה</b></span>}
      </nav>
    </main>
  );
}
