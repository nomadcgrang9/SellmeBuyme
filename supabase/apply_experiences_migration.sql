-- 체험 프로그램 테이블 및 정책 추가

-- 1. experiences 테이블 생성
CREATE TABLE IF NOT EXISTS public.experiences (
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

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_experiences_user_id on public.experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_status on public.experiences(status);
CREATE INDEX IF NOT EXISTS idx_experiences_categories on public.experiences using gin(categories);
CREATE INDEX IF NOT EXISTS idx_experiences_target_school_levels on public.experiences using gin(target_school_levels);
CREATE INDEX IF NOT EXISTS idx_experiences_operation_types on public.experiences using gin(operation_types);
CREATE INDEX IF NOT EXISTS idx_experiences_region_seoul on public.experiences using gin(region_seoul);
CREATE INDEX IF NOT EXISTS idx_experiences_region_gyeonggi on public.experiences using gin(region_gyeonggi);

-- 3. RLS 활성화
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- 4. 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "Experiences are viewable by everyone" ON public.experiences;
DROP POLICY IF EXISTS "Users can insert own experiences" ON public.experiences;
DROP POLICY IF EXISTS "Users can update own experiences" ON public.experiences;
DROP POLICY IF EXISTS "Users can delete own experiences" ON public.experiences;

-- 5. RLS 정책 생성
CREATE POLICY "Experiences are viewable by everyone"
  ON public.experiences for select
  USING (status = 'active');

CREATE POLICY "Users can insert own experiences"
  ON public.experiences for insert
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiences"
  ON public.experiences for update
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences"
  ON public.experiences for delete
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS update_experiences_updated_at ON public.experiences;
CREATE TRIGGER update_experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. 테이블 생성 확인
SELECT 'experiences table created successfully' as status;
