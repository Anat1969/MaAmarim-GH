import { useEffect, useState } from 'react';

export type View = 'cover' | 'library' | 'threads' | 'issues';
export type Group = 'topic' | 'source' | 'date';

/** The whole state lives in the address, so every screen can be copied as a link. */
export interface Route {
  view: View;
  a: string | null;
  issue: string | null;
  topic: string | null;
  src: string | null;
  group: Group;
  q: string;
  thread: string | null;
  /** Where the reader was opened from: the list the pager walks, and the place "חזרה" returns to. */
  from: string | null;
}

export function parse(search: string): Route {
  const p = new URLSearchParams(search);
  const v = p.get('view');
  const g = p.get('group');
  return {
    view: v === 'library' || v === 'threads' || v === 'issues' ? v : 'cover',
    a: p.get('a'),
    issue: p.get('issue'),
    topic: p.get('topic'),
    src: p.get('src'),
    group: g === 'source' || g === 'date' ? g : 'topic',
    q: p.get('q') ?? '',
    thread: p.get('thread'),
    from: p.get('from'),
  };
}

export function href(r: Partial<Route>): string {
  const p = new URLSearchParams();
  if (r.a) p.set('a', r.a);
  if (r.view && r.view !== 'cover' && !r.a) p.set('view', r.view);
  if (r.issue) p.set('issue', r.issue);
  if (r.topic) p.set('topic', r.topic);
  if (r.src) p.set('src', r.src);
  if (r.group && r.group !== 'topic') p.set('group', r.group);
  if (r.q) p.set('q', r.q);
  if (r.thread) p.set('thread', r.thread);
  if (r.from) p.set('from', r.from);
  const s = p.toString();
  return s ? `?${s}` : location.pathname;
}

const listeners = new Set<() => void>();
export function go(r: Partial<Route>, replace = false) {
  const url = href(r);
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  listeners.forEach((f) => f());
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.search));
  useEffect(() => {
    const on = () => setRoute(parse(location.search));
    listeners.add(on);
    window.addEventListener('popstate', on);
    return () => { listeners.delete(on); window.removeEventListener('popstate', on); };
  }, []);
  return route;
}
