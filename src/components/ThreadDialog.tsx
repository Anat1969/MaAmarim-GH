import { useEffect, useRef, useState } from 'react';
import type { Article, Data } from '../lib/types';
import { edit } from '../lib/supabase';
import { plain } from '../lib/text';
import { Dictate, SourceTag } from './bits';

interface Props { data: Data; from: Article; onClose: () => void; onSaved: (m: string) => void; onError: (m: string) => void }

/** A new thread from one article to another: the rule, the insight and the action. */
export default function ThreadDialog({ data, from, onClose, onSaved, onError }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState('');
  const [other, setOther] = useState<Article | null>(null);
  const [f, setF] = useState({ rule: '', insight: '', action: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { ref.current?.showModal(); }, []);

  const words = q.trim().split(/\s+/).filter(Boolean);
  const hits = words.length ? data.articles.filter((a) => a.key !== from.key && words.every((w) => `${a.title} ${a.kicker ?? ''}`.includes(w))).slice(0, 6) : [];
  const field = (k: keyof typeof f, label: string, hint: string) => (
    <label>
      <span>{label}<Dictate onText={(t) => setF((s) => ({ ...s, [k]: `${s[k]} ${t}`.trim() }))} /></span>
      <textarea rows={2} value={f[k]} placeholder={hint} onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))} />
    </label>
  );
  const save = async () => {
    if (!other) return;
    setBusy(true);
    try {
      await edit('save_thread', { a_key: from.key, b_key: other.key, ...f });
      onSaved('החוט נשמר ואושר');
      onClose();
    } catch (e) { onError((e as Error).message); setBusy(false); }
  };

  return (
    <dialog ref={ref} className="dlg" onClose={onClose}>
      <button className="x" aria-label="סגירה" onClick={onClose}>×</button>
      <h2>חוט חדש מ"{plain(from.title)}"</h2>
      <p className="small">חוט מחבר שני מאמרים שנכתבו בנפרד. שלוש שורות: למה הם קשורים, מה זה אומר, ומה עושים עם זה.</p>
      {other ? (
        <p className="picked"><SourceTag source={other.source} /><b>{plain(other.title)}</b><button className="link" onClick={() => setOther(null)}>החלפה</button></p>
      ) : (
        <label>
          <span>אל איזה מאמר</span>
          <input autoFocus value={q} placeholder="מקלידים מילה מהכותרת" onChange={(e) => setQ(e.target.value)} />
          <span className="hits">
            {hits.map((a) => <button key={a.key} className="btn" onClick={() => setOther(a)}><SourceTag source={a.source} />{plain(a.title)}</button>)}
            {words.length > 0 && !hits.length && <i className="small">אין מאמר כזה. נסי מילה אחרת.</i>}
          </span>
        </label>
      )}
      {field('rule', 'הכלל: למה הם קשורים', 'שניהם מסרבים למחוק את החתך.')}
      {field('insight', 'התובנה: מה זה אומר', '**התיקון הוא שכבה חדשה**, לא חזרה לאחור.')}
      {field('action', 'היישום: מה עושים בעיר', 'בשיפוץ מבנה ישן: להשאיר את התפר גלוי.')}
      <div className="dlg-foot">
        <button className="btn on" disabled={!other || !f.rule.trim() || busy} onClick={save}>{busy ? 'שומר' : 'מתיחת החוט'}</button>
        {(!other || !f.rule.trim()) && <span className="small">חסר: {!other ? 'המאמר השני' : 'הכלל'}</span>}
      </div>
    </dialog>
  );
}
