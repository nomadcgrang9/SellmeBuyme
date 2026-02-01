-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 이 SQL을 Supabase SQL Editor에서 먼저 실행하세요!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- STEP 1: email 컬럼 추가
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- email에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON public.user_profiles(email);

-- 기존 유저들의 email 채우기 (auth.users에서 복사)
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.user_id = au.id
AND up.email IS NULL;

-- STEP 2: status 컬럼 추가
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- STEP 3: RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: 기존 정책 전체 삭제
DO $$ 
DECLARE 
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
  END LOOP;
END $$;

-- STEP 5: 새 RLS 정책

-- 조회: 로그인된 모든 유저 전체 조회 가능
CREATE POLICY "로그인 유저 전체 조회"
ON user_profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 수정: 관리자(roles에 'admin')만 가능
CREATE POLICY "관리자만 수정"
ON user_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = auth.uid()
    AND 'admin' = ANY(me.roles::text[])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles me
    WHERE me.user_id = auth.uid()
    AND 'admin' = ANY(me.roles::text[])
  )
);

-- 삽입: 본인만
CREATE POLICY "본인 프로필 생성"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- STEP 6: 슈퍼관리자 지정
UPDATE user_profiles 
SET roles = ARRAY['admin']::user_profile_role[]
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'l30417305@gmail.com' LIMIT 1
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 확인용 쿼리
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SELECT user_id, email, roles, status FROM user_profiles LIMIT 10;
