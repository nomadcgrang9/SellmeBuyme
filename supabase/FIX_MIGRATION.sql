-- ========================================
-- 마이그레이션 수동 적용 (긴급 수정)
-- 작성일: 2025-01-24
-- 목적: 추천 실패 문제 즉시 해결
-- ========================================

-- ⚠️ 주의: 이 파일은 마이그레이션이 적용되지 않았을 때만 실행하세요!
-- CHECK_DB_STATUS.sql을 먼저 실행하여 상태를 확인하세요.

-- ========================================
-- PART 1: user_profiles 테이블 수정
-- ========================================

-- 1-1. capable_subjects 컬럼 추가
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS capable_subjects TEXT[];

-- 1-2. 주석 추가
COMMENT ON COLUMN public.user_profiles.capable_subjects IS 
'담당 가능한 교과 (필수): 예) ["초등 담임"], ["중등 국어", "중등 영어"], ["유치원 담임"]';

-- 1-3. 기존 데이터 마이그레이션 (preferred_subjects가 있다면)
UPDATE public.user_profiles
SET capable_subjects = preferred_subjects
WHERE preferred_subjects IS NOT NULL 
  AND capable_subjects IS NULL;

-- 1-4. 불필요한 컬럼 제거
ALTER TABLE public.user_profiles
DROP COLUMN IF EXISTS primary_region,
DROP COLUMN IF EXISTS preferred_job_types,
DROP COLUMN IF EXISTS preferred_subjects;

-- 1-5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_profiles_capable_subjects 
ON public.user_profiles USING GIN(capable_subjects);

CREATE INDEX IF NOT EXISTS idx_user_profiles_teacher_level 
ON public.user_profiles(teacher_level) 
WHERE teacher_level IS NOT NULL;

-- ========================================
-- PART 2: job_postings 테이블 수정 (필요 시)
-- ========================================

-- 2-1. school_level, subject, required_license 컬럼 추가
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS school_level TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS required_license TEXT;

-- 2-2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_job_postings_school_level 
ON public.job_postings(school_level) 
WHERE school_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_postings_subject 
ON public.job_postings(subject) 
WHERE subject IS NOT NULL;

-- ========================================
-- PART 3: 검증 쿼리
-- ========================================

-- 3-1. user_profiles 스키마 확인
SELECT 
  column_name, 
  data_type,
  CASE 
    WHEN column_name = 'capable_subjects' THEN '✅ 새로 추가됨'
    WHEN column_name IN ('primary_region', 'preferred_job_types', 'preferred_subjects') 
      THEN '❌ 제거되어야 함'
    ELSE ''
  END AS status
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY 
  CASE 
    WHEN column_name = 'capable_subjects' THEN 1
    WHEN column_name IN ('primary_region', 'preferred_job_types', 'preferred_subjects') THEN 2
    ELSE 3
  END;

-- 3-2. job_postings 스키마 확인
SELECT 
  column_name, 
  data_type,
  CASE 
    WHEN column_name IN ('school_level', 'subject', 'required_license') 
      THEN '✅ 추가됨'
    ELSE ''
  END AS status
FROM information_schema.columns 
WHERE table_name = 'job_postings' 
  AND table_schema = 'public'
  AND column_name IN ('school_level', 'subject', 'required_license')
ORDER BY column_name;

-- 3-3. 인덱스 확인
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('user_profiles', 'job_postings')
  AND schemaname = 'public'
  AND (
    indexname LIKE '%capable%' 
    OR indexname LIKE '%teacher_level%'
    OR indexname LIKE '%school_level%'
    OR indexname LIKE '%subject%'
  )
ORDER BY tablename, indexname;

-- ========================================
-- 완료!
-- ========================================
-- 
-- 다음 단계:
-- 1. ✅ 이 SQL이 에러 없이 실행되었는지 확인
-- 2. ✅ 검증 쿼리 결과 확인
-- 3. ✅ Edge Function 재배포 (필요 시)
--    supabase functions deploy profile-recommendations
-- 4. ✅ 프론트엔드에서 프로필 재등록 테스트
-- 5. ✅ 추천 기능 정상 작동 확인
--
-- ========================================
