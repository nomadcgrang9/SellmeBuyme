-- ============================================================================
-- teacher_markers 테이블에 available_regions 컬럼 추가
-- 작성일: 2026-01-29
-- 설명: 구직자가 활동 가능한 지역 정보 저장을 위한 컬럼 추가
-- ============================================================================

-- available_regions 컬럼 추가 (TEXT 배열)
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS available_regions TEXT[];

-- 인덱스 추가 (GIN 인덱스로 배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_teacher_markers_regions
ON teacher_markers USING GIN(available_regions);

-- 코멘트 추가
COMMENT ON COLUMN teacher_markers.available_regions IS '활동 가능 지역 목록 (예: ["서울", "경기", "인천"])';
