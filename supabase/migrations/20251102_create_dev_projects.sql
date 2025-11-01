-- Migration: Create dev_projects table for project management
-- Created: 2025-11-02
-- Description: 개발자노트 프로젝트 관리 기능을 위한 테이블 생성

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

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_dev_projects_user_id ON public.dev_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_projects_status ON public.dev_projects(status);
CREATE INDEX IF NOT EXISTS idx_dev_projects_created_at ON public.dev_projects(created_at DESC);

-- 3. RLS 활성화
ALTER TABLE public.dev_projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
CREATE POLICY "Projects are viewable by everyone"
  ON public.dev_projects FOR SELECT USING (true);

CREATE POLICY "Users can insert own projects"
  ON public.dev_projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.dev_projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.dev_projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. 업데이트 트리거
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
