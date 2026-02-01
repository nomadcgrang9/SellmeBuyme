-- 20260131_admin_content_management_rls.sql
-- 콘텐츠 관리용 RLS 정책 (베타 단계)
-- 관리자: roles @> ARRAY['admin']

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. 관리자 체크 함수 (재사용 가능)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()
    AND roles @> ARRAY['admin']::user_profile_role[]
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin() IS '현재 로그인 유저가 관리자인지 체크';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. job_postings 관리자 정책 추가
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 기존 UPDATE/DELETE 정책 삭제
DROP POLICY IF EXISTS "Users can update own job postings" ON job_postings;
DROP POLICY IF EXISTS "Users can delete own job postings" ON job_postings;
DROP POLICY IF EXISTS "job_postings_update_own_or_admin" ON job_postings;
DROP POLICY IF EXISTS "job_postings_delete_own_or_admin" ON job_postings;

-- 새 정책: 본인 또는 관리자
CREATE POLICY "job_postings_update_own_or_admin" ON job_postings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "job_postings_delete_own_or_admin" ON job_postings
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. teacher_markers 정책 통일 (이메일 → 역할 기반)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 기존 정책 삭제
DROP POLICY IF EXISTS "teacher_markers_update_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_delete_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_update_own_or_admin" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_delete_own_or_admin" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_select_admin" ON teacher_markers;

-- 새 정책
CREATE POLICY "teacher_markers_update_own_or_admin" ON teacher_markers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "teacher_markers_delete_own_or_admin" ON teacher_markers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- 관리자는 비활성 마커도 조회 가능
CREATE POLICY "teacher_markers_select_admin" ON teacher_markers
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. instructor_markers 정책 통일 (이메일 → 역할 기반)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 기존 정책 삭제
DROP POLICY IF EXISTS "instructor_markers_update_own" ON instructor_markers;
DROP POLICY IF EXISTS "instructor_markers_delete_own" ON instructor_markers;
DROP POLICY IF EXISTS "instructor_markers_update_own_or_admin" ON instructor_markers;
DROP POLICY IF EXISTS "instructor_markers_delete_own_or_admin" ON instructor_markers;
DROP POLICY IF EXISTS "instructor_markers_select_admin" ON instructor_markers;

-- 새 정책
CREATE POLICY "instructor_markers_update_own_or_admin" ON instructor_markers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

CREATE POLICY "instructor_markers_delete_own_or_admin" ON instructor_markers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
  );

-- 관리자는 비활성 마커도 조회 가능
CREATE POLICY "instructor_markers_select_admin" ON instructor_markers
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 확인용 쿼리 (실행 후 체크)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SELECT public.is_admin();
-- SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('job_postings', 'teacher_markers', 'instructor_markers');
