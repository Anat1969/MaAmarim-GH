import { useState } from 'react';
import type { Article, Data, SourceId, Topic } from '../lib/types';
import { SOURCES, SOURCE_IDS } from '../lib/sources';
import { BUILD_IDEAS, NEW_QUESTIONS, WRITE_IDEAS } from '../data/ripen';
import { edit } from '../lib/supabase';
import { go } from '../lib/route';
import { plain } from '../lib/text';
import { Go, SourceTag } from './bits';

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
    const need = missing(own);
    return { topic, keys, threads: ts.length, total: own.length, apps, missing: need };
  }).sort((a, b) => Number(!!a.missing) - Number(!!b.missing) || b.threads - a.threads || b.total - a.total).slice(0, 3);
}

/** What an article list is missing to carry an issue. Empty when it is ripe. */
function missing(list: Article[]): string {
  const apps = new Set(list.map((a) => a.source)).size;
  return [
    apps < RIPE.apps ? (RIPE.apps - apps === 1 ? 'עוד אפליקציה אחת שכותבת על זה' : `עוד ${RIPE.apps - apps} אפליקציות שכותבות על זה`) : '',
    list.length < RIPE.articles ? (RIPE.articles - list.length === 1 ? 'עוד מאמר אחד' : `עוד ${RIPE.articles - list.length} מאמרים`) : '',
  ].filter(Boolean).join(', ');
}

/** The request to paste into the development chat of an app, so that it writes the article the question needs. */
const prompt = (app: SourceId, question: string, label: string, title?: string) =>
  `באפליקציה "${SOURCES[app].label}" (${SOURCES[app].url}): כתוב כתבה חדשה${title ? ` בשם "${title}"` : ''}, שעונה על השאלה "${question}" (הנושא במגזין "חוט": ${label}).\nשמור על המבנה, האורך והסגנון של הכתבות שכבר יש באפליקציה, עם מקור לכל עובדה.\nאחרי הפריסה הכתבה צריכה להופיע לבד במגזין "חוט" (https://maamarim-gh.vercel.app), תחת הנושא "${label}".`;

function Copy({ text, children }: { text: string; children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <button className={`copy-row ${done ? 'done' : ''}`} title={text}
      onClick={async () => {
        setDone(true); setTimeout(() => setDone(false), 1800);
        try { await navigator.clipboard.writeText(text); } catch {
          // A browser that blocks the clipboard: copy through a hidden field instead.
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } finally { ta.remove(); }
        }
      }}>
      {children}
      <span className="copied mono" aria-live="polite">{done ? 'הועתק' : ''}</span>
    </button>
  );
}

/**
 * How to complete a question (Anat, 2026-11-22): which article to write and in which app, with the request ready to copy,
 * and which app to build when nobody writes on it. Cheapest lever first.
 */
function Complete({ id, label, question, list, ripe = false }: { id: string; label: string; question: string; list: Article[]; ripe?: boolean }) {
  const writing = new Set(list.map((a) => a.source));
  const ideas = (WRITE_IDEAS[id] ?? []).filter((i) => !writing.has(i.app));
  const others = SOURCE_IDS.filter((s) => !writing.has(s) && !ideas.some((i) => i.app === s)).slice(0, 3);
  const build = BUILD_IDEAS[id];
  return (
    <details className="complete">
      <summary><span>{ripe ? 'איך מחזקים את הגיליון הזה' : 'איך משלימים'}</span><b>{ideas.length + others.length + (build ? 1 : 0)} הצעות</b></summary>
      <p className="cat">לחיצה על שורה מעתיקה את הבקשה לשיחת הפיתוח של האפליקציה</p>
      <ol>
        {ideas.map((i) => (
          <li key={i.app + i.title}><Copy text={prompt(i.app, question, label, i.title)}>
            <span className="mono">כתבה לכתוב ב{SOURCES[i.app].label}</span>
            <b>{i.title}</b><i>{i.why}</i>
          </Copy></li>
        ))}
        {others.map((s) => (
          <li key={s}><Copy text={prompt(s, question, label)}>
            <span className="mono">אפליקציה שעוד לא כתבה על זה</span>
            <b>{SOURCES[s].label}</b><i>{SOURCES[s].about}</i>
          </Copy></li>
        ))}
        {build && (
          <li><Copy text={`אני בונה אפליקציה חדשה: "${build.name}".\n${build.what}\nהיא צריכה לפרסם את הכתבות שלה כקובץ פתוח (articles.json), כדי שהן יופיעו במגזין "חוט" ויענו על השאלה "${question}".`}>
            <span className="mono">אפליקציה לבנות</span>
            <b>{build.name}</b><i>{build.what}</i>
          </Copy></li>
        )}
      </ol>
    </details>
  );
}

