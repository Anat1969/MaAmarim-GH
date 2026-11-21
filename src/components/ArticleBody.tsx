import type { Article } from '../lib/types';
import { img } from '../lib/supabase';
import { Para, marked, plain } from '../lib/text';
import { Go } from './bits';
import type { Route } from '../lib/route';

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []); // eslint-disable-line @typescript-eslint/no-explicit-any

const LENS: Record<string, string> = { biographical: 'עדשה ביוגרפית', tzimtzum: 'עדשת הצמצום', buddhist: 'עדשה בודהיסטית' };

function Sec({ title, tone, children }: { title: string; tone?: 'do' | 'quiet'; children: React.ReactNode }) {
  return (
    <section className={`sec ${tone ? `sec-${tone}` : ''}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Each source keeps its own structure, so each gets its own template, not one mould for all. */
export default function ArticleBody({ article, raw, back }: { article: Article; raw: Raw; back: Partial<Route> }) {
  if (article.source === 'culture') {
    const o = (raw.origin ?? {}) as Raw;
    const p = (raw.practice ?? {}) as Raw;
    const lang = (o.lang ?? {}) as Raw;
    return (
      <>
        <Sec title="המושג"><Para text={raw.insight} /></Sec>
        {arr(raw.interpretation).length > 0 && (
          <Sec title="מבט מכאן">
            <ol className="steps">{arr(raw.interpretation).map((x, i) => <li key={i}>{marked(String(x))}</li>)}</ol>
          </Sec>
        )}
        {raw.image_interior && (
          <figure className="sec fig">
            <img src={img(raw.image_interior, 960)} alt="" loading="lazy" />
            <figcaption><span className="mono">החדר</span>{raw.space_name}</figcaption>
          </figure>
        )}
        {(p.how || p.why) && (
          <Sec title="איך מיישמים" tone="do">
            <dl className="practice">
              {p.how && <div><dt>מה עושים</dt><dd>{p.how}</dd></div>}
              {p.why && <div><dt>למה</dt><dd>{p.why}</dd></div>}
              {p.when && <div><dt>מתי</dt><dd>{p.when}</dd></div>}
              {p.where && <div><dt>איפה</dt><dd>{p.where}</dd></div>}
            </dl>
          </Sec>
        )}
        {(o.story || lang.untranslatable) && (
          <Sec title="מאיפה זה בא" tone="quiet">
            <Para text={o.story} />
            {lang.untranslatable && <Para text={lang.untranslatable} lead={false} />}
            {o.figure && <p className="small">{o.figure}</p>}
            {o.source && <a className="source" href={o.source} target="_blank" rel="noreferrer">מקור: {String(o.basis ?? 'קישור')}</a>}
          </Sec>
        )}
      </>
    );
  }

  if (article.source === 'mahut') {
    return (
      <>
        {raw.root_id && (
          <p className="sec series">
            <span className="mono">חלק {raw.part_number} בסדרה</span>
            <Go to={{ ...back, a: `mahut:${raw.root_id}` }}>{raw.root_title}</Go>
            {raw.bridge && <i>{raw.bridge}</i>}
          </p>
        )}
        {arr(raw.sections).map((s, i) => (
          <Sec key={i} title={plain(s.heading)}><Para text={s.content ?? s.body} /></Sec>
        ))}
        {raw.pragmatic_action && <Sec title="לעשות השבוע" tone="do"><Para text={raw.pragmatic_action} lead={false} /></Sec>}
      </>
    );
  }

  if (article.source === 'chok') {
    const law = (raw.law ?? {}) as Raw;
    return (
      <>
        {chokSections(String(raw.text ?? '')).map((s, i) => (
          <Sec key={i} title={s.heading} tone={s.heading === 'בעיר' ? 'do' : undefined}>
            {s.paras.map((p, j) => <Para key={j} text={p} lead={j === 0} />)}
            {s.insight && <p className="insight">{marked(`**${s.insight}**`)}</p>}
          </Sec>
        ))}
        {arr(law.examples).length > 0 && (
          <Sec title="אותו חוק בעולמות אחרים" tone="quiet">
            <dl className="practice">
              {arr(law.examples).map((x, i) => <div key={i}><dt>{x.domain}</dt><dd>{x.description}</dd></div>)}
            </dl>
          </Sec>
        )}
      </>
    );
  }

  const syn = (raw.synthesis ?? {}) as Raw;
  const turn = (raw.turn ?? {}) as Raw;
  return (
    <>
      {(turn.from || turn.to) && (
        <p className="sec turn">
          <span className="from"><span className="mono">מ</span>{turn.from}</span>
          <span className="to"><span className="mono">אל</span>{turn.to}</span>
        </p>
      )}
      {arr(raw.sections).map((s, i) => (
        <Sec key={i} title={plain(s.heading)}>
          {s.lens && <p className="mono lens">{LENS[s.lens] ?? s.lens}</p>}
          {s.insight && <p className="insight">{marked(s.insight)}</p>}
          <Para text={s.body} lead={false} />
        </Sec>
      ))}
      {syn.body && (
        <Sec title={plain(syn.heading) || 'נקודת מפגש'}>
          {syn.insight && <p className="insight">{marked(syn.insight)}</p>}
          <Para text={syn.body} lead={false} />
        </Sec>
      )}
      {arr(raw.haiku).length > 0 && <p className="sec haiku">{arr(raw.haiku).map((l, i) => <span key={i}>{l}</span>)}</p>}
      {raw.action && <Sec title="הצעד הבא" tone="do"><Para text={raw.action} lead={false} /></Sec>}
    </>
  );
}

/** A chok essay is one text: a title line, then `## heading` blocks that each close with one `**insight**` line. */
function chokSections(text: string): { heading: string; paras: string[]; insight: string }[] {
  return text.split(/^## /m).slice(1).map((block) => {
    const [heading, ...rest] = block.split('\n');
    const paras = rest.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const last = paras[paras.length - 1] ?? '';
    const m = /^\*\*([^*]+)\*\*$/.exec(last);
    if (m) paras.pop();
    return { heading: heading.trim(), paras, insight: m ? m[1] : '' };
  });
}

/** Short facts beside the image: what the reader should know before the first paragraph. */
export function facts(article: Article, raw: Raw | null): { label: string; value: string }[] {
  if (!raw) return [];
  if (article.source === 'culture') {
    const o = (raw.origin ?? {}) as Raw;
    return [
      { label: 'במקור', value: [o.script, o.transliteration !== o.script ? o.transliteration : ''].filter(Boolean).join(' · ') },
      { label: 'פירוש מילולי', value: o.literal },
      { label: 'מקום', value: [o.culture, o.place].filter(Boolean).join(', ') },
      { label: 'תקופה', value: o.era },
      { label: 'הצורך', value: raw.human_need },
    ].filter((f) => f.value);
  }
  if (article.source === 'chok') {
    const law = (raw.law ?? {}) as Raw;
    return [
      { label: 'החוק', value: [law.name, law.name_en].filter(Boolean).join(' · ') },
      { label: 'תחום', value: arr(law.domain).join(', ') },
      { label: 'מקור', value: law.source },
      { label: 'חוזק הראיות', value: law.evidence_strength ? `${law.evidence_strength} מתוך 5` : '' },
    ].filter((f) => f.value);
  }
  if (article.source === 'mahut') {
    return [
      { label: 'נושא במקור', value: raw.topic },
      { label: 'פרקים', value: arr(raw.sections).length ? String(arr(raw.sections).length) : '' },
    ].filter((f) => f.value);
  }
  return [
    { label: 'המקרה', value: article.kicker ?? '' },
    { label: 'עדשות', value: String(arr(raw.sections).length || '') },
  ].filter((f) => f.value);
}
