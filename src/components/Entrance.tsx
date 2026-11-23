import type { Data, Issue, Topic } from '../lib/types';
import { img } from '../lib/supabase';
import { SOURCES, SOURCE_IDS } from '../lib/sources';
import { monthYear } from '../lib/text';
import { Go, Plate, topicOf } from './bits';

/** The topic an issue belongs to: the one whose question it asks, else the topic of its lead article. */
export function issueTopic(data: Data, issue: Issue): Topic | undefined {
  const its = data.items.filter((x) => x.issue_id === issue.id).sort((a, b) => a.position - b.position);
  const lead = data.byKey.get((its.find((x) => x.role === 'lead') ?? its[0])?.article_key ?? '');
  return data.topics.find((t) => t.question === issue.question) ?? topicOf(data, lead);
}

/**
 * The entrance to the magazine (Anat, 2026-11-22): first what the magazine is, then every issue with its number and its
 * question and a way into it, and a legend for the issues themselves, as each issue has a legend of its own.
 */
export default function Entrance({ data }: { data: Data }) {
  const issues = [...data.issues].sort((a, b) => b.number - a.number);
  const approved = data.threads.filter((t) => t.status === 'approved').length;
  const apps = SOURCE_IDS.map((s) => ({ s, n: data.articles.filter((a) => a.source === s).length })).filter((x) => x.n);
  const rows = issues.map((i) => {
    const its = data.items.filter((x) => x.issue_id === i.id && data.byKey.has(x.article_key)).sort((a, b) => a.position - b.position);
    const lead = data.byKey.get((its.find((x) => x.role === 'lead') ?? its[0])?.article_key ?? '');
    return { i, its, lead, topic: issueTopic(data, i), apps: new Set(its.map((x) => data.byKey.get(x.article_key)!.source)).size };
  });
  const topics = [...new Map(rows.filter((r) => r.topic).map((r) => [r.topic!.id, r.topic!])).values()];
  const out = issues.filter((i) => i.status === 'published').length;

  return (
    <main className="entrance">
      <section className="ent-about">
        <p className="mono">מגזין אוצֵר</p>
        <h1>חוט</h1>
        <p className="ent-claim">מאמרים שנכתבו בנפרד, וחוט אחד ביניהם.</p>
        <p className="ent-text">
          <span>המאמרים נכתבים באפליקציות של ענת שטיבלמן, כל אחד בעולם שלו.</span>
          <span>כאן הם לא מועתקים: <mark>הם נאצרים.</mark></span>
          <span>כל גיליון שואל שאלה אחת, ועונה עליה מכמה עולמות.</span>
        </p>
        <dl className="ent-nums">
          <div><dd>{issues.length}</dd><dt>גיליונות</dt></div>
          <div><dd>{data.articles.length}</dd><dt>מאמרים באוסף</dt></div>
          <div><dd>{apps.length}</dd><dt>אפליקציות</dt></div>
          <div><dd>{approved}</dd><dt>חוטים מאושרים</dt></div>
        </dl>
      </section>

      <section className="ent-issues" aria-label="הגיליונות">
        <h2>{issues.length} גיליונות, שאלה אחת בכל גיליון</h2>
        <div className="ent-rows">
          {rows.map(({ i, its, lead, topic, apps: n }) => (
            <Go key={i.id} to={{ issue: i.id }} className={`issue-row ent-row ${i.status}`} style={{ '--c': topic?.color ?? '#77756F' } as React.CSSProperties} title={`כניסה לגיליון ${i.number}: ${i.title}`}>
              <span className="issue-pic">{lead?.image ? <img src={img(lead.image, 480)} alt="" /> : lead ? <Plate article={lead} topic={topic} /> : null}</span>
              <span className="num">{String(i.number).padStart(2, '0')}</span>
              <span className="issue-txt">
                <b>{i.title}</b><i>{i.question}</i>
                <em><span className="lg-topic">{topic?.label ?? 'בלי נושא'}</span><span>{its.length} מאמרים · {n} אפליקציות</span></em>
              </span>
              <span className={`state mono ${i.status}`}>{i.status === 'published' ? `יצא · ${monthYear(i.published_at)}` : 'בהכנה'}</span>
            </Go>
          ))}
          {!rows.length && <p className="small">עוד לא יצא גיליון. בינתיים כל המאמרים פתוחים לקריאה.</p>}
        </div>
      </section>

      <dl className="legend ent-legend" aria-label="מקרא הגיליונות">
        <div>
          <dt className="mono">מקרא הגיליונות</dt>
          <dd className="lg-signs">
            <span><b className="no">01</b>סדר היציאה</span>
            <span><i className="bar-c" />צבע הפס: נושא השאלה</span>
            <span><b className="state published mono">יצא</b>פורסם לקוראים ({out})</span>
            <span><b className="state draft mono">בהכנה</b>טיוטה שעוד נערכת ({issues.length - out})</span>
            <span>כל שורה היא כניסה לגיליון</span>
          </dd>
        </div>
        <div>
          <dt className="mono">הנושאים שכבר נשאלו</dt>
          <dd>{topics.map((t) => <Go key={t.id} to={{ view: 'library', topic: t.id }} className="lg-topic" style={{ '--c': t.color } as React.CSSProperties} title={`כל מאמרי הנושא ${t.label}`}>{t.label}</Go>)}</dd>
        </div>
        <div>
          <dt className="mono">האפליקציות שכותבות</dt>
          <dd>{apps.map(({ s, n }) => <a key={s} className="src src-link" href={SOURCES[s].url} target="_blank" rel="noreferrer" title={`כניסה לאפליקציה ${SOURCES[s].label}`}>{SOURCES[s].label} · {n}</a>)}</dd>
        </div>
      </dl>
    </main>
  );
}
