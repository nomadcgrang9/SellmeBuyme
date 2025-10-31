-- Ensure required extensions
create extension if not exists pg_trgm;
create extension if not exists unaccent;
-- Job postings search vector
alter table public.job_postings
  add column if not exists search_vector tsvector;
create or replace function public.job_postings_update_search_vector()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.organization, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.location, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.content, '')), 'C');
  return new;
end;
$$ language plpgsql;
drop trigger if exists job_postings_search_vector_tgr on public.job_postings;
create trigger job_postings_search_vector_tgr
before insert or update on public.job_postings
for each row execute function public.job_postings_update_search_vector();
create index if not exists job_postings_search_vector_idx
  on public.job_postings using gin(search_vector);
-- Talents search vector
alter table public.talents
  add column if not exists search_vector tsvector;
create or replace function public.talents_update_search_vector()
returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.specialty, '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(new.location, '{}'::text[]), ' ')), 'B');
  return new;
end;
$$ language plpgsql;
drop trigger if exists talents_search_vector_tgr on public.talents;
create trigger talents_search_vector_tgr
before insert or update on public.talents
for each row execute function public.talents_update_search_vector();
create index if not exists talents_search_vector_idx
  on public.talents using gin(search_vector);
-- Backfill existing rows
update public.job_postings set title = title;
update public.talents set name = name;
