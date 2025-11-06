-- ============================================
-- 관리자 대시보드 통계 쿼리 모음
-- ============================================

-- 1. 일간 활성 사용자 (DAU) - 오늘
-- ============================================
SELECT COUNT(DISTINCT user_id) as dau
FROM user_activity_logs
WHERE DATE(created_at) = CURRENT_DATE
  AND user_id IS NOT NULL;

-- 2. 월간 활성 사용자 (MAU) - 최근 30일
-- ============================================
SELECT COUNT(DISTINCT user_id) as mau
FROM user_activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND user_id IS NOT NULL;

-- 3. 공고 등록 수 - 오늘
-- ============================================
SELECT COUNT(*) as job_count
FROM job_postings
WHERE DATE(created_at) = CURRENT_DATE;

-- 4. 인력 등록 수 - 오늘
-- ============================================
SELECT COUNT(*) as talent_count
FROM talents
WHERE DATE(created_at) = CURRENT_DATE;

-- 5. 일일 방문자 추이 (최근 7일)
-- ============================================
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT user_id) as visitors
FROM user_activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;

-- 6. 인기 검색어 TOP 10
-- ============================================
SELECT 
  search_query as keyword,
  COUNT(*) as count
FROM search_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND search_query IS NOT NULL
  AND search_query != ''
GROUP BY search_query
ORDER BY count DESC
LIMIT 10;

-- 7. 성별 분포
-- ============================================
SELECT 
  gender,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_profiles
WHERE gender IS NOT NULL
GROUP BY gender;

-- 8. 연령대 분포
-- ============================================
SELECT 
  CASE 
    WHEN age BETWEEN 20 AND 29 THEN '20대'
    WHEN age BETWEEN 30 AND 39 THEN '30대'
    WHEN age BETWEEN 40 AND 49 THEN '40대'
    WHEN age >= 50 THEN '50대+'
    ELSE '기타'
  END as age_group,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_profiles
WHERE age IS NOT NULL
GROUP BY age_group
ORDER BY age_group;

-- 9. 역할 분포
-- ============================================
SELECT 
  role,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM user_profiles
WHERE role IS NOT NULL
GROUP BY role
ORDER BY count DESC;

-- 10. 지역 분포 TOP 5
-- ============================================
SELECT 
  primary_region as region,
  COUNT(*) as count
FROM user_profiles
WHERE primary_region IS NOT NULL
GROUP BY primary_region
ORDER BY count DESC
LIMIT 5;

-- 11. 메뉴 클릭 통계 (오늘)
-- ============================================
SELECT 
  action_type,
  COUNT(*) as count
FROM user_activity_logs
WHERE DATE(created_at) = CURRENT_DATE
  AND action_type IN ('job_toggle', 'talent_toggle', 'experience_toggle', 'search', 'filter', 'register')
GROUP BY action_type;

-- 12. 시간대별 트래픽 (오늘)
-- ============================================
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(DISTINCT user_id) as visitors
FROM user_activity_logs
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY hour
ORDER BY hour;

-- ============================================
-- 필요한 테이블 생성 (아직 없는 경우)
-- ============================================

-- user_activity_logs 테이블
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- search_logs 테이블
CREATE TABLE IF NOT EXISTS search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  search_query TEXT NOT NULL,
  filters JSONB,
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블이 있다면 삭제하고 재생성 (개발 환경에서만 사용)
-- DROP TABLE IF EXISTS search_logs CASCADE;
-- DROP TABLE IF EXISTS user_activity_logs CASCADE;

-- user_profiles 테이블에 필요한 컬럼 추가 (이미 있다면 스킵)
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age INTEGER;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS role TEXT;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at);
CREATE INDEX IF NOT EXISTS idx_talents_created_at ON talents(created_at);
