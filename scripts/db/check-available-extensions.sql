-- Supabase SQL Editor에서 실행할 쿼리
-- 사용 가능한 모든 PostgreSQL Extension 확인

-- 1. PGroonga가 설치 가능한지 확인
SELECT
  name,
  default_version,
  installed_version,
  comment
FROM pg_available_extensions
WHERE name LIKE '%groonga%' OR name LIKE '%pgroonga%'
ORDER BY name;

-- 2. 전체 사용 가능한 Extension 목록 (검색 관련)
SELECT
  name,
  default_version,
  installed_version,
  comment
FROM pg_available_extensions
WHERE
  name IN ('pgroonga', 'pg_trgm', 'fuzzystrmatch', 'unaccent', 'pg_similarity')
  OR comment ILIKE '%search%'
  OR comment ILIKE '%text%'
ORDER BY name;

-- 3. 현재 설치된 Extension 확인
SELECT
  extname as name,
  extversion as version,
  extrelocatable
FROM pg_extension
ORDER BY extname;

-- 4. pg_trgm이 설치되어 있는지 확인
SELECT EXISTS(
  SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
) as has_pg_trgm;
