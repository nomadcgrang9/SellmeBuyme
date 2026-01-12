-- user_profiles 테이블에 email 컬럼 추가
-- 소셜 로그인 시 auth.users의 email을 복제 저장

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- email에 인덱스 추가 (검색 성능)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON public.user_profiles(email);

-- 주석 추가
COMMENT ON COLUMN public.user_profiles.email IS '소셜 로그인 시 auth.users에서 가져온 이메일 (복제 저장)';
