import { createClient } from '@supabase/supabase-js';
import { SOURCES } from './sources';
import type { Article, Data, Issue, IssueItem, Thread, Topic, Unlinked, World } from './types';

// cultura-GH: the shared project of Anat's apps. The magazine owns only the mag_ tables.
export const SUPABASE_URL = 'https://ktqmwpbzcnzkhjskqisy.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_IkreG7naPa1h-d4kGp1gpA_sLU4tg5q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// The view can be swapped for a check before a schema change goes live (VITE_MAG_VIEW).
const VIEW = (import.meta.env.VITE_MAG_VIEW as string | undefined) || 'mag_articles';
const LIST = 'key,source,title,kicker,lede,quote,image,image2,hint,created_at,topic_id';

async function all<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export async function loadData(): Promise<Data> {
  const [articles, topics, issues, items, threads] = await Promise.all([
    all<Article>(supabase.from(VIEW).select(LIST).order('created_at', { ascending: false })),
    all<Topic>(supabase.from('mag_topics').select('*').order('position')),
    all<Issue>(supabase.from('mag_issues').select('*').order('number', { ascending: false })),
    all<IssueItem>(supabase.from('mag_issue_items').select('*').order('position')),
    all<Thread>(supabase.from('mag_threads').select('*').order('created_at')),
  ]);
  // A source the code does not know yet must not break the page: its articles wait until it has a template.
  const known = articles.filter((a) => a.source in SOURCES);
  return { articles: known, byKey: new Map(known.map((a) => [a.key, a])), topics, issues, items, threads };
}

/** The body of one article, in the shape its own app keeps it. */
export async function loadRaw(key: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.from(VIEW).select('raw').eq('key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.raw as Record<string, unknown>) ?? null;
}

/** The watch of the editing desk: writing sources that are not in the magazine yet. */
export async function loadUnlinked(): Promise<Unlinked[]> {
  const { data, error } = await supabase.rpc('mag_unlinked');
  if (error) throw new Error(error.message);
  return (data ?? []) as Unlinked[];
}

/** "מה קורא העולם": what the radar found outside on the same topic. */
export async function loadWorld(topicId: string, limit = 3): Promise<World[]> {
  const map = await all<{ hint: string }>(supabase.from('mag_topic_map').select('hint').eq('source', 'radar').eq('topic_id', topicId));
  if (!map.length) return [];
  const topics = await all<{ id: string }>(supabase.from('radar_topics').select('id').in('keyword', map.map((m) => m.hint)));
  if (!topics.length) return [];
  return all<World>(
    supabase.from('radar_articles').select('id,title,title_he,insight,url,source,image_url,published_at,topic_id')
      .in('topic_id', topics.map((t) => t.id)).eq('relevant', true).not('insight', 'is', null)
      .order('published_at', { ascending: false }).limit(limit),
  );
}

/** Every write goes through the mag-edit function. Editing is open on every device, no link or key. */
export async function edit<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/mag-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `שגיאה ${res.status}`);
  return data as T;
}

/** A smaller copy of a stored image. The originals are about 1MB each; a card needs 30KB. */
export function img(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined;
  const mark = '/storage/v1/object/public/';
  const i = url.indexOf(mark);
  if (i < 0 || !url.startsWith(SUPABASE_URL)) return url;
  return `${SUPABASE_URL}/storage/v1/render/image/public/${url.slice(i + mark.length)}?width=${width}&quality=72&resize=contain`;
}
