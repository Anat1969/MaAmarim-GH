import { useMemo, useState } from 'react';
import type { Data, Issue } from '../lib/types';
import { edit, img } from '../lib/supabase';
import { Para, marked, monthYear, plain } from '../lib/text';
import { Go, Plate, SourceTag, topicOf } from './bits';
import { SOURCES, SOURCE_IDS } from '../lib/sources';

interface Props { data: Data; issue: Issue; issues: Issue[]; desk: boolean; onSaved: (msg: string) => void; onError: (msg: string) => void }

/** The home page: the cover spread of one issue. One question, one lead image, the contents, one thread. */
export default function Cover({ data, issue, issues, desk, onSaved, onError }: Props) {
  const items = useMemo(
    () => data.items.filter((i) => i.issue_id === issue.id && data.byKey.has(i.article_key)).sort((a, b) => a.position - b.position),
    [data, issue.id],
  );
  const lead = data.byKey.get((items.find((i) => i.role === 'lead') ?? items[0])?.article_key ?? '');
  const from = `issue:${issue.id}`;
  const keys = new Set(items.map((i) => i.article_key));
  const live = (t: { a_key: string; b_key: string }) => data.byKey.has(t.a_key) && data.byKey.has(t.b_key);
  // The golden thread the editor chose for the issue comes first; without one, an approved thread that passes through it.
  const golden = data.threads.find((t) => t.id === issue.thread_id && t.status !== 'rejected' && live(t));
  const threads = golden ? [golden] : data.threads.filter((t) => t.status === 'approved' && (keys.has(t.a_key) || keys.has(t.b_key)) && live(t));
  // A different thread on every visit, and on request.
  const [pick, setPick] = useState(() => Math.floor(Math.random() * 1000));
  const thread = threads.length ? threads[pick % threads.length] : null;
  // The legend: which apps wrote this issue, which topics it crosses. Every entry is a way in.
  const inIssue = items.map((i) => data.byKey.get(i.article_key)!);
  const apps = SOURCE_IDS.map((s) => ({ s, n: inIssue.filter((a) => a.source === s).length })).filter((x) => x.n);
  const topics = data.topics.map((t) => ({ t, n: inIssue.filter((a) => a.topic_id === t.id).length })).filter((x) => x.n);
  const order = [...issues].sort((a, b) => a.number - b.number);
  const leadTopic = topicOf(data, lead);

  // An opened fold comes into view inside the panel, so what was asked for is in front of the reader.
  const reveal = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const d = e.currentTarget;
    if (d.open) requestAnimationFrame(() => d.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };

  const save = async (patch: Partial<Issue>) => {
    try {
      await edit('save_issue', { issue: { ...issue, ...patch } });
      onSaved('הגיליון נשמר');
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <main className="cover">
      {lead && (
        <Go to={{ a: lead.key, from }} className="hero" title={`לקריאה: ${plain(lead.title)}`}>
          {lead.image ? <img src={img(lead.image, 1600)} alt="" /> : <Plate article={lead} topic={leadTopic} />}
          <div className="veil">
            <span className="mono">גיליון {String(issue.number).padStart(2, '0')} · {monthYear(issue.published_at) || 'בהכנה'}</span>
            <h1>{issue.title}</h1>
            <p className="hero-lead">
              <span className="mono">המאמר הראשי</span>
              <b>{plain(lead.title)}</b>
              {lead.quote && <q>{plain(lead.quote)}</q>}
            </p>
            <span className="enter">לקריאת המאמר</span>
          </div>
        </Go>
      )}

      <section className="cover-side">
        <header>
          {order.length > 1 && (
            <p className="issue-nav-row">
              <span className="cat">גיליונות</span>
              <span className="issue-nav" role="group" aria-label="מעבר בין גיליונות">
                {order.map((i) => (
                  <Go key={i.id} to={{ issue: i.id }} className={`${i.id === issue.id ? 'on' : ''} ${i.status}`} title={`${i.title}: ${i.question}${i.status === 'draft' ? ' (בהכנה)' : ''}`}>
                    {String(i.number).padStart(2, '0')}
                  </Go>
                ))}
              </span>
            </p>
          )}
          {desk ? (
            <div className="desk-fields">
              <label>שם הגיליון<input defaultValue={issue.title} onBlur={(e) => e.target.value.trim() !== issue.title && save({ title: e.target.value })} /></label>
              <label>השאלה<input defaultValue={issue.question} onBlur={(e) => e.target.value.trim() !== issue.question && save({ question: e.target.value })} /></label>
              <label>טענת האוצרת (הדגשה ב-**כוכביות**)<textarea rows={3} defaultValue={issue.intro} onBlur={(e) => e.target.value.trim() !== issue.intro && save({ intro: e.target.value })} /></label>
              <label>הקשר בין הכתבות, 1: הגלוי (מה שכולם רואים)<textarea rows={2} defaultValue={issue.link_obvious ?? ''} onBlur={(e) => e.target.value.trim() !== (issue.link_obvious ?? '') && save({ link_obvious: e.target.value })} /></label>
              <label>2: מה שמתחתיו (הדפוס שמחבר)<textarea rows={2} defaultValue={issue.link_under ?? ''} onBlur={(e) => e.target.value.trim() !== (issue.link_under ?? '') && save({ link_under: e.target.value })} /></label>
              <label>3: הנסתר (התובנה החדשה, הדגשה ב-**כוכביות**)<textarea rows={3} defaultValue={issue.link_hidden ?? ''} onBlur={(e) => e.target.value.trim() !== (issue.link_hidden ?? '') && save({ link_hidden: e.target.value })} /></label>
              <label>לעיר: פעולה אחת שהגיליון מציע<input defaultValue={issue.city} onBlur={(e) => e.target.value.trim() !== issue.city && save({ city: e.target.value })} /></label>
              <button className={`btn small ${issue.status === 'published' ? 'on' : ''}`} aria-pressed={issue.status === 'published'} onClick={() => save({ status: issue.status === 'published' ? 'draft' : 'published' })}>
                {issue.status === 'published' ? 'מפורסם. לחיצה מחזירה לטיוטה' : 'טיוטה. לחיצה מפרסמת'}
              </button>
            </div>
          ) : (
            <>
              <p className="cat">השאלה של הגיליון</p>
              <h2 className="question">{issue.question}</h2>
              <Para text={issue.intro} className="intro" />
            </>
          )}
        </header>

        {/* The heart of the issue: what only all its articles together say, on top; the way to it, aligned, under it. */}
        {(issue.link_obvious || issue.link_under || issue.link_hidden) && (
          <section className="cover-link" aria-label="הקשר בין הכתבות בגיליון">
            <p className="cat">התובנה של הגיליון: מה שרק כל הכתבות יחד אומרות</p>
            {issue.link_hidden && <p className="hidden-big">{marked(issue.link_hidden)}</p>}
            <dl className="steps">
              {issue.link_obvious && <div><dt>הגלוי</dt><dd>{marked(issue.link_obvious)}</dd></div>}
              {issue.link_under && <div><dt>מתחתיו</dt><dd>{marked(issue.link_under)}</dd></div>}
              {issue.link_hidden && <div className="to-hidden"><dt>ומכאן</dt><dd>התובנה שלמעלה</dd></div>}
            </dl>
          </section>
        )}

        {/* The rest opens on request, one fold at a time, so the screen keeps one focus. */}
        <div className="folds">
          <details name="cover-fold" onToggle={reveal}>
            <summary><span>הכתבות בגיליון</span><b>{items.length}</b></summary>
            <ol className="toc" aria-label="תוכן הגיליון">
              {items.length > 0 && <li className="toc-head" aria-hidden="true"><span>מס׳</span><span>הכתבה, ומה היא מוסיפה לשאלה</span><span>נכתב באפליקציה</span></li>}
              {items.map((it, n) => {
                const a = data.byKey.get(it.article_key)!;
                const t = topicOf(data, a);
                return (
                  <li key={a.key} style={{ '--c': t?.color ?? '#77756F' } as React.CSSProperties}>
                    <Go to={{ a: a.key, from }}>
                      <span className="no">{String(n + 1).padStart(2, '0')}</span>
                      <span className="toc-txt">
                        <b>{plain(a.title)}</b>
                        <i>{it.note || plain(a.lede)}</i>
                      </span>
                      <SourceTag source={a.source} article={a} />
                    </Go>
                  </li>
                );
              })}
              {!items.length && <li className="empty">הגיליון עוד ריק. פותחים מאמר, ובשולחן העריכה מוסיפים אותו לגיליון.</li>}
            </ol>
          </details>

          {thread && (
            <details name="cover-fold" onToggle={reveal}>
              <summary><span>{golden ? 'החוט המוזהב: שתי כתבות שמחזיקות זו את זו' : 'חוט מהגיליון'}</span>{thread.status === 'proposed' && <i>הצעה</i>}</summary>
              <div className="cover-thread">
                <p className="pair">
                  <Go to={{ a: thread.a_key, from }}>{plain(data.byKey.get(thread.a_key)!.title)}</Go>
                  <span className="knot" aria-hidden="true" />
                  <Go to={{ a: thread.b_key, from }}>{plain(data.byKey.get(thread.b_key)!.title)}</Go>
                </p>
                <p className="insight">{marked(thread.insight)}</p>
                <p className="rule"><span className="cat">למה</span>{thread.rule}</p>
                {!issue.city && thread.action && <p className="do"><span className="mono">בעיר</span>{thread.action}</p>}
                {threads.length > 1 && <button className="link" onClick={() => setPick((p) => p + 1)}>חוט אחר</button>}
              </div>
            </details>
          )}

          {issue.city && (
            <details name="cover-fold" onToggle={reveal}>
              <summary><span>לעיר: מה הגיליון מציע לעשות</span></summary>
              <p className="do city">{issue.city}</p>
            </details>
          )}

          {items.length > 0 && (
            <details name="cover-fold" onToggle={reveal}>
              <summary><span>מקרא: מי כתב, באילו נושאים, ומה הסימנים</span></summary>
              <dl className="legend" aria-label="מקרא הגיליון">
                <div>
                  <dt>נכתב באפליקציות</dt>
                  <dd>{apps.map(({ s, n }) => <a key={s} className="src src-link" href={SOURCES[s].url} target="_blank" rel="noreferrer" title={`כניסה לאפליקציה ${SOURCES[s].label}`}>{SOURCES[s].label} · {n}</a>)}</dd>
                </div>
                <div>
                  <dt>צבע הפס: הנושא</dt>
                  <dd>{topics.map(({ t, n }) => <Go key={t.id} to={{ view: 'library', topic: t.id }} className="lg-topic" style={{ '--c': t.color } as React.CSSProperties} title={`כל מאמרי הנושא ${t.label}`}>{t.label} · {n}</Go>)}</dd>
                </div>
                <div>
                  <dt>סימנים</dt>
                  <dd className="lg-signs">
                    <span><b className="no">01</b>המאמר הראשי</span>
                    <span><i className="ln solid" />חוט מאושר</span>
                    <span><i className="ln dashed" />חוט מוצע</span>
                    <span><u>שם אפליקציה</u>כניסה למאמר במקור</span>
                  </dd>
                </div>
              </dl>
            </details>
          )}
        </div>
      </section>
    </main>
  );
}
