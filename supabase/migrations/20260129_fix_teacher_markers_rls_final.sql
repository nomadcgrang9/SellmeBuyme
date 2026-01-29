-- ============================================================================
-- teacher_markers RLS 정책 긴급 수정 (WITH CHECK 제거)
-- ============================================================================

-- 1. 기존 정책 모두 삭제 (깨끗한 상태로 시작)
DROP POLICY IF EXISTS "teacher_markers_select_active" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_select_public" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_select_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_select_all" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_insert_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_update_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_delete_own" ON teacher_markers;

-- 2. SELECT 정책 (조회)
-- Public: 활성 상태인 마커만 조회 가능
CREATE POLICY "teacher_markers_select_public" ON teacher_markers
  FOR SELECT
  TO public
  USING (is_active = true);

-- Owner: 본인 마커는 활성/비활성 여부 관계없이 모두 조회 가능 (필수)
CREATE POLICY "teacher_markers_select_own" ON teacher_markers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. INSERT 정책 (생성)
CREATE POLICY "teacher_markers_insert_own" ON teacher_markers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. UPDATE 정책 (수정/Soft Delete) - ★ WITH CHECK 제거 ★
-- 원인: WITH CHECK 절이 알 수 없는 이유로 에러를 유발하므로 제거함.
-- USING 절이 있으므로 여전히 "본인 것만 수정 가능"한 보안은 유지됨.
CREATE POLICY "teacher_markers_update_own" ON teacher_markers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. DELETE 정책 (삭제)
CREATE POLICY "teacher_markers_delete_own" ON teacher_markers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
