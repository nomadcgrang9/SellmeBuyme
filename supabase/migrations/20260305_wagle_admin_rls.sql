-- 20260305_wagle_admin_rls.sql
-- 와글와글 관리자 RLS 정책 추가
-- 관리자가 글 숨기기(is_deleted 토글) 및 삭제 가능하도록

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. wagle_threads: 관리자 UPDATE/DELETE 허용
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 기존 정책 삭제
DROP POLICY IF EXISTS "wagle_threads_update" ON wagle_threads;
DROP POLICY IF EXISTS "wagle_threads_delete" ON wagle_threads;

-- 새 정책: 본인 또는 관리자
CREATE POLICY "wagle_threads_update_own_or_admin" ON wagle_threads
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR public.is_admin()
  );

CREATE POLICY "wagle_threads_delete_admin" ON wagle_threads
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. wagle_replies: 관리자 UPDATE/DELETE 허용
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 기존 정책 삭제
DROP POLICY IF EXISTS "wagle_replies_update" ON wagle_replies;
DROP POLICY IF EXISTS "wagle_replies_delete" ON wagle_replies;

-- 새 정책: 본인 또는 관리자
CREATE POLICY "wagle_replies_update_own_or_admin" ON wagle_replies
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR public.is_admin()
  );

CREATE POLICY "wagle_replies_delete_admin" ON wagle_replies
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
