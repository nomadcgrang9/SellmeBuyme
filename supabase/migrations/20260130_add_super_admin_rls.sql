-- ============================================================================
-- Super Admin RLS 정책 추가
-- Super Admin 이메일: l30417305@gmail.com
-- 목적: 모든 teacher_markers, instructor_markers 삭제(soft delete) 가능
-- 작성일: 2026-01-30
-- ============================================================================

-- ============================================================================
-- 1. teacher_markers UPDATE 정책 수정
-- ============================================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "teacher_markers_update_own" ON teacher_markers;

-- Super Admin 예외 추가된 새 정책
CREATE POLICY "teacher_markers_update_own_or_admin" ON teacher_markers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = 'l30417305@gmail.com'
  );

-- ============================================================================
-- 2. instructor_markers UPDATE 정책 수정
-- ============================================================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "instructor_markers_update_own" ON instructor_markers;

-- Super Admin 예외 추가된 새 정책
CREATE POLICY "instructor_markers_update_own_or_admin" ON instructor_markers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = 'l30417305@gmail.com'
  );

-- ============================================================================
-- 참고: DELETE 정책도 수정 (Hard Delete가 필요한 경우를 대비)
-- 현재는 Soft Delete (is_active = false)를 사용하므로 UPDATE만 수정해도 됨
-- ============================================================================

-- teacher_markers DELETE 정책
DROP POLICY IF EXISTS "teacher_markers_delete_own" ON teacher_markers;

CREATE POLICY "teacher_markers_delete_own_or_admin" ON teacher_markers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = 'l30417305@gmail.com'
  );

-- instructor_markers DELETE 정책
DROP POLICY IF EXISTS "instructor_markers_delete_own" ON instructor_markers;

CREATE POLICY "instructor_markers_delete_own_or_admin" ON instructor_markers
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.jwt()->>'email' = 'l30417305@gmail.com'
  );
