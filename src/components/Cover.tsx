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
          <p className="mono kick">
            השאלה של הגיליון
            {order.length > 1 && (
              <span className="issue-nav" role="group" aria-label="מעבר בין גיליונות">
                {order.map((i) => (
                  <Go key={i.id} to={{ issue: i.id }} className={`${i.id === issue.id ? 'on' : ''} ${i.status}`} title={`${i.title}: ${i.question}${i.status === 'draft' ? ' (בהכנה)' : ''}`}>
                    {String(i.number).padStart(2, '0')}
                  </Go>
                ))}
              </span>
            )}
          </p>
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
              <h2 className="question">{issue.question}</h2>
              <Para text={issue.intro} className="intro" />
            </>
          )}
        </header>

        {(issue.link_obvious || issue.link_under || issue.link_hidden) && (
          <section className="cover-link" aria-label="הקשר בין הכתבות בגיליון">
            <p className="mono kick">למה הכתבות האלה יחד · מהגלוי אל הנסתר</p>
            <ol>
              {issue.link_obvious && <li><span className="mono">הגלוי</span><p>{marked(issue.link_obvious)}</p></li>}
              {issue.link_under && <li><span className="mono">מתחתיו</span><p>{marked(issue.link_under)}</p></li>}
              {issue.link_hidden && <li className="hidden-step"><span className="mono">הנסתר</span><p>{marked(issue.link_hidden)}</p></li>}
            </ol>
          </section>
        )}

        <ol className="toc" aria-label="תוכן הגיליון">
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

        {thread && (
          <div className="cover-thread">
            <p className="mono kick">
              {golden ? 'החוט המוזהב של הגיליון' : 'חוט מהגיליון'}
              {thread.status === 'proposed' && <span>הצעה, מחכה להחלטה</span>}
              {threads.length > 1 && <button className="link" onClick={() => setPick((p) => p + 1)}>חוט אחר</button>}
            </p>
            <p className="pair">
              <Go to={{ a: thread.a_key, from }}>{plain(data.byKey.get(thread.a_key)!.title)}</Go>
              <span className="knot" aria-hidden="true" />
              <Go to={{ a: thread.b_key, from }}>{plain(data.byKey.get(thread.b_key)!.title)}</Go>
            </p>
            <p className="rule">{thread.rule}</p>
            <p className="insight">{marked(thread.insight)}</p>
            {!issue.city && <p className="do"><span className="mono">בעיר</span>{thread.action}</p>}
          </div>
        )}

        {issue.city && <p className="do city"><span className="mono">לעיר</span>{issue.city}</p>}

        {items.length > 0 && (
          <dl className="legend" aria-label="מקרא הגיליון">
            <div>
              <dt className="mono">מקרא · נכתב ב</dt>
              <dd>{apps.map(({ s, n }) => <a key={s} className="src src-link" href={SOURCES[s].url} target="_blank" rel="noreferrer" title={`כניסה לאפליקציה ${SOURCES[s].label}`}>{SOURCES[s].label} · {n}</a>)}</dd>
            </div>
            <div>
              <dt className="mono">צבע הפס · נושא</dt>
              <dd>{topics.map(({ t, n }) => <Go key={t.id} to={{ view: 'library', topic: t.id }} className="lg-topic" style={{ '--c': t.color } as React.CSSProperties} title={`כל מאמרי הנושא ${t.label}`}>{t.label} · {n}</Go>)}</dd>
            </div>
            <div>
              <dt className="mono">סימנים</dt>
              <dd className="lg-signs">
                <span><b className="no">01</b>המאמר הראשי</span>
                <span><i className="ln solid" />חוט מאושר</span>
                <span><i className="ln dashed" />חוט מוצע</span>
                <span><u>שם אפליקציה</u>כניסה למאמר במקור</span>
              </dd>
            </div>
          </dl>
        )}

      </section>
    </main>
  );
}
