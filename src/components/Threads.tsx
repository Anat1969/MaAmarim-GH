import { useMemo } from 'react';
import type { Data, Thread } from '../lib/types';
import { edit } from '../lib/supabase';
import { go, type Route } from '../lib/route';
import { marked, plain } from '../lib/text';
import { Go, SourceTag, topicOf } from './bits';

const W = 1000, H = 1000, TOP = 210, BOTTOM = 770, PADL = 40, PADR = 140;
const short = (t: string) => plain(t).split(':')[0];

interface Props { data: Data; route: Route; desk: boolean; onSaved: (m: string) => void; onError: (m: string) => void }

/** The weave: articles written apart, and the threads the editor drew between them. Top rail: one app; bottom rail: the others. */
export default function Threads({ data, route, desk, onSaved, onError }: Props) {
  const threads = useMemo(() => data.threads.filter((t) => t.status !== 'rejected' && data.byKey.has(t.a_key) && data.byKey.has(t.b_key)), [data]);
  const rejected = data.threads.filter((t) => t.status === 'rejected' && data.byKey.has(t.a_key) && data.byKey.has(t.b_key));
  const approved = threads.filter((t) => t.status === 'approved');
  const proposed = threads.filter((t) => t.status === 'proposed');
  const current = data.threads.find((t) => t.id === route.thread) ?? approved[0] ?? threads[0] ?? null;

  const pos = useMemo(() => {
    const isTop = (k: string) => k.startsWith('culture:');
    const bottom: string[] = [];
    threads.forEach((t) => [t.a_key, t.b_key].forEach((k) => { if (!isTop(k) && !bottom.includes(k)) bottom.push(k); }));
    const x = (i: number, n: number) => PADL + ((i + 0.5) * (W - PADL - PADR)) / Math.max(n, 1);
    const map = new Map<string, { x: number; y: number; top: boolean }>();
    bottom.forEach((k, i) => map.set(k, { x: x(i, bottom.length), y: BOTTOM, top: false }));
    // A top article sits above the articles it is tied to, so the threads cross as little as possible.
    const tops = [...new Set(threads.flatMap((t) => [t.a_key, t.b_key]).filter(isTop))];
    const weight = (k: string) => {
      const xs = threads.filter((t) => t.a_key === k || t.b_key === k).map((t) => map.get(t.a_key === k ? t.b_key : t.a_key)?.x).filter((v): v is number => v != null);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : W;
    };
    tops.sort((a, b) => weight(a) - weight(b)).forEach((k, i) => map.set(k, { x: x(i, tops.length), y: TOP, top: true }));
    return map;
  }, [threads]);

  const path = (t: Thread) => {
    const a = pos.get(t.a_key)!, b = pos.get(t.b_key)!;
    if (a.top === b.top) {
      const bend = a.top ? 1 : -1;
      const depth = Math.min(170, 60 + Math.abs(a.x - b.x) / 5);
      return `M${a.x},${a.y} C${a.x},${a.y + bend * depth} ${b.x},${b.y + bend * depth} ${b.x},${b.y}`;
    }
    const mid = (TOP + BOTTOM) / 2;
    return `M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`;
  };
  const colorOf = (t: Thread) => topicOf(data, data.byKey.get(t.a_key))?.color ?? '#2E2E2B';
  const select = (id: string) => go({ view: 'threads', thread: id }, true);
  const setStatus = async (t: Thread, status: Thread['status'], msg: string) => {
    try { await edit('thread_status', { id: t.id, status }); onSaved(msg); } catch (e) { onError((e as Error).message); }
  };
  const articles = new Set(threads.flatMap((t) => [t.a_key, t.b_key])).size;
  const row = (t: Thread) => (
    <button key={t.id} className={`t-row ${current?.id === t.id ? 'on' : ''} ${t.status}`} aria-pressed={current?.id === t.id} onClick={() => select(t.id)} style={{ '--c': colorOf(t) } as React.CSSProperties}>
      <b>{plain(data.byKey.get(t.a_key)!.title)}</b><span className="knot" aria-hidden="true" /><b>{plain(data.byKey.get(t.b_key)!.title)}</b>
    </button>
  );

  return (
    <main className="threads">
      <section className="weave">
        <header>
          <h1><b>{threads.length}</b> חוטים מחברים <b>{articles}</b> מאמרים שנכתבו בנפרד</h1>
          <p className="legend mono">
            <span className="lg solid" />חוט שאושר ({approved.length})
            <span className="lg dashed" />הצעה שמחכה להחלטה ({proposed.length})
            <span>צבע החוט: הנושא. לחיצה על חוט מציגה את הקשר.</span>
          </p>
        </header>
        <div className="weave-scroll">
          <div className="weave-box" style={{ '--n': Math.max(...[true, false].map((top) => [...pos.values()].filter((p) => p.top === top).length), 1) } as React.CSSProperties}>
            <span className="rail-name mono" style={{ top: `${(TOP / H) * 100}%` }}>תרבות וגילוי</span>
            <span className="rail-name mono" style={{ top: `${(BOTTOM / H) * 100}%` }}>מהות, מהמרחב הפנימי</span>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="מפת החוטים בין המאמרים">
              <line x1={PADL} x2={W - PADR} y1={TOP} y2={TOP} className="rail" />
              <line x1={PADL} x2={W - PADR} y1={BOTTOM} y2={BOTTOM} className="rail" />
              {[...threads].sort((a, b) => Number(a.id === current?.id) - Number(b.id === current?.id)).map((t) => (
                <g key={t.id} className={`arc ${t.status} ${current?.id === t.id ? 'on' : ''}`} style={{ '--c': colorOf(t) } as React.CSSProperties} onClick={() => select(t.id)}>
                  <path d={path(t)} className="hit" />
                  <path d={path(t)} className="line" />
                </g>
              ))}
            </svg>
            {[...pos.entries()].map(([k, p]) => {
              const a = data.byKey.get(k)!;
              const hot = !!current && (current.a_key === k || current.b_key === k);
              const at = { left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` };
              return (
                <span key={k}>
                  <span className={`node ${hot ? 'on' : ''}`} style={at} />
                  <Go to={{ a: k, from: 'threads', thread: current?.id ?? null }} className={`node-label ${p.top ? 'top' : 'bottom'} ${hot ? 'on' : ''}`} style={at} title={`לקריאה: ${plain(a.title)}`}>
                    {short(a.title)}
                  </Go>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="t-side">
        {current ? (
          <div className={`t-detail ${current.status}`} key={current.id} style={{ '--c': colorOf(current) } as React.CSSProperties}>
            <p className="mono kick">{current.status === 'approved' ? 'חוט מאושר' : current.status === 'proposed' ? 'הצעה, מחכה להחלטת העורכת' : 'חוט שנדחה'}</p>
            <div className="pair-big">
              {[current.a_key, current.b_key].map((k) => {
                const a = data.byKey.get(k);
                return a ? <Go key={k} to={{ a: k, from: 'threads', thread: current.id }}><SourceTag source={a.source} /><b>{plain(a.title)}</b></Go> : null;
              })}
            </div>
            <dl className="three">
              <div><dt>הכלל: למה הם קשורים</dt><dd>{current.rule}</dd></div>
              <div><dt>התובנה: מה זה אומר</dt><dd className="insight">{marked(current.insight)}</dd></div>
              {current.action && <div className="do"><dt>היישום: מה עושים בעיר</dt><dd>{current.action}</dd></div>}
            </dl>
            {desk && (
              <div className="seg">
                <button className={`btn ${current.status === 'approved' ? 'on' : ''}`} aria-pressed={current.status === 'approved'} onClick={() => setStatus(current, 'approved', 'החוט אושר')}>אישור</button>
                <button className={`btn ${current.status === 'proposed' ? 'on' : ''}`} aria-pressed={current.status === 'proposed'} onClick={() => setStatus(current, 'proposed', 'החוט חזר להצעות')}>להשאיר כהצעה</button>
                <button className={`btn ${current.status === 'rejected' ? 'on' : ''}`} aria-pressed={current.status === 'rejected'} onClick={() => setStatus(current, 'rejected', 'החוט נדחה')}>דחייה</button>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state"><h2>עוד אין חוטים</h2><p>פותחים מאמר, ובשולחן העריכה בוחרים "חוט חדש מכאן".</p></div>
        )}
        <div className="t-lists">
          {approved.length > 0 && <><h2>מאושרים ({approved.length})</h2>{approved.map(row)}</>}
          {proposed.length > 0 && <><h2>מחכים להחלטה ({proposed.length})</h2>{proposed.map(row)}</>}
          {desk && rejected.length > 0 && <><h2>נדחו ({rejected.length})</h2>{rejected.map(row)}</>}
        </div>
      </aside>
    </main>
  );
}
