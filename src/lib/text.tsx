import { Fragment, type ReactNode } from 'react';

/** `**words**` become a marker. */
export function marked(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

/** Sentences of a paragraph. A full stop inside a number or after a single letter does not end a sentence. */
export function sentences(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').replace(/\}$/, '').trim();
  if (!clean) return [];
  return clean.split(/(?<=[^\d\s.][.!?]["'״”)]?)\s+(?=\S)/).filter(Boolean);
}

/** Every sentence on its own line; the first one carries the paragraph (Anat's rule for long text). */
export function Para({ text, lead = true, className = '' }: { text: string | null | undefined; lead?: boolean; className?: string }) {
  if (!text) return null;
  const s = sentences(text);
  return (
    <p className={`para ${className}`}>
      {s.map((x, i) => (
        <span key={i} className={i === 0 && lead ? 'sent first' : 'sent'}>{marked(x)}</span>
      ))}
    </p>
  );
}

export const plain = (t: string | null | undefined) => (t ?? '').replace(/\*\*/g, '');

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export const monthYear = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
export const dayMonth = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ב${MONTHS[d.getMonth()]}`;
};
