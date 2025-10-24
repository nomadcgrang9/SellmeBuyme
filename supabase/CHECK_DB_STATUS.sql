-- ========================================
-- DB 상태 확인 쿼리
-- 작성일: 2025-01-24
-- 목적: 마이그레이션 적용 여부 및 추천 실패 원인 파악
-- ========================================

-- 1. user_profiles 테이블 전체 컬럼 확인
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. capable_subjects 컬럼 존재 여부 (중요!)
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'user_profiles' 
    AND column_name = 'capable_subjects'
    AND table_schema = 'public'
) AS capable_subjects_exists;

-- 3. 제거되어야 할 컬럼들이 남아있는지 확인
SELECT 
  column_name,
  '❌ 이 컬럼은 제거되어야 합니다' AS status
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
  AND column_name IN ('primary_region', 'preferred_job_types', 'preferred_subjects');

-- 4. job_postings 테이블 필수 컬럼 확인
SELECT 
  column_name, 
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('school_level', 'subject', 'required_license') 
    THEN '✅ 필수 컬럼'
    ELSE ''
  END AS importance
FROM information_schema.columns 
WHERE table_name = 'job_postings' 
  AND table_schema = 'public'
  AND column_name IN ('school_level', 'subject', 'required_license', 'title', 'organization')
ORDER BY 
  CASE 
    WHEN column_name IN ('school_level', 'subject', 'required_license') THEN 1
    ELSE 2
  END;

-- 5. 인덱스 존재 확인
SELECT 
  indexname,
  indexdef,
  '✅ 인덱스 존재' AS status
FROM pg_indexes
WHERE tablename IN ('user_profiles', 'job_postings')
  AND schemaname = 'public'
  AND (
    indexname LIKE '%capable_subjects%' 
    OR indexname LIKE '%teacher_level%'
    OR indexname LIKE '%school_level%'
  )
ORDER BY tablename, indexname;

-- 6. 실제 데이터 샘플 확인
SELECT 
  user_id,
  display_name,
  roles,
  teacher_level,
  capable_subjects,
  interest_regions,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 3;

-- 7. job_postings 데이터 샘플 확인
SELECT 
  id,
  title,
  organization,
  school_level,
  subject,
  required_license,
  location,
  created_at
FROM job_postings
ORDER BY created_at DESC
LIMIT 5;

-- 8. recommendations_cache 테이블 확인
SELECT 
  user_id,
  profile_snapshot->>'capable_subjects' AS cached_capable_subjects,
  profile_snapshot->>'teacher_level' AS cached_teacher_level,
  jsonb_array_length(cards) AS card_count,
  updated_at
FROM recommendations_cache
ORDER BY updated_at DESC
LIMIT 3;

-- ========================================
-- 결과 해석 가이드
-- ========================================
--
-- 1. capable_subjects_exists = FALSE
--    → 마이그레이션 미적용! 
--    → 20250125_simplify_user_profiles.sql 실행 필요
--
-- 2. primary_region, preferred_job_types, preferred_subjects 존재
--    → 마이그레이션 미적용!
--    → 20250125_simplify_user_profiles.sql 실행 필요
--
-- 3. school_level, subject, required_license 없음
--    → job_postings 마이그레이션 미적용
--    → 20250124_add_school_level_fields.sql 실행 필요
--
-- 4. 인덱스 결과가 비어있음
--    → 성능 최적화 안 됨
--    → 마이그레이션 재실행 필요
--
-- ========================================
