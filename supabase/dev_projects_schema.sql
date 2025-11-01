-- ============================================================================
-- 개발자노트 - 프로젝트 관리 테이블 생성 스크립트
-- ============================================================================

-- 1. 프로젝트 테이블 생성
CREATE TABLE IF NOT EXISTS public.dev_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal text NOT NULL,
  participants text[] NOT NULL DEFAULT '{}',
  start_date timestamptz NOT NULL DEFAULT now(),
  stages jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'difficult')),
  source_idea_id uuid REFERENCES public.dev_ideas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_dev_projects_user_id ON public.dev_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_projects_status ON public.dev_projects(status);
CREATE INDEX IF NOT EXISTS idx_dev_projects_created_at ON public.dev_projects(created_at DESC);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE public.dev_projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성
-- 모든 사용자가 프로젝트 조회 가능
CREATE POLICY "Projects are viewable by everyone"
  ON public.dev_projects
  FOR SELECT
  USING (true);

-- 인증된 사용자만 자신의 프로젝트 생성 가능
CREATE POLICY "Users can insert own projects"
  ON public.dev_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 프로젝트 소유자만 수정 가능
CREATE POLICY "Users can update own projects"
  ON public.dev_projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 프로젝트 소유자만 삭제 가능
CREATE POLICY "Users can delete own projects"
  ON public.dev_projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. 업데이트 트리거 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION public.update_dev_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dev_projects_updated_at ON public.dev_projects;
CREATE TRIGGER update_dev_projects_updated_at
  BEFORE UPDATE ON public.dev_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dev_projects_updated_at();

-- ============================================================================
-- 테스트 데이터 삽입 (선택사항)
-- ============================================================================
-- INSERT INTO public.dev_projects (
--   user_id,
--   name,
--   goal,
--   participants,
--   stages,
--   status
-- ) VALUES (
--   (SELECT id FROM public.users LIMIT 1),
--   '테스트 프로젝트',
--   '프로젝트 테스트 목표',
--   ARRAY['김철수', '이영희'],
--   '[
--     {"id": "stage-1", "order": 1, "description": "기획 단계", "is_completed": false, "completed_at": null},
--     {"id": "stage-2", "order": 2, "description": "개발 단계", "is_completed": false, "completed_at": null}
--   ]'::jsonb,
--   'active'
-- );
