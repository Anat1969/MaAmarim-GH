-- 2026-11-22: the format of an issue in a curated magazine (מגזין אוצֵר). An issue is an exhibition out of the collection:
-- one question, the curator's claim (intro), up to seven articles from at least three apps, one golden thread, one action for the city.
alter table mag_issues add column if not exists city text not null default '';
alter table mag_issues add column if not exists thread_id uuid references mag_threads(id) on delete set null;
