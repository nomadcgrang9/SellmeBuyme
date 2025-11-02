-- 교사 고용 형태 구분 필드 추가
-- 작성일: 2025-11-02
-- 목적: 기간제 교사와 정규교원을 구분하여 맞춤형 추천 제공

-- 1. teacher_employment_type 필드 추가
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS teacher_employment_type TEXT;

-- 2. 필드 설명 추가
COMMENT ON COLUMN public.user_profiles.teacher_employment_type IS '교사 고용 형태: "기간제교사" | "정규교원" | null (교사가 아닌 경우)';

-- 3. 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_profiles_teacher_employment_type
ON public.user_profiles(teacher_employment_type)
WHERE teacher_employment_type IS NOT NULL;

-- 마이그레이션 완료
-- 변경사항:
-- - teacher_employment_type 추가: 기간제/정규 구분
-- - 기간제교사: 공고 6장 추천
-- - 정규교원: 인력풀 2장 + 체험 4장 추천
