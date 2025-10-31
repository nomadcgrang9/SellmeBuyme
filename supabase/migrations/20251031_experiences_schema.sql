-- 체험 프로그램 테이블 및 정책 추가

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,

  program_title text not null,
  categories text[] not null default '{}',
  target_school_levels text[] not null default '{}',
  region_seoul text[] not null default '{}',
  region_gyeonggi text[] not null default '{}',
  operation_types text[] not null default '{}',
  capacity text,

  introduction text not null,
  contact_phone text not null,
  contact_email text not null,

  form_payload jsonb not null,
  status text not null default 'active',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_experiences_user_id on public.experiences(user_id);
create index if not exists idx_experiences_status on public.experiences(status);
create index if not exists idx_experiences_categories on public.experiences using gin(categories);
create index if not exists idx_experiences_target_school_levels on public.experiences using gin(target_school_levels);
create index if not exists idx_experiences_operation_types on public.experiences using gin(operation_types);
create index if not exists idx_experiences_region_seoul on public.experiences using gin(region_seoul);
create index if not exists idx_experiences_region_gyeonggi on public.experiences using gin(region_gyeonggi);

alter table public.experiences enable row level security;

create policy if not exists "Experiences are viewable by everyone"
  on public.experiences for select
  using (status = 'active');

create policy if not exists "Users can insert own experiences"
  on public.experiences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "Users can update own experiences"
  on public.experiences for update
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "Users can delete own experiences"
  on public.experiences for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger update_experiences_updated_at
  before update on public.experiences
  for each row
  execute function public.update_updated_at_column();
