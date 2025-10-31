-- 프로필 필드 단순화: "선호"가 아닌 "가능"에 집중
-- 작성일: 2025-01-25

-- 1. 새 필드 추가
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS capable_subjects TEXT[];
-- 2. 필드 설명 추가
COMMENT ON COLUMN public.user_profiles.capable_subjects IS '담당 가능한 교과 (필수): 예) ["초등 담임"], ["중등 국어", "중등 영어"], ["유치원 담임"]';
-- 3. 기존 데이터 마이그레이션 (preferred_subjects → capable_subjects)
UPDATE public.user_profiles
SET capable_subjects = preferred_subjects
WHERE preferred_subjects IS NOT NULL AND capable_subjects IS NULL;
-- 4. 불필요한 필드 제거
ALTER TABLE public.user_profiles
DROP COLUMN IF EXISTS primary_region,
DROP COLUMN IF EXISTS preferred_job_types,
DROP COLUMN IF EXISTS preferred_subjects;
-- 5. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_profiles_capable_subjects ON public.user_profiles USING GIN(capable_subjects);
CREATE INDEX IF NOT EXISTS idx_user_profiles_teacher_level ON public.user_profiles(teacher_level) WHERE teacher_level IS NOT NULL;
-- 마이그레이션 완료
-- 변경사항:
-- - primary_region 제거 (interest_regions로 통합)
-- - preferred_job_types 제거 (선호 형태 불필요)
-- - preferred_subjects 제거 → capable_subjects로 대체
-- - capable_subjects 추가 (담당 가능한 교과);
