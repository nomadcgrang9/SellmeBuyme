-- ==========================================
-- 크롤링 결과 검증 SQL 쿼리
-- ==========================================

-- ⚠️ 재크롤링 전: NULL 학교급 공고 삭제 (선택적)
-- 기존 NULL 공고를 삭제하고 재크롤링하면 깨끗한 데이터를 얻을 수 있습니다.
-- DELETE FROM job_postings WHERE school_level IS NULL;

-- 또는 특정 시간 이후 NULL 공고만 삭제:
-- DELETE FROM job_postings 
-- WHERE school_level IS NULL 
--   AND created_at >= NOW() - INTERVAL '2 hours';

-- 1. 최신 크롤링 결과 요약 (전체 통계)
SELECT 
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN school_level IS NOT NULL THEN 1 END) as with_school_level,
  COUNT(CASE WHEN school_level IS NULL THEN 1 END) as null_school_level,
  COUNT(CASE WHEN subject IS NOT NULL THEN 1 END) as with_subject,
  COUNT(CASE WHEN subject IS NULL THEN 1 END) as null_subject,
  COUNT(CASE WHEN required_license IS NOT NULL THEN 1 END) as with_license,
  COUNT(CASE WHEN required_license IS NULL THEN 1 END) as null_license,
  ROUND(COUNT(CASE WHEN school_level IS NOT NULL THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as school_level_fill_rate
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '1 hour';

-- 2. 학교급별 분포 (최근 1시간)
SELECT 
  school_level,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER() * 100, 2) as percentage
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY school_level
ORDER BY count DESC;

-- 3. 과목별 분포 (최근 1시간)
SELECT 
  subject,
  COUNT(*) as count
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND subject IS NOT NULL
GROUP BY subject
ORDER BY count DESC
LIMIT 20;

-- 4. NULL 학교급 공고 상세 (문제 공고 파악)
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
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND school_level IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 5. 학교급별 상위 20개 공고 (검증용)
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
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND school_level IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 6. 학교급 + 과목 조합 분포 (호환성 검증)
SELECT 
  school_level,
  subject,
  COUNT(*) as count
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND school_level IS NOT NULL
GROUP BY school_level, subject
ORDER BY count DESC
LIMIT 30;

-- 7. 지역별 공고 수 (지역 정보 확인)
SELECT 
  location,
  COUNT(*) as count
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY location
ORDER BY count DESC
LIMIT 20;

-- 8. LLM Fallback 효과 확인 (이전 크롤링과 비교)
-- 이전 1시간 vs 최근 1시간 비교
WITH previous AS (
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN school_level IS NOT NULL THEN 1 END) as filled
  FROM job_postings
  WHERE created_at >= NOW() - INTERVAL '2 hours'
    AND created_at < NOW() - INTERVAL '1 hour'
),
current AS (
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN school_level IS NOT NULL THEN 1 END) as filled
  FROM job_postings
  WHERE created_at >= NOW() - INTERVAL '1 hour'
)
SELECT 
  'Previous' as period,
  previous.total,
  previous.filled,
  ROUND(previous.filled::numeric / NULLIF(previous.total, 0)::numeric * 100, 2) as fill_rate
FROM previous
UNION ALL
SELECT 
  'Current' as period,
  current.total,
  current.filled,
  ROUND(current.filled::numeric / NULLIF(current.total, 0)::numeric * 100, 2) as fill_rate
FROM current;

-- 9. 초등/중등/유치원 공고만 필터링 (추천 시스템 검증)
SELECT 
  school_level,
  subject,
  title,
  organization,
  location
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND school_level IN ('초등', '중등', '유치원')
ORDER BY school_level, subject, created_at DESC
LIMIT 50;

-- 10. 특정 키워드로 공고 검색 (테스트용)
-- 예: "초등", "담임", "과학" 등으로 검색
SELECT 
  id,
  title,
  school_level,
  subject,
  required_license,
  location
FROM job_postings
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND (
    title ILIKE '%초등%'
    OR school_level = '초등'
  )
ORDER BY created_at DESC
LIMIT 20;