export default function Issues({ data, desk, onSaved, onError }: Props) {
  const next = candidates(data);

  // New questions: only those that are not a topic yet, with the articles of theirs that the collection really holds.
  const fresh = NEW_QUESTIONS.filter((q) => !data.topics.some((t) => t.id === q.id)).map((q) => {
    const list = q.keys.map((k) => data.byKey.get(k)).filter(Boolean) as Article[];
    return { ...q, list, missing: missing(list) };
  });
  const openQuestion = async (q: (typeof fresh)[number]) => {
    try {
      await edit('save_topic', { topic: { id: q.id, label: q.label, question: q.question, color: q.color }, keys: q.list.map((a) => a.key) });
      onSaved('השאלה נפתחה כנושא חדש');
    } catch (e) { onError((e as Error).message); }
  };

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
        <h1>המלצה לעריכה לגיליון הבא</h1>
        <p className="lead-line">{next.some((c) => !c.missing) ? <><mark>{next.filter((c) => !c.missing).length} שאלות כבר בשלות לגיליון.</mark> לכל אחת: הכתבות שעונות עליה, ומה עוד יחזק אותה.</> : 'השאלות הבאות עוד לא בשלות, וזה מה שחסר להן.'}</p>
        <p className="small kind"><b>מגזין אוצֵר.</b> "כל המאמרים" הוא האוסף הקבוע: כל מה שנכתב באפליקציות. גיליון הוא תערוכה מתחלפת מתוכו: שאלה אחת, טענה אחת, עד שבעה מאמרים משלוש אפליקציות לפחות, חוט מוזהב אחד, ופעולה אחת לעיר.</p>
        <p className="small">גיליון בשל כשיש לו לפחות {RIPE.articles} מאמרים מ-{RIPE.apps} אפליקציות. שאלה שלא בשלה מראה מה כדאי לכתוב עכשיו.</p>
        <div className="cands">
          {next.map((c) => (
            <div key={c.topic.id} className="cand" style={{ '--c': c.topic.color } as React.CSSProperties}>
              <p className="mono">{c.topic.label}</p>
              <h3>{c.topic.question}</h3>
              <p className="count"><b>{c.total}</b> מאמרים מ-<b>{c.apps}</b> אפליקציות, <b>{c.threads}</b> חוטים</p>
              <p className={`ripe ${c.missing ? 'no' : 'yes'}`}>{c.missing ? `עוד לא בשל. חסר: ${c.missing}.` : 'בשל לגיליון.'}</p>
              <p className="cat">הכתבות שכבר עונות על השאלה, ובאיזו אפליקציה נכתבו</p>
              <ul>{c.keys.slice(0, 7).map((k) => <li key={k}><Go to={{ a: k }}>{plain(data.byKey.get(k)!.title).split(':')[0]}<SourceTag source={data.byKey.get(k)!.source} article={data.byKey.get(k)!} /></Go></li>)}</ul>
              <Complete id={c.topic.id} label={c.topic.label} question={c.topic.question} list={data.articles.filter((x) => x.topic_id === c.topic.id)} ripe={!c.missing} />
              <div className="cand-foot">
                <Go to={{ view: 'library', topic: c.topic.id }} className="btn">לכל מאמרי הנושא</Go>
                {desk && !c.missing && <button className="btn on" onClick={() => open(c)}>פתיחת טיוטת גיליון</button>}
              </div>
            </div>
          ))}
          {!next.length && <p className="small">כל שאלה שיש באוסף כבר קיבלה גיליון. השאלות הבאות מחכות למטה.</p>}
        </div>
      </section>
      {fresh.length > 0 && (
        <section>
          <h2>אחרי שבע השאלות: שאלות חדשות שהאוסף כבר מתחיל לענות עליהן</h2>
          <p className="small">הצעה של Claude, לא החלטה. שאלה חדשה נפתחת כנושא, והמאמרים שעונים עליה עוברים אליה. מה שחסר לה כתוב לידה, עם בקשה מוכנה להעתקה.</p>
          <div className="cands">
            {fresh.map((q) => (
              <div key={q.id} className="cand" style={{ '--c': q.color } as React.CSSProperties}>
                <p className="mono">{q.label} · שאלה חדשה</p>
                <h3>{q.question}</h3>
                <p className="count">{q.why}</p>
                <p className="count"><b>{q.list.length}</b> מאמרים מ-<b>{new Set(q.list.map((a) => a.source)).size}</b> אפליקציות כבר באוסף</p>
                <p className={`ripe ${q.missing ? 'no' : 'yes'}`}>{q.missing ? `עוד לא בשלה. חסר: ${q.missing}.` : 'בשלה לגיליון.'}</p>
                <p className="cat">הכתבות שכבר עונות על השאלה, ובאיזו אפליקציה נכתבו</p>
                <ul>{q.list.map((a) => <li key={a.key}><Go to={{ a: a.key }}>{plain(a.title).split(':')[0]}<SourceTag source={a.source} article={a} /></Go></li>)}</ul>
                <Complete id={q.id} label={q.label} question={q.question} list={q.list} ripe={!q.missing} />
                <div className="cand-foot">
                  {desk && <button className="btn on" onClick={() => openQuestion(q)}>פתיחת השאלה כנושא חדש</button>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
