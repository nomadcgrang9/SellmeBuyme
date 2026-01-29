-- ============================================================================
-- teacher_markers의 is_active 필드 수정
-- 작성일: 2026-01-29
-- 설명: is_active가 NULL인 마커를 TRUE로 업데이트하여 지도에 표시되도록 함
-- ============================================================================

-- 1. is_active가 NULL인 모든 마커를 TRUE로 업데이트
UPDATE teacher_markers
SET is_active = true
WHERE is_active IS NULL;

-- 2. is_active 컬럼에 NOT NULL 제약조건 추가 (이미 있으면 무시)
-- 이렇게 하면 앞으로 is_active가 NULL로 저장되는 것을 방지
DO $$
BEGIN
  ALTER TABLE teacher_markers
  ALTER COLUMN is_active SET NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL; -- 이미 NOT NULL이면 무시
END;
$$;

-- 3. is_active의 기본값을 TRUE로 다시 확인
ALTER TABLE teacher_markers
ALTER COLUMN is_active SET DEFAULT true;
