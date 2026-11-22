import { useMemo, useState } from 'react';
import type { Data, Issue } from '../lib/types';
import { edit, img } from '../lib/supabase';
import { Para, marked, monthYear, plain } from '../lib/text';
import { Go, Plate, SourceTag, topicOf } from './bits';
import { SOURCE_IDS } from '../lib/sources';

interface Props { data: Data; issue: Issue; desk: boolean; onSaved: (msg: string) => void; onError: (msg: string) => void }

/** The home page: the cover spread of one issue. One question, one lead image, the contents, one thread. */
export default function Cover({ data, issue, desk, onSaved, onError }: Props) {
  const items = useMemo(
    () => data.items.filter((i) => i.issue_id === issue.id && data.byKey.has(i.article_key)).sort((a, b) => a.position - b.position),
    [data, issue.id],
  );
  const lead = data.byKey.get((items.find((i) => i.role === 'lead') ?? items[0])?.article_key ?? '');
  const from = `issue:${issue.id}`;
  const keys = new Set(items.map((i) => i.article_key));
  const threads = data.threads.filter((t) => t.status === 'approved' && (keys.has(t.a_key) || keys.has(t.b_key)) && data.byKey.has(t.a_key) && data.byKey.has(t.b_key));
  // A different thread on every visit, and on request.
  const [pick, setPick] = useState(() => Math.floor(Math.random() * 1000));
  const thread = threads.length ? threads[pick % threads.length] : null;
  const leadTopic = topicOf(data, lead);
  const approved = data.threads.filter((t) => t.status === 'approved').length;

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
            <span className="mono">גיליון {String(issue.number).padStart(2, '0')} · {monthYear(issue.published_at) || 'טיוטה'}</span>
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
          <p className="mono kick">השאלה של הגיליון</p>
          {desk ? (
            <div className="desk-fields">
              <label>שם הגיליון<input defaultValue={issue.title} onBlur={(e) => e.target.value.trim() !== issue.title && save({ title: e.target.value })} /></label>
              <label>השאלה<input defaultValue={issue.question} onBlur={(e) => e.target.value.trim() !== issue.question && save({ question: e.target.value })} /></label>
              <label>פתיח (הדגשה ב-**כוכביות**)<textarea rows={3} defaultValue={issue.intro} onBlur={(e) => e.target.value.trim() !== issue.intro && save({ intro: e.target.value })} /></label>
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
              חוט מהגיליון
              {threads.length > 1 && <button className="link" onClick={() => setPick((p) => p + 1)}>חוט אחר</button>}
            </p>
            <p className="pair">
              <Go to={{ a: thread.a_key, from }}>{plain(data.byKey.get(thread.a_key)!.title)}</Go>
              <span className="knot" aria-hidden="true" />
              <Go to={{ a: thread.b_key, from }}>{plain(data.byKey.get(thread.b_key)!.title)}</Go>
            </p>
            <p className="rule">{thread.rule}</p>
            <p className="insight">{marked(thread.insight)}</p>
            <p className="do"><span className="mono">בעיר</span>{thread.action}</p>
          </div>
        )}

        <footer className="cover-foot">
          <Go to={{ view: 'library' }} className="btn">כל {data.articles.length} המאמרים</Go>
          <Go to={{ view: 'threads' }} className="btn">{approved} חוטים מאושרים, {data.threads.filter((t) => t.status === 'proposed').length} מחכים</Go>
          <span className="mono">נכתבו ב-{SOURCE_IDS.length} אפליקציות, נערכו כאן</span>
        </footer>
      </section>
    </main>
  );
}
