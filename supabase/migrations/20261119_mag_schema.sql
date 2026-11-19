-- MaAmarim-GH: the magazine. Articles stay in the tables of the apps that wrote them;
-- this schema holds only the editor's decisions (topics, issues, threads) and one view that reads them all.

create table if not exists mag_topics (
  id text primary key,
  label text not null,
  question text not null,
  color text not null,
  position int not null default 0
);

-- A hint that an article already carries in its own app (human_need, topic, radar keyword) -> a magazine topic.
create table if not exists mag_topic_map (
  source text not null,
  hint text not null,
  topic_id text not null references mag_topics(id) on delete cascade,
  primary key (source, hint)
);

-- The editor's override for one article.
create table if not exists mag_article_topics (
  article_key text primary key,
  topic_id text not null references mag_topics(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists mag_issues (
  id text primary key,
  number int not null unique,
  title text not null,
  question text not null,
  intro text not null default '',
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists mag_issue_items (
  issue_id text not null references mag_issues(id) on delete cascade,
  article_key text not null,
  role text not null default 'support' check (role in ('lead','support')),
  position int not null default 0,
  note text not null default '',
  primary key (issue_id, article_key)
);

-- A thread between two articles: the rule (why they connect), the insight (what it means), the action (what to do).
create table if not exists mag_threads (
  id uuid primary key default gen_random_uuid(),
  a_key text not null,
  b_key text not null,
  rule text not null,
  insight text not null default '',
  action text not null default '',
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (a_key, b_key)
);

-- Safety net: every write the editor function makes, with the row as it was before.
create table if not exists mag_log (
  id bigint generated always as identity primary key,
  action text not null,
  payload jsonb not null,
  before jsonb,
  at timestamptz not null default now()
);

alter table mag_topics enable row level security;
alter table mag_topic_map enable row level security;
alter table mag_article_topics enable row level security;
alter table mag_issues enable row level security;
alter table mag_issue_items enable row level security;
alter table mag_threads enable row level security;
alter table mag_log enable row level security;

-- Public read; no write policies: every write goes through the mag-edit function (service role).
do $$
declare t text;
begin
  foreach t in array array['mag_topics','mag_topic_map','mag_article_topics','mag_issues','mag_issue_items','mag_threads'] loop
    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- One shape for every source. security_invoker: the reader sees only what the source table lets them see.
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
         i.image_url, null,
         'ishy', i.created_at,
         (i.content - 'visual_prompt_he') || jsonb_build_object('share', i.share)
  from ishy_articles i where i.published
)
select b.key, b.source, b.title, b.kicker, b.lede, b.quote, b.image, b.image2, b.hint, b.created_at,
       coalesce(o.topic_id, tm.topic_id) as topic_id, b.raw
from base b
left join mag_article_topics o on o.article_key = b.key
left join mag_topic_map tm on tm.source = b.source and tm.hint = b.hint;

grant select on mag_articles to anon, authenticated;
