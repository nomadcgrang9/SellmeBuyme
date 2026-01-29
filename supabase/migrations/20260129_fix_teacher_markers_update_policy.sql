-- ============================================================================
-- teacher_markers UPDATE RLS 정책 수정
-- 작성일: 2026-01-29
-- 설명: UPDATE 정책에 WITH CHECK 절 추가하여 삭제(soft delete) 기능 수정
-- ============================================================================

-- 기존 UPDATE 정책 삭제
DROP POLICY IF EXISTS "teacher_markers_update_own" ON teacher_markers;

-- 새로운 UPDATE 정책 생성 (WITH CHECK 절 포함)
-- USING: 기존 행에 대한 접근 권한 확인
-- WITH CHECK: 업데이트 후 새 행에 대한 권한 확인
CREATE POLICY "teacher_markers_update_own" ON teacher_markers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 확인용 코멘트
COMMENT ON POLICY "teacher_markers_update_own" ON teacher_markers IS 
  '본인 마커만 UPDATE 가능 - soft delete 포함';
