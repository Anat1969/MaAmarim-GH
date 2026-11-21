import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Article, Data } from './lib/types';
import { loadData } from './lib/supabase';
import { go, href, useRoute } from './lib/route';
import AIMenu, { type MenuItem } from './components/AIMenu';
import Cover from './components/Cover';
import Library from './components/Library';
import Reader from './components/Reader';
import Threads from './components/Threads';
import Issues from './components/Issues';
import ThreadDialog from './components/ThreadDialog';
import { Go } from './components/bits';

const DESK = 'hut-desk';
const read = () => { try { return localStorage.getItem(DESK) === '1'; } catch { return false; } };
const hhmm = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

export default function App() {
  const route = useRoute();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [desk, setDesk] = useState(read);
  const [status, setStatus] = useState('');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [threadFrom, setThreadFrom] = useState<Article | null>(null);

  const reload = useCallback(() => loadData().then((d) => { setData(d); setError(''); }).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.bad ? 6000 : 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const onSaved = useCallback((text: string) => { setToast({ text }); setStatus(`נשמר ${hhmm()}`); reload(); }, [reload]);
  const onError = useCallback((text: string) => setToast({ text: `לא נשמר: ${text}`, bad: true }), []);
  const toggleDesk = useCallback(() => setDesk((d) => { try { localStorage.setItem(DESK, d ? '0' : '1'); } catch { /* private mode */ } return !d; }), []);

  const article = route.a ? data?.byKey.get(route.a) : undefined;
  const issue = useMemo(() => {
    if (!data) return undefined;
    const visible = data.issues.filter((i) => desk || i.status === 'published');
    return visible.find((i) => i.id === route.issue) ?? visible[0];
  }, [data, desk, route.issue]);

  const items = useMemo<MenuItem[]>(() => [
    { label: 'שולחן העריכה', hint: desk ? 'פתוח: נושאים, גיליונות וחוטים ניתנים לעריכה' : 'נושא למאמר, סדר הגיליון, אישור חוטים', pressed: desk, onSelect: toggleDesk },
    ...(desk ? [{ label: 'גיליונות והגיליון הבא', onSelect: () => go({ view: 'issues' }) }] : []),
    ...(article ? [{ label: 'הדפסת המאמר', hint: 'עמוד A4', onSelect: () => window.print() }] : []),
  ], [desk, toggleDesk, article]);

  const tab = route.a ? '' : route.view;
  return (
    <div className={`app ${desk ? 'desk' : ''}`}>
      <header className="bar">
        <a className="brand" href={href({})} onClick={(e) => { e.preventDefault(); go({}); }}>
          <b>חוט</b><span>המגזין מעל האפליקציות</span>
        </a>
        <nav aria-label="חלקי המגזין">
          <Go to={{}} className={tab === 'cover' ? 'on' : ''}>הגיליון</Go>
          <Go to={{ view: 'library' }} className={tab === 'library' ? 'on' : ''}>כל המאמרים</Go>
          <Go to={{ view: 'threads' }} className={tab === 'threads' ? 'on' : ''}>חוטים</Go>
          <Go to={{ view: 'issues' }} className={tab === 'issues' ? 'on' : ''}>גיליונות</Go>
        </nav>
        {desk && <span className="desk-tag mono">שולחן העריכה פתוח. כל שינוי נשמר מיד.</span>}
        <AIMenu items={items} status={status} />
      </header>

      {!data && !error && <p className="mono loading page">אוסף את המאמרים מהאפליקציות</p>}
      {error && (
        <div className="empty-state page">
          <h2>המגזין לא הצליח לקרוא את המאמרים</h2>
          <p>החיבור למאגר נכשל. בדרך כלל זה עובר אחרי רגע.</p>
          <button className="btn on" onClick={reload}>ניסיון נוסף</button>
          <p className="mono">{error}</p>
        </div>
      )}
      {data && (
        route.a
          ? article
            ? <Reader data={data} article={article} route={route} desk={desk} onSaved={onSaved} onError={onError} onThread={setThreadFrom} />
            : <div className="empty-state page"><h2>המאמר הזה כבר לא במגזין</h2><p>ייתכן שהוסר באפליקציה שבה נכתב.</p><Go to={{ view: 'library' }} className="btn on">לכל המאמרים</Go></div>
          : route.view === 'library' ? <Library data={data} route={route} desk={desk} />
          : route.view === 'threads' ? <Threads data={data} route={route} desk={desk} onSaved={onSaved} onError={onError} />
          : route.view === 'issues' ? <Issues data={data} desk={desk} onSaved={onSaved} onError={onError} />
          : issue ? <Cover key={issue.id} data={data} issue={issue} desk={desk} onSaved={onSaved} onError={onError} />
          : <div className="empty-state page"><h2>עוד לא יצא גיליון</h2><p>בינתיים כל המאמרים פתוחים לקריאה.</p><Go to={{ view: 'library' }} className="btn on">לכל המאמרים</Go></div>
      )}

      {data && threadFrom && <ThreadDialog data={data} from={threadFrom} onClose={() => setThreadFrom(null)} onSaved={onSaved} onError={onError} />}
      {toast && <div className={`toast ${toast.bad ? 'bad' : ''}`} role="status">{toast.text}</div>}
    </div>
  );
}
