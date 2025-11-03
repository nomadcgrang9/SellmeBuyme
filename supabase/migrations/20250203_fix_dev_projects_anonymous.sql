-- Fix dev_projects to allow anonymous users
-- Problem: user_id is NOT NULL and RLS requires authentication
-- Solution: Allow NULL user_id and add policy for anonymous inserts

-- =============================================================================
-- 1. Alter user_id column to allow NULL
-- =============================================================================
ALTER TABLE public.dev_projects
  ALTER COLUMN user_id DROP NOT NULL;

-- =============================================================================
-- 2. Drop ALL existing policies (to avoid conflicts)
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert own projects" ON public.dev_projects;
DROP POLICY IF EXISTS "Authenticated users can insert own projects" ON public.dev_projects;
DROP POLICY IF EXISTS "Anonymous users can insert projects" ON public.dev_projects;

DROP POLICY IF EXISTS "Users can update own projects" ON public.dev_projects;
DROP POLICY IF EXISTS "Authenticated users can update own or anonymous projects" ON public.dev_projects;
DROP POLICY IF EXISTS "Anonymous users can update anonymous projects" ON public.dev_projects;

DROP POLICY IF EXISTS "Users can delete own projects" ON public.dev_projects;
DROP POLICY IF EXISTS "Authenticated users can delete own or anonymous projects" ON public.dev_projects;
DROP POLICY IF EXISTS "Anonymous users can delete anonymous projects" ON public.dev_projects;

-- =============================================================================
-- 3. Create new INSERT policies
-- =============================================================================

-- 3-1. Authenticated users can insert with their user_id
CREATE POLICY "Authenticated users can insert own projects"
  ON public.dev_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3-2. Anonymous users can insert with NULL user_id
CREATE POLICY "Anonymous users can insert projects"
  ON public.dev_projects FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- =============================================================================
-- 4. Create new UPDATE policies
-- =============================================================================

-- 4-1. Authenticated users can update own projects or any anonymous projects
CREATE POLICY "Authenticated users can update own or anonymous projects"
  ON public.dev_projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR user_id IS NULL
  )
  WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- 4-2. Anonymous users can update anonymous projects (user_id IS NULL)
CREATE POLICY "Anonymous users can update anonymous projects"
  ON public.dev_projects FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- =============================================================================
-- 5. Create new DELETE policies
-- =============================================================================

-- 5-1. Authenticated users can delete own projects or any anonymous projects
CREATE POLICY "Authenticated users can delete own or anonymous projects"
  ON public.dev_projects FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- 5-2. Anonymous users can delete anonymous projects (user_id IS NULL)
CREATE POLICY "Anonymous users can delete anonymous projects"
  ON public.dev_projects FOR DELETE
  TO anon
  USING (user_id IS NULL);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON POLICY "Authenticated users can insert own projects" ON public.dev_projects
  IS '인증된 사용자는 자신의 프로젝트를 생성할 수 있음';

COMMENT ON POLICY "Anonymous users can insert projects" ON public.dev_projects
  IS '익명 사용자는 user_id가 NULL인 프로젝트를 생성할 수 있음';

COMMENT ON POLICY "Authenticated users can update own or anonymous projects" ON public.dev_projects
  IS '인증된 사용자는 자신의 프로젝트 또는 모든 익명 프로젝트를 수정할 수 있음';

COMMENT ON POLICY "Anonymous users can update anonymous projects" ON public.dev_projects
  IS '익명 사용자는 익명 프로젝트(user_id IS NULL)를 수정할 수 있음';

COMMENT ON POLICY "Authenticated users can delete own or anonymous projects" ON public.dev_projects
  IS '인증된 사용자는 자신의 프로젝트 또는 모든 익명 프로젝트를 삭제할 수 있음';

COMMENT ON POLICY "Anonymous users can delete anonymous projects" ON public.dev_projects
  IS '익명 사용자는 익명 프로젝트(user_id IS NULL)를 삭제할 수 있음';
