-- ===================================================================
-- pg_trgm Similarity 개선 Migration (PGroonga 대안)
-- ===================================================================
-- PGroonga가 없을 경우, pg_trgm의 similarity 검색으로 부분 매칭 개선
-- "일본" → "일본어" 같은 부분 매칭이 가능하도록 설정
-- ===================================================================

-- 1. pg_trgm extension 확인 및 활성화
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. similarity threshold 설정 (0.3 = 30% 유사도)
-- 낮을수록 더 많은 결과, 높을수록 정확한 결과
SET pg_trgm.similarity_threshold = 0.3;

-- 3. GIN 인덱스 추가 (trigram 검색용)
-- 기존 FTS 인덱스와 별도로 생성
CREATE INDEX IF NOT EXISTS job_postings_title_trgm_idx ON job_postings
USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS job_postings_organization_trgm_idx ON job_postings
USING gin (organization gin_trgm_ops);

CREATE INDEX IF NOT EXISTS job_postings_location_trgm_idx ON job_postings
USING gin (location gin_trgm_ops);

CREATE INDEX IF NOT EXISTS job_postings_subject_trgm_idx ON job_postings
USING gin (subject gin_trgm_ops);

-- talents 테이블도 동일하게
CREATE INDEX IF NOT EXISTS talents_name_trgm_idx ON talents
USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS talents_specialty_trgm_idx ON talents
USING gin (specialty gin_trgm_ops);

-- 4. Similarity 검색 함수 생성
CREATE OR REPLACE FUNCTION search_jobs_similarity(
  search_text text,
  similarity_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  job_id bigint,
  title text,
  location text,
  subject text,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.location,
    j.subject,
    GREATEST(
      similarity(j.title, search_text),
      similarity(j.organization, search_text),
      similarity(j.location, search_text),
      similarity(COALESCE(j.subject, ''), search_text)
    ) as sim_score
  FROM job_postings j
  WHERE
    similarity(j.title, search_text) > similarity_threshold
    OR similarity(j.organization, search_text) > similarity_threshold
    OR similarity(j.location, search_text) > similarity_threshold
    OR similarity(COALESCE(j.subject, ''), search_text) > similarity_threshold
  ORDER BY sim_score DESC, j.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. 통합 검색 함수 (FTS + Similarity)
CREATE OR REPLACE FUNCTION search_jobs_hybrid(
  search_text text,
  use_fts boolean DEFAULT true,
  use_similarity boolean DEFAULT true,
  similarity_threshold float DEFAULT 0.3
)
RETURNS SETOF job_postings AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT j.*
  FROM job_postings j
  WHERE
    (use_fts AND j.search_vector @@ websearch_to_tsquery('simple', search_text))
    OR
    (use_similarity AND (
      similarity(j.title, search_text) > similarity_threshold
      OR similarity(j.organization, search_text) > similarity_threshold
      OR similarity(j.location, search_text) > similarity_threshold
      OR similarity(COALESCE(j.subject, ''), search_text) > similarity_threshold
    ))
  ORDER BY
    CASE
      WHEN use_similarity THEN
        GREATEST(
          similarity(j.title, search_text),
          similarity(j.organization, search_text),
          similarity(j.location, search_text),
          similarity(COALESCE(j.subject, ''), search_text)
        )
      ELSE 0
    END DESC,
    j.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. 통계 정보 업데이트
ANALYZE job_postings;
ANALYZE talents;

-- ===================================================================
-- 테스트 쿼리
-- ===================================================================

-- 테스트 1: "일본" 검색 (similarity로 "일본어" 찾기)
-- SELECT
--   title,
--   subject,
--   similarity(title, '일본') as title_sim,
--   similarity(COALESCE(subject, ''), '일본') as subject_sim
-- FROM job_postings
-- WHERE
--   similarity(title, '일본') > 0.3
--   OR similarity(COALESCE(subject, ''), '일본') > 0.3
-- ORDER BY GREATEST(
--   similarity(title, '일본'),
--   similarity(COALESCE(subject, ''), '일본')
-- ) DESC
-- LIMIT 5;

-- 테스트 2: "화성" 검색
-- SELECT
--   title,
--   location,
--   similarity(location, '화성') as loc_sim
-- FROM job_postings
-- WHERE similarity(location, '화성') > 0.3
-- ORDER BY similarity(location, '화성') DESC
-- LIMIT 5;

-- 테스트 3: 통합 검색 함수 테스트
-- SELECT title, location, subject
-- FROM search_jobs_hybrid('일본 교사', true, true, 0.3)
-- LIMIT 10;

-- 테스트 4: similarity만 사용
-- SELECT * FROM search_jobs_similarity('일본', 0.3) LIMIT 10;

-- ===================================================================
-- 성능 비교 (EXPLAIN ANALYZE 사용)
-- ===================================================================

-- FTS vs Similarity 성능 비교
-- EXPLAIN ANALYZE
-- SELECT * FROM job_postings
-- WHERE search_vector @@ websearch_to_tsquery('simple', '일본');

-- EXPLAIN ANALYZE
-- SELECT * FROM job_postings
-- WHERE similarity(title, '일본') > 0.3 OR similarity(subject, '일본') > 0.3;

-- ===================================================================
-- 롤백
-- ===================================================================

-- DROP INDEX IF EXISTS job_postings_title_trgm_idx;
-- DROP INDEX IF EXISTS job_postings_organization_trgm_idx;
-- DROP INDEX IF EXISTS job_postings_location_trgm_idx;
-- DROP INDEX IF EXISTS job_postings_subject_trgm_idx;
-- DROP INDEX IF EXISTS talents_name_trgm_idx;
-- DROP INDEX IF EXISTS talents_specialty_trgm_idx;
-- DROP FUNCTION IF EXISTS search_jobs_similarity(text, float);
-- DROP FUNCTION IF EXISTS search_jobs_hybrid(text, boolean, boolean, float);
