-- ==========================================
-- AI 추천 문제 즉시 해결 SQL 쿼리
-- ==========================================

-- 🔍 Step 1: 현재 프로필 상태 확인
-- 사용자의 teacher_level과 capable_subjects 확인
SELECT 
  user_id,
  display_name,
  roles,
  teacher_level,
  capable_subjects,
  interest_regions,
  updated_at
FROM user_profiles
ORDER BY updated_at DESC
LIMIT 10;

-- 기대값:
-- teacher_level: "초등"
-- capable_subjects: ["초등 담임"] 또는 ["초등 과학"] 등

-- ==========================================

-- 🔍 Step 2: 추천 캐시 상태 확인
-- 캐시가 언제 생성되었고 어떤 프로필 기준인지 확인
SELECT 
  user_id,
  profile_snapshot->>'display_name' as display_name,
  profile_snapshot->>'teacher_level' as teacher_level,
  profile_snapshot->>'capable_subjects' as capable_subjects,
  jsonb_array_length(cards) as card_count,
  generated_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_since_update
FROM recommendations_cache
ORDER BY updated_at DESC
LIMIT 10;

-- 확인사항:
-- 1. teacher_level이 "초등"인지?
-- 2. capable_subjects가 비어있는지? (문제!)
-- 3. hours_since_update가 24시간 이상인지? (오래된 캐시)

-- ==========================================

-- 🔍 Step 3: 추천 카드 상세 확인
-- 특정 사용자의 추천 카드에서 school_level 분포 확인
-- ⚠️ 'YOUR_USER_ID'를 실제 user_id로 교체하세요
WITH user_recommendations AS (
  SELECT 
    user_id,
    jsonb_array_elements(cards) as card
  FROM recommendations_cache
  WHERE user_id = 'YOUR_USER_ID' -- ← 여기를 수정하세요
)
SELECT 
  card->>'type' as card_type,
  card->>'title' as title,
  card->>'organization' as organization,
  card->>'location' as location
FROM user_recommendations;

-- 확인사항:
-- 중등 공고가 포함되어 있는지?

-- ==========================================

-- ✅ Step 4: 캐시 강제 삭제 (즉시 해결)
-- ⚠️ 'YOUR_USER_ID'를 실제 user_id로 교체하세요
DELETE FROM recommendations_cache
WHERE user_id = 'YOUR_USER_ID'; -- ← 여기를 수정하세요

-- 결과: 1 row deleted (성공)
-- 다음: 프론트엔드에서 프로필 재저장

-- ==========================================

-- 🔍 Step 5: capable_subjects가 비어있는 사용자 찾기
-- 교사인데 capable_subjects가 없는 문제 사용자 확인
SELECT 
  user_id,
  display_name,
  roles,
  teacher_level,
  capable_subjects,
  updated_at
FROM user_profiles
WHERE '교사' = ANY(roles)
  AND (capable_subjects IS NULL OR capable_subjects = '[]'::jsonb)
ORDER BY updated_at DESC;

-- 이 사용자들은 모두 문제가 발생할 수 있음

-- ==========================================

-- ✅ Step 6: 문제 사용자 일괄 캐시 삭제
-- 교사인데 capable_subjects가 없는 사용자들의 캐시 삭제
DELETE FROM recommendations_cache
WHERE user_id IN (
  SELECT user_id
  FROM user_profiles
  WHERE '교사' = ANY(roles)
    AND (capable_subjects IS NULL OR capable_subjects = '[]'::jsonb)
);

-- 결과: X rows deleted (문제 사용자 수)

-- ==========================================

-- 🔍 Step 7: 프로필 재저장 후 확인
-- 프론트엔드에서 프로필을 다시 저장한 후 실행
SELECT 
  user_id,
  display_name,
  teacher_level,
  capable_subjects,
  updated_at
FROM user_profiles
WHERE user_id = 'YOUR_USER_ID' -- ← 여기를 수정하세요
ORDER BY updated_at DESC;

-- 기대값:
-- teacher_level: "초등"
-- capable_subjects: ["초등 담임"]
-- updated_at: 방금 시간

-- ==========================================

-- 🔍 Step 8: 캐시 재생성 확인
-- Edge Function이 호출되어 캐시가 재생성되었는지 확인
SELECT 
  user_id,
  profile_snapshot->>'teacher_level' as teacher_level,
  profile_snapshot->>'capable_subjects' as capable_subjects,
  jsonb_array_length(cards) as card_count,
  generated_at,
  updated_at
FROM recommendations_cache
WHERE user_id = 'YOUR_USER_ID' -- ← 여기를 수정하세요
ORDER BY updated_at DESC;

-- 기대값:
-- teacher_level: "초등"
-- capable_subjects: ["초등 담임"]
-- updated_at: 방금 시간
-- card_count: 6개

-- ==========================================

-- 🔍 Step 9: 최종 추천 카드 확인
-- 재생성된 추천 카드에 중등 공고가 없는지 확인
WITH user_recommendations AS (
  SELECT 
    user_id,
    jsonb_array_elements(cards) as card
  FROM recommendations_cache
  WHERE user_id = 'YOUR_USER_ID' -- ← 여기를 수정하세요
)
SELECT 
  card->>'type' as card_type,
  card->>'title' as title,
  card->>'organization' as organization,
  card->>'location' as location
FROM user_recommendations;

-- 기대값:
-- 모든 organization에 "초등학교"만 포함
-- "중학교", "고등학교" 없음

-- ==========================================

-- 📊 Step 10: 전체 추천 시스템 건강도 체크
-- 모든 사용자의 추천 상태 확인
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN rc.user_id IS NOT NULL THEN 1 END) as cached_users,
  COUNT(CASE WHEN up.'교사' = ANY(up.roles) THEN 1 END) as teacher_users,
  COUNT(CASE WHEN up.'교사' = ANY(up.roles) AND (up.capable_subjects IS NULL OR up.capable_subjects = '[]'::jsonb) THEN 1 END) as broken_teachers,
  ROUND(
    COUNT(CASE WHEN up.'교사' = ANY(up.roles) AND (up.capable_subjects IS NULL OR up.capable_subjects = '[]'::jsonb) THEN 1 END)::numeric 
    / NULLIF(COUNT(CASE WHEN up.'교사' = ANY(up.roles) THEN 1 END), 0)::numeric 
    * 100, 
    2
  ) as broken_teacher_percentage
FROM user_profiles up
LEFT JOIN recommendations_cache rc ON up.user_id = rc.user_id;

-- 기대값:
-- broken_teachers: 0명 (이상적)
-- broken_teacher_percentage: 0% (이상적)

-- ==========================================
-- 완료! 
-- 문제 해결 후 프론트엔드에서 페이지 새로고침
-- ==========================================
