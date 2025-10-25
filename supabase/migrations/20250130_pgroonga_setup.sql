-- ===================================================================
-- PGroonga Setup Migration
-- ===================================================================
-- 이 마이그레이션은 PGroonga extension이 Supabase에서 사용 가능할 때만 실행 가능합니다.
-- 실행 전 확인: SELECT * FROM pg_available_extensions WHERE name = 'pgroonga';
-- ===================================================================

-- 1. PGroonga Extension 활성화
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- 2. 기존 search_vector 인덱스 제거 (충돌 방지)
DROP INDEX IF EXISTS job_postings_search_vector_idx;
DROP INDEX IF EXISTS talents_search_vector_idx;

-- 3. PGroonga 인덱스 생성 (job_postings)
-- 여러 필드를 배열로 묶어서 통합 검색
CREATE INDEX job_postings_pgroonga_idx ON job_postings
USING pgroonga ((ARRAY[title, organization, location, subject, detail_content]))
WITH (tokenizer='TokenMecab'); -- 한글/일본어/중국어 형태소 분석

-- 4. PGroonga 인덱스 생성 (talents)
CREATE INDEX talents_pgroonga_idx ON talents
USING pgroonga ((ARRAY[name, specialty]))
WITH (tokenizer='TokenMecab');

-- 5. PGroonga 검색 함수 생성 (편의 함수)
CREATE OR REPLACE FUNCTION search_jobs_pgroonga(search_text text)
RETURNS SETOF job_postings AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM job_postings
  WHERE ARRAY[title, organization, location, subject, detail_content] &@~ search_text
  ORDER BY
    pgroonga_score(ARRAY[title, organization, location, subject, detail_content]) DESC,
    created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. 기존 search_vector 컬럼 유지 (하위 호환성)
-- FTS와 PGroonga를 동시에 사용 가능하도록
-- 주석: queries.ts에서 PGroonga 우선 사용, 실패 시 FTS fallback

-- 7. 통계 정보 업데이트
ANALYZE job_postings;
ANALYZE talents;

-- 8. 성능 확인용 뷰 생성
CREATE OR REPLACE VIEW pgroonga_search_stats AS
SELECT
  'job_postings' as table_name,
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('job_postings')) as table_size,
  pg_size_pretty(pg_total_relation_size('job_postings_pgroonga_idx')) as index_size
FROM job_postings
UNION ALL
SELECT
  'talents' as table_name,
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('talents')) as table_size,
  pg_size_pretty(pg_total_relation_size('talents_pgroonga_idx')) as index_size
FROM talents;

-- ===================================================================
-- 테스트 쿼리 (실행 후 확인용)
-- ===================================================================

-- 테스트 1: "일본" 검색 (자동으로 "일본어" 매칭되는지 확인)
-- SELECT title, subject, tags
-- FROM job_postings
-- WHERE ARRAY[title, organization, location, subject] &@~ '일본'
-- LIMIT 5;

-- 테스트 2: "화성" 검색 (자동으로 "화성시" 매칭되는지 확인)
-- SELECT title, location
-- FROM job_postings
-- WHERE ARRAY[title, organization, location, subject] &@~ '화성'
-- LIMIT 5;

-- 테스트 3: 스코어링 (관련도 순 정렬)
-- SELECT
--   title,
--   location,
--   pgroonga_score(ARRAY[title, organization, location, subject]) as score
-- FROM job_postings
-- WHERE ARRAY[title, organization, location, subject] &@~ '교사 수원'
-- ORDER BY score DESC
-- LIMIT 10;

-- ===================================================================
-- 롤백 방법 (문제 발생 시)
-- ===================================================================

-- DROP INDEX IF EXISTS job_postings_pgroonga_idx;
-- DROP INDEX IF EXISTS talents_pgroonga_idx;
-- DROP FUNCTION IF EXISTS search_jobs_pgroonga(text);
-- DROP VIEW IF EXISTS pgroonga_search_stats;
-- DROP EXTENSION IF EXISTS pgroonga;
