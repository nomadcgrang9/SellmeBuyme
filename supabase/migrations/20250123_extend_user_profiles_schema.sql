-- 프로필 저장 기능 확장: 학교급, 특수교사 유형, 강사 분야, 프로필 사진 등 추가

-- user_profiles 테이블에 새 컬럼 추가
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS teacher_level TEXT,
ADD COLUMN IF NOT EXISTS special_education_type TEXT,
ADD COLUMN IF NOT EXISTS instructor_fields TEXT[],
ADD COLUMN IF NOT EXISTS instructor_custom_field TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.user_profiles.teacher_level IS '교사 역할 선택: 유치원담임, 초등담임, 중등교사, 특수교사';
COMMENT ON COLUMN public.user_profiles.special_education_type IS '특수교사 유형: 초등특수, 중등특수';
COMMENT ON COLUMN public.user_profiles.instructor_fields IS '강사 분야 배열: 요리, 코딩, 음악 등';
COMMENT ON COLUMN public.user_profiles.instructor_custom_field IS '강사 자유 입력 분야';
COMMENT ON COLUMN public.user_profiles.profile_image_url IS '프로필 사진 URL (Supabase Storage)';

-- 기존 데이터에 대해 NULL로 초기화 (이미 NULL 상태)
-- 마이그레이션 후 새 사용자부터 이 필드들이 채워짐
