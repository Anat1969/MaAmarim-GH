import type { Data, Topic } from '../lib/types';
import { edit } from '../lib/supabase';
import { go } from '../lib/route';
import { monthYear, plain } from '../lib/text';
import { Go, Plate, SourceTag, topicOf } from './bits';
import { img } from '../lib/supabase';

interface Props { data: Data; desk: boolean; onSaved: (m: string) => void; onError: (m: string) => void }

/** An issue is ripe when the collection can carry it: enough articles, from enough apps. */
const RIPE = { apps: 3, articles: 7 };

/** Every question no issue has asked yet, with what the collection already holds for it and what is still missing. */
function candidates(data: Data): { topic: Topic; keys: string[]; threads: number; total: number; apps: number; missing: string }[] {
  const asked = new Set(data.issues.map((i) => i.question));
  return data.topics.filter((t) => !asked.has(t.question)).map((topic) => {
    const mine = (k: string) => data.byKey.get(k)?.topic_id === topic.id;
    const own = data.articles.filter((a) => a.topic_id === topic.id);
    const ts = data.threads.filter((t) => t.status !== 'rejected' && (mine(t.a_key) || mine(t.b_key)));
    const threaded = [...new Set(ts.flatMap((t) => [t.a_key, t.b_key]).filter((k) => data.byKey.has(k)))].sort((a, b) => Number(mine(b)) - Number(mine(a)));
    const keys = [...new Set([...threaded, ...own.map((a) => a.key)])];
    const apps = new Set(own.map((a) => a.source)).size;
    const need = [
      apps < RIPE.apps ? (RIPE.apps - apps === 1 ? 'עוד אפליקציה אחת שכותבת על זה' : `עוד ${RIPE.apps - apps} אפליקציות שכותבות על זה`) : '',
      own.length < RIPE.articles ? (RIPE.articles - own.length === 1 ? 'עוד מאמר אחד' : `עוד ${RIPE.articles - own.length} מאמרים`) : '',
    ].filter(Boolean).join(', ');
    return { topic, keys, threads: ts.length, total: own.length, apps, missing: need };
  }).sort((a, b) => Number(!!a.missing) - Number(!!b.missing) || b.threads - a.threads || b.total - a.total).slice(0, 3);
}

export default function Issues({ data, desk, onSaved, onError }: Props) {
  // An issue in preparation is shown to everyone, marked as such (the entrance does the same).
  const issues = data.issues;
  const next = candidates(data);

  const open = async (c: ReturnType<typeof candidates>[number]) => {
    try {
      const { issue } = await edit<{ issue: { id: string } }>('save_issue', { issue: { title: c.topic.label, question: c.topic.question, intro: '', status: 'draft' } });
      let n = 0;
      for (const key of c.keys.slice(0, 7)) await edit('set_item', { issue_id: issue.id, key, role: n++ === 0 ? 'lead' : 'support', position: n });
      onSaved('טיוטת גיליון נפתחה');
      go({ issue: issue.id });
    } catch (e) { onError((e as Error).message); }
  };

  return (
    <main className="issues">
      <section>
        <h1>{issues.length === 1 ? 'גיליון אחד יצא, והבא כבר מתגבש מהחוטים' : `${issues.length} גיליונות, כל אחד שואל שאלה אחת`}</h1>
        <p className="small kind"><b>מגזין אוצֵר.</b> "כל המאמרים" הוא האוסף הקבוע: כל מה שנכתב באפליקציות. גיליון הוא תערוכה מתחלפת מתוכו: שאלה אחת, טענה אחת, עד שבעה מאמרים משלוש אפליקציות לפחות, חוט מוזהב אחד, ופעולה אחת לעיר.</p>
        <div className="issue-rows">
          {issues.map((i) => {
            const its = data.items.filter((x) => x.issue_id === i.id).sort((a, b) => a.position - b.position);
            const lead = data.byKey.get((its.find((x) => x.role === 'lead') ?? its[0])?.article_key ?? '');
            return (
              <Go key={i.id} to={{ issue: i.id }} className="issue-row">
                <span className="issue-pic">{lead?.image ? <img src={img(lead.image, 480)} alt="" /> : lead ? <Plate article={lead} topic={topicOf(data, lead)} /> : null}</span>
                <span className="num">{String(i.number).padStart(2, '0')}</span>
                <span className="issue-txt">
                  <b>{i.title}</b><i>{i.question}</i>
                  <em>{its.map((x) => plain(data.byKey.get(x.article_key)?.title)).filter(Boolean).join(' · ')}</em>
                </span>
                <span className="mono">{i.status === 'draft' ? 'בהכנה' : monthYear(i.published_at)} · {its.length} מאמרים · {new Set(its.map((x) => data.byKey.get(x.article_key)?.source).filter(Boolean)).size} אפליקציות</span>
              </Go>
            );
          })}
        </div>
      </section>
      <section>
        <h2>{next.some((c) => !c.missing) ? 'הגיליון הבא: שאלות שהאוסף כבר יכול לשאת' : 'השאלות הבאות עוד לא בשלות, וזה מה שחסר להן'}</h2>
        <p className="small">גיליון בשל כשיש לו לפחות {RIPE.articles} מאמרים מ-{RIPE.apps} אפליקציות. שאלה שלא בשלה מראה מה כדאי לכתוב עכשיו.</p>
        <div className="cands">
          {next.map((c) => (
            <div key={c.topic.id} className="cand" style={{ '--c': c.topic.color } as React.CSSProperties}>
              <p className="mono">{c.topic.label}</p>
              <h3>{c.topic.question}</h3>
              <p className="count"><b>{c.total}</b> מאמרים מ-<b>{c.apps}</b> אפליקציות, <b>{c.threads}</b> חוטים</p>
              <p className={`ripe ${c.missing ? 'no' : 'yes'}`}>{c.missing ? `עוד לא בשל. חסר: ${c.missing}.` : 'בשל לגיליון.'}</p>
              <ul>{c.keys.slice(0, 7).map((k) => <li key={k}><Go to={{ a: k }}>{plain(data.byKey.get(k)!.title).split(':')[0]}<SourceTag source={data.byKey.get(k)!.source} article={data.byKey.get(k)!} /></Go></li>)}</ul>
              <div className="cand-foot">
                <Go to={{ view: 'library', topic: c.topic.id }} className="btn">לכל מאמרי הנושא</Go>
                {desk && !c.missing && <button className="btn on" onClick={() => open(c)}>פתיחת טיוטת גיליון</button>}
              </div>
            </div>
          ))}
          {!next.length && <p className="small">כל שאלה שיש באוסף כבר קיבלה גיליון. שאלה חדשה נולדת כשמוסיפים נושא.</p>}
        </div>
      </section>
    </main>
  );
}
