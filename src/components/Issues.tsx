import type { Data, Topic } from '../lib/types';
import { edit } from '../lib/supabase';
import { go } from '../lib/route';
import { monthYear, plain } from '../lib/text';
import { Go, Plate, SourceTag, topicOf } from './bits';
import { img } from '../lib/supabase';

interface Props { data: Data; desk: boolean; onSaved: (m: string) => void; onError: (m: string) => void }

/** Topics that could carry the next issue: the more threads already run through a topic, the readier it is. */
function candidates(data: Data): { topic: Topic; keys: string[]; threads: number; total: number }[] {
  const asked = new Set(data.issues.map((i) => i.question));
  return data.topics.filter((t) => !asked.has(t.question)).map((topic) => {
    const mine = (k: string) => data.byKey.get(k)?.topic_id === topic.id;
    const ts = data.threads.filter((t) => t.status !== 'rejected' && (mine(t.a_key) || mine(t.b_key)));
    const keys = [...new Set(ts.flatMap((t) => [t.a_key, t.b_key]).filter((k) => data.byKey.has(k)))].sort((a, b) => Number(mine(b)) - Number(mine(a)));
    return { topic, keys, threads: ts.length, total: data.articles.filter((a) => a.topic_id === topic.id).length };
  }).filter((c) => c.threads > 0).sort((a, b) => b.threads - a.threads || b.total - a.total).slice(0, 3);
}

export default function Issues({ data, desk, onSaved, onError }: Props) {
  const issues = data.issues.filter((i) => desk || i.status === 'published');
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
        <h1>{issues.length === 1 ? 'גיליון אחד יצא, והבא כבר מתגבש מהחוטים' : `${issues.length} גיליונות, כל אחד סביב שאלה אחת`}</h1>
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
                <span className="mono">{i.status === 'draft' ? 'טיוטה' : monthYear(i.published_at)} · {its.length} מאמרים</span>
              </Go>
            );
          })}
        </div>
      </section>
      <section>
        <h2>הגיליון הבא: שלוש שאלות שהחומר כבר שואל</h2>
        <p className="small">גיליון לא מתוכנן מראש. הוא עולה מהחוטים: נושא שכבר עוברים בו כמה חוטים מוכן להפוך לגיליון.</p>
        <div className="cands">
          {next.map((c) => (
            <div key={c.topic.id} className="cand" style={{ '--c': c.topic.color } as React.CSSProperties}>
              <p className="mono">{c.topic.label}</p>
              <h3>{c.topic.question}</h3>
              <p className="count"><b>{c.threads}</b> חוטים עוברים כאן, מתוך <b>{c.total}</b> מאמרים בנושא</p>
              <ul>{c.keys.slice(0, 7).map((k) => <li key={k}><Go to={{ a: k }}>{plain(data.byKey.get(k)!.title).split(':')[0]}<SourceTag source={data.byKey.get(k)!.source} article={data.byKey.get(k)!} /></Go></li>)}</ul>
              <div className="cand-foot">
                <Go to={{ view: 'library', topic: c.topic.id }} className="btn">לכל מאמרי הנושא</Go>
                {desk && <button className="btn on" onClick={() => open(c)}>פתיחת טיוטת גיליון</button>}
              </div>
            </div>
          ))}
          {!next.length && <p className="small">עוד אין נושא עם חוטים. מאשרים חוטים במפת החוטים, והצעות לגיליון יופיעו כאן.</p>}
        </div>
      </section>
    </main>
  );
}
