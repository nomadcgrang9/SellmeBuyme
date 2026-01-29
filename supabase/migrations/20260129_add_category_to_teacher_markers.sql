-- ============================================================================
-- teacher_markers 테이블에 카테고리 기반 분류 컬럼 추가
-- 작성일: 2026-01-29
-- 설명: 1차/2차 분류 시스템 및 개인정보 동의 필드 추가
-- ============================================================================

-- 1. 신규 컬럼 추가
-- primary_category: 1차 분류 (필수, 단일 선택)
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS primary_category VARCHAR(50);

-- sub_categories: 2차 분류 (복수 선택 가능)
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS sub_categories TEXT[];

-- preferred_school_levels: 희망 학교급 (교과과목용, 복수 선택 가능)
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS preferred_school_levels TEXT[];

-- privacy_agreed: 개인정보 동의
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS privacy_agreed BOOLEAN DEFAULT false;

-- other_subject: 기타 및 추가입력 (방과후/돌봄 등)
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS other_subject TEXT;

-- 2. 인덱스 생성
-- primary_category 인덱스 (필터 연동용)
CREATE INDEX IF NOT EXISTS idx_teacher_markers_primary_category
ON teacher_markers(primary_category);

-- sub_categories GIN 인덱스 (배열 검색용)
CREATE INDEX IF NOT EXISTS idx_teacher_markers_sub_categories
ON teacher_markers USING GIN(sub_categories);

-- preferred_school_levels GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_markers_preferred_school_levels
ON teacher_markers USING GIN(preferred_school_levels);

-- other_subject 텍스트 검색 인덱스 (ILIKE 성능 개선)
CREATE INDEX IF NOT EXISTS idx_teacher_markers_other_subject
ON teacher_markers USING GIN(other_subject gin_trgm_ops);

-- 3. 복합 인덱스 (필터 연동 최적화)
-- primary_category + is_active 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_markers_category_active
ON teacher_markers(primary_category, is_active)
WHERE is_active = true;

-- 4. 코멘트 추가
COMMENT ON COLUMN teacher_markers.primary_category IS '1차 분류 (유치원/초등담임/교과과목/비교과/특수교육/방과후돌봄/행정교육지원/기타)';
COMMENT ON COLUMN teacher_markers.sub_categories IS '2차 분류 (복수 선택 가능)';
COMMENT ON COLUMN teacher_markers.preferred_school_levels IS '희망 학교급 (교과과목 선택 시 - 초등학교/중학교/고등학교)';
COMMENT ON COLUMN teacher_markers.privacy_agreed IS '개인정보 이용 동의 여부';

-- ============================================================================
-- 기존 데이터 마이그레이션 (선택적)
-- 기존 school_levels 데이터를 primary_category로 변환
-- ============================================================================

-- 기존 데이터가 있는 경우, school_levels를 기반으로 primary_category 추론
-- (실제 운영 시에는 수동 검토 권장)

/*
UPDATE teacher_markers
SET primary_category = CASE
  WHEN '유치원' = ANY(school_levels) THEN '유치원'
  WHEN '초등' = ANY(school_levels) THEN '초등담임'
  WHEN '중등' = ANY(school_levels) OR '고등' = ANY(school_levels) THEN '교과과목'
  WHEN '특수' = ANY(school_levels) THEN '특수교육'
  ELSE '기타'
END
WHERE primary_category IS NULL AND school_levels IS NOT NULL;
*/

-- ============================================================================
-- 필터 쿼리 예시 (참고용)
-- ============================================================================

-- 1. "방과후/돌봄" 1차 필터: 모든 방과후/돌봄 구직자
-- SELECT * FROM teacher_markers
-- WHERE primary_category = '방과후/돌봄'
--   AND is_active = true;

-- 2. "방과후/돌봄 → 체육" 2차 필터
-- SELECT * FROM teacher_markers
-- WHERE primary_category = '방과후/돌봄'
--   AND '체육' = ANY(sub_categories)
--   AND is_active = true;

-- 3. 텍스트 검색: "피아노" 키워드
-- SELECT * FROM teacher_markers
-- WHERE primary_category = '방과후/돌봄'
--   AND (
--     '피아노' = ANY(sub_categories)
--     OR other_subject ILIKE '%피아노%'
--   )
--   AND is_active = true;

-- 4. 교과과목 + 학교급 필터
-- SELECT * FROM teacher_markers
-- WHERE primary_category = '교과과목'
--   AND '영어' = ANY(sub_categories)
--   AND '중학교' = ANY(preferred_school_levels)
--   AND is_active = true;
