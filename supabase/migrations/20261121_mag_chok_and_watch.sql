-- 2026-11-21: a fourth source (חוקי התנהגות), and the watch that says when a writing app is not connected yet.

-- 1. Hints the chok articles already carry: the first domain of their law. כלכלה and ספורט stay without a topic
--    until the editor decides.
insert into mag_topic_map (source, hint, topic_id) values
  ('chok', 'ביולוגיה', 'nature'),
  ('chok', 'חברה', 'belonging'),
  ('chok', 'עיר', 'city'),
  ('chok', 'תרבות', 'meaning'),
  ('chok', 'מדע', 'machine')
on conflict do nothing;

-- 2. The view, with the fourth branch. A chok article is the essay written on one law: the key is the law id.
create or replace view mag_articles with (security_invoker = true) as
with base as (
  select 'culture:' || c.id::text as key, 'culture'::text as source,
         c.concept as title, c.space_name as kicker, c.lede as lede, c.proverb as quote,
         c.image_exterior as image, c.image_interior as image2,
         c.human_need as hint, c.created_at,
         to_jsonb(c) - 'exterior_prompt' - 'interior_prompt' - 'video_exterior' - 'video_interior' as raw
  from culture_articles c
  union all
  select 'mahut:' || m.id::text, 'mahut',
         m.title, m.topic, m.subtitle, m.quote,
         m.image_url, null,
         m.topic, m.created_at,
         to_jsonb(m) - 'visual_prompt' - 'source_input' - 'created_by'
  from mahut_articles m where m.published
  union all
  select 'ishy:' || i.id::text, 'ishy',
         coalesce(i.content->>'title', i.case_title), i.case_title, i.content->>'lede', i.content->>'quote',
         -- the app shows the image of the case in המרחב הפנימי: the synthesis reading first, then any lens
         coalesce(i.image_url, (select r.images->-1->>'url' from merhav_readings r
                                 where r.case_id = i.case_id and jsonb_array_length(coalesce(r.images, '[]'::jsonb)) > 0
                                 order by (r.lens = 'synthesis') desc, r.updated_at desc limit 1)), null,
         'ishy', i.created_at,
         (i.content - 'visual_prompt_he') || jsonb_build_object('share', i.share)
  from ishy_articles i where i.published
  union all
  select 'chok:' || a.law_id, 'chok',
         btrim(split_part(a.text, E'\n', 1)), l.name, l.definition,
         (regexp_match(a.text, '\*\*([^*]+)\*\*\s*$'))[1],
         (select 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/public/chok-images/' || g.path
            from chok_images g where g.law_id = a.law_id order by g.created_at desc limit 1),
         null,
         l.domain[1], a.updated_at,
         jsonb_build_object('text', a.text, 'law', to_jsonb(l) - 'created_by' - 'correlations')
  from chok_articles a join chok_laws l on l.id = a.law_id
  where length(btrim(a.text)) > 0
)
select b.key, b.source, b.title, b.kicker, b.lede, b.quote, b.image, b.image2, b.hint, b.created_at,
       coalesce(o.topic_id, tm.topic_id) as topic_id, b.raw
from base b
left join mag_article_topics o on o.article_key = b.key
left join mag_topic_map tm on tm.source = b.source and tm.hint = b.hint;

grant select on mag_articles to anon, authenticated;

-- 3. The watch. `ignore`: a table that looks like articles but is not a source. `pending`: a source the editor knows
--    about that cannot be read as a table yet.
create table if not exists mag_source_watch (
  name text primary key,
  kind text not null check (kind in ('ignore', 'pending')),
  label text not null default '',
  note text not null default ''
);
alter table mag_source_watch enable row level security;
drop policy if exists mag_source_watch_read on mag_source_watch;
create policy mag_source_watch_read on mag_source_watch for select using (true);

insert into mag_source_watch (name, kind, label, note) values
  ('radar_articles', 'ignore', 'רדאר אקטואליה', 'כתבות מהעולם, לא של ענת. מוצגות כ"מה קורא העולם".'),
  ('chok_article_history', 'ignore', 'חוקי התנהגות', 'גרסאות קודמות של מאמרים.'),
  ('amirot', 'pending', 'אמירות', 'היצירות שמורות בקובץ ולא בטבלה.'),
  ('refua', 'pending', 'רפואה', 'היצירות שמורות בקובץ ולא בטבלה.'),
  ('tzuna', 'pending', 'צונה', 'היצירות שמורות בקובץ ולא בטבלה.'),
  ('prasnovel', 'pending', 'פרס נובל', 'היצירות שמורות בקובץ ולא בטבלה.'),
  ('olam', 'pending', 'עולם נעלם ומציאות מצוייה', 'היצירות שמורות בקובץ ולא בטבלה.')
on conflict (name) do nothing;

-- Every table in the shared project whose name says it holds writing, and that the view does not read.
-- Runs when the editing desk opens, so a new writing app cannot stay outside unnoticed.
create or replace function mag_unlinked()
returns table (name text, status text, label text, note text, row_count bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  def text := pg_get_viewdef('public.mag_articles'::regclass);
  t text;
  n bigint;
begin
  for t in
    select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r'
      and c.relname ~ '(^|_)(articles?|maamar[a-z]*|essays?|katav[a-z]*|stories|posts?)($|_)'
      and c.relname !~ '^mag_'
      and def !~ ('\m' || c.relname || '\M')
      and not exists (select 1 from mag_source_watch w where w.name = c.relname)
    order by c.relname
  loop
    execute format('select count(*) from public.%I', t) into n;
    name := t; status := 'new'; label := ''; note := ''; row_count := n;
    return next;
  end loop;
  return query select w.name, 'pending'::text, w.label, w.note, null::bigint
               from mag_source_watch w where w.kind = 'pending' order by w.label;
end $$;
revoke all on function mag_unlinked() from public;
grant execute on function mag_unlinked() to anon, authenticated, service_role;
