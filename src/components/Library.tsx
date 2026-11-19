import { useMemo } from 'react';
import type { Article, Data } from '../lib/types';
import { SOURCES, SOURCE_IDS } from '../lib/sources';
import { go, type Route } from '../lib/route';
import { monthYear, plain } from '../lib/text';
import { Card } from './bits';

export function filtered(data: Data, r: Pick<Route, 'topic' | 'src' | 'q'>): Article[] {
  const words = r.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return data.articles.filter((a) => {
    if (r.topic && (r.topic === 'none' ? a.topic_id : a.topic_id !== r.topic)) return false;
    if (r.src && a.source !== r.src) return false;
    if (!words.length) return true;
    const hay = `${a.title} ${a.kicker ?? ''} ${a.lede ?? ''} ${a.quote ?? ''} ${a.hint ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

interface GroupOut { id: string; title: string; sub: string; color?: string; list: Article[] }

export function grouped(data: Data, r: Pick<Route, 'topic' | 'src' | 'q' | 'group'>): GroupOut[] {
  const list = filtered(data, r);
  if (r.group === 'source') {
    return SOURCE_IDS.map((s) => ({ id: s, title: SOURCES[s].label, sub: SOURCES[s].about, list: list.filter((a) => a.source === s) })).filter((g) => g.list.length);
  }
  if (r.group === 'date') {
    const m = new Map<string, Article[]>();
    list.forEach((a) => { const k = a.created_at.slice(0, 7); m.set(k, [...(m.get(k) ?? []), a]); });
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([k, l]) => ({ id: k, title: monthYear(`${k}-15`), sub: 'לפי החודש שבו נכתבו', list: l }));
  }
  const out: GroupOut[] = data.topics.map((t) => ({ id: t.id, title: t.label, sub: t.question, color: t.color, list: list.filter((a) => a.topic_id === t.id) }));
  const none = list.filter((a) => !a.topic_id || !data.topics.some((t) => t.id === a.topic_id));
  if (none.length) out.push({ id: 'none', title: 'בלי נושא', sub: 'מאמרים שעוד לא שויכו. בשולחן העריכה בוחרים להם נושא.', list: none });
  return out.filter((g) => g.list.length);
}

/** The order the reader pages through when it was opened from the library. */
export const libraryOrder = (data: Data, r: Pick<Route, 'topic' | 'src' | 'q' | 'group'>) => grouped(data, r).flatMap((g) => g.list);

const GROUPS: { id: Route['group']; label: string }[] = [
  { id: 'topic', label: 'לפי נושא' },
  { id: 'source', label: 'לפי מקור' },
  { id: 'date', label: 'לפי תאריך' },
];

export default function Library({ data, route }: { data: Data; route: Route }) {
  const groups = useMemo(() => grouped(data, route), [data, route]);
  const total = groups.reduce((n, g) => n + g.list.length, 0);
  const set = (patch: Partial<Route>) => go({ ...route, view: 'library', a: null, ...patch }, true);
  const state = { view: 'library' as const, topic: route.topic, src: route.src, q: route.q, group: route.group };
  const biggest = [...data.topics].map((t) => ({ t, n: data.articles.filter((a) => a.topic_id === t.id).length })).sort((a, b) => b.n - a.n)[0];
  const groupLabel = GROUPS.find((g) => g.id === route.group)!.label;

  return (
    <main className="library">
      <div className="band">
        <div className="band-row">
          <h1>
            {total === data.articles.length
              ? <>{data.articles.length} מאמרים, והנושא הגדול הוא <b>{biggest?.t.label}</b> ({biggest?.n})</>
              : <>{total} מתוך {data.articles.length} מאמרים</>}
          </h1>
          <label className="search">
            <span className="mono">חיפוש</span>
            <input value={route.q} placeholder="מילה מהכותרת, מושג, תרבות" onChange={(e) => set({ q: e.target.value })} />
            {(route.q || route.topic || route.src) && <button className="link" onClick={() => set({ q: '', topic: null, src: null })}>איפוס</button>}
          </label>
        </div>
        <div className="band-row">
          <div className="seg" role="group" aria-label="סידור הרשימה">
            {GROUPS.map((g) => (
              <button key={g.id} className={`btn ${route.group === g.id ? 'on' : ''}`} aria-pressed={route.group === g.id} onClick={() => set({ group: g.id })}>{g.label}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="נושא">
            {data.topics.map((t) => (
              <button key={t.id} className={`chip ${route.topic === t.id ? 'on' : ''}`} aria-pressed={route.topic === t.id}
                style={{ '--c': t.color } as React.CSSProperties} onClick={() => set({ topic: route.topic === t.id ? null : t.id })}>{t.label}</button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="מקור">
            {SOURCE_IDS.map((s) => (
              <button key={s} className={`chip plain ${route.src === s ? 'on' : ''}`} aria-pressed={route.src === s} onClick={() => set({ src: route.src === s ? null : s })}>{SOURCES[s].label}</button>
            ))}
          </div>
          <span className="mono sorted">מסודר {groupLabel}. צבע הפס: הנושא.</span>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.id} className="group" style={{ '--c': g.color ?? '#2E2E2B' } as React.CSSProperties}>
          <header>
            <h2>{g.title}</h2>
            <p>{g.sub}</p>
            <span className="mono">{g.list.length} מאמרים</span>
            {route.group === 'source' && <a className="link" href={SOURCES[g.id as keyof typeof SOURCES].url} target="_blank" rel="noreferrer">לאפליקציה שבה נכתבו</a>}
          </header>
          <div className="grid">
            {g.list.map((a) => <Card key={a.key} data={data} article={a} to={{ ...state, a: a.key, from: 'lib' }} />)}
          </div>
        </section>
      ))}

      {!total && (
        <div className="empty-state">
          <h2>אין מאמר שמתאים לחיפוש הזה</h2>
          <p>אפשר לנסות מילה אחת בלבד, או להסיר את הנושא והמקור.</p>
          <button className="btn on" onClick={() => set({ q: '', topic: null, src: null })}>הצגת כל המאמרים</button>
          <p className="mono">דוגמאות: {data.articles.slice(0, 4).map((a) => plain(a.title)).join(' · ')}</p>
        </div>
      )}
    </main>
  );
}
