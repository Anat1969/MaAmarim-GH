import { useRef, useState } from 'react';
import type { Article, Data, Topic } from '../lib/types';
import { SOURCES, originUrl } from '../lib/sources';
import { href, go, type Route } from '../lib/route';
import { img } from '../lib/supabase';
import { plain } from '../lib/text';

export const topicOf = (data: Data, a: Article | undefined): Topic | undefined => data.topics.find((t) => t.id === a?.topic_id);

/** A link that changes the address without reloading; a modified click still opens a new tab. */
export function Go({ to, className, children, title, ...rest }: { to: Partial<Route>; className?: string; children: React.ReactNode; title?: string } & Record<string, unknown>) {
  return (
    <a
      href={href(to)}
      className={className}
      title={title}
      {...rest}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(to);
        window.scrollTo(0, 0);
      }}
    >
      {children}
    </a>
  );
}

/**
 * Where an article was written. The same sign on every screen. With `article` it is also the way there: it opens
 * this article in the app that wrote it (Anat, 2026-11-21: every article links to its app). It sits inside cards
 * and rows that are links themselves, so it is a span that acts as a link, never an anchor inside an anchor.
 */
export function SourceTag({ source, article }: { source: Article['source']; article?: Pick<Article, 'key' | 'source'> }) {
  if (!article) return <span className={`src src-${source}`}>{SOURCES[source].label}</span>;
  const open = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(originUrl(article), '_blank', 'noopener');
  };
  return (
    <span className={`src src-${source} src-link`} role="link" tabIndex={0} data-href={originUrl(article)}
      title={`פתיחת המאמר באפליקציה ${SOURCES[source].label}`}
      onClick={open} onKeyDown={(e) => { if (e.key === 'Enter') open(e); }}>
      {SOURCES[source].label}
    </span>
  );
}

export function TopicDot({ topic }: { topic: Topic | undefined }) {
  if (!topic) return <span className="topic-dot none">בלי נושא</span>;
  return <span className="topic-dot" style={{ '--c': topic.color } as React.CSSProperties}>{topic.label}</span>;
}

/** An article with no image gets a plate drawn from its own data: the topic colour and its first word. */
export function Plate({ article, topic }: { article: Article; topic: Topic | undefined }) {
  return (
    <div className="plate" style={{ '--c': topic?.color ?? '#77756F' } as React.CSSProperties} aria-hidden="true">
      <span>{plain(article.title).split(/[\s:]/)[0]}</span>
    </div>
  );
}

export function Card({ data, article, to }: { data: Data; article: Article; to: Partial<Route> }) {
  const topic = topicOf(data, article);
  return (
    <Go to={to} className="card" style={{ '--c': topic?.color ?? '#77756F' } as React.CSSProperties}>
      <div className="card-img">
        {article.image ? <img src={img(article.image, 480)} alt="" loading="lazy" decoding="async" /> : <Plate article={article} topic={topic} />}
      </div>
      <div className="card-txt">
        <div className="card-meta"><SourceTag source={article.source} article={article} /><TopicDot topic={topic} /></div>
        <h3>{plain(article.title)}</h3>
        {article.lede && <p>{plain(article.lede)}</p>}
      </div>
    </Go>
  );
}

type Rec = { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; start: () => void; stop: () => void };

/** Recording and transcription for a text field (Anat's rule for every field). Hidden where the browser cannot. */
export function Dictate({ onText }: { onText: (t: string) => void }) {
  const [on, setOn] = useState(false);
  const rec = useRef<Rec | null>(null);
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const r = new Ctor();
    r.lang = 'he-IL'; r.continuous = false; r.interimResults = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    r.onend = () => setOn(false);
    rec.current = r; r.start(); setOn(true);
  };
  return <button type="button" className={`btn small ${on ? 'on' : ''}`} aria-pressed={on} onClick={toggle}>{on ? 'מקליט, לחיצה לסיום' : 'הקלטה'}</button>;
}
