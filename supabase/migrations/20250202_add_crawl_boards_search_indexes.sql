-- ===================================================================
-- crawl_boards 테이블 검색 인덱스 추가
-- ===================================================================
-- pg_trgm을 활용한 similarity 검색으로 부분 매칭 개선
-- "경기도" 검색 시 "경기도 > 성남시", "경기도 > 의정부시" 모두 매칭
-- ===================================================================

-- 1. pg_trgm extension 확인 (이미 활성화되어 있어야 함)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. crawl_boards 테이블에 GIN 인덱스 추가
CREATE INDEX IF NOT EXISTS crawl_boards_name_trgm_idx ON crawl_boards
USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS crawl_boards_board_url_trgm_idx ON crawl_boards
USING gin (board_url gin_trgm_ops);

CREATE INDEX IF NOT EXISTS crawl_boards_category_trgm_idx ON crawl_boards
USING gin (category gin_trgm_ops);

CREATE INDEX IF NOT EXISTS crawl_boards_region_display_name_trgm_idx ON crawl_boards
USING gin (region_display_name gin_trgm_ops);

-- 3. 계층적 지역 검색 함수 생성
-- "경기도" 검색 시 parent 지역(경기도)과 children 지역(성남시, 의정부시 등) 모두 반환
CREATE OR REPLACE FUNCTION search_crawl_boards_by_region(
  search_text text,
  similarity_threshold float DEFAULT 0.2
)
RETURNS TABLE (
  board_id uuid,
  board_name text,
  region_display_name text,
  similarity_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.id,
    cb.name,
    cb.region_display_name,
    GREATEST(
      similarity(COALESCE(cb.region_display_name, ''), search_text),
      similarity(COALESCE(cb.name, ''), search_text),
      similarity(COALESCE(cb.category, ''), search_text)
    ) as sim_score
  FROM crawl_boards cb
  WHERE
    -- 지역명 직접 매칭
    similarity(COALESCE(cb.region_display_name, ''), search_text) > similarity_threshold
    -- 또는 게시판 이름에 지역명 포함
    OR similarity(COALESCE(cb.name, ''), search_text) > similarity_threshold
    -- 또는 카테고리에 지역명 포함
    OR similarity(COALESCE(cb.category, ''), search_text) > similarity_threshold
    -- 또는 ILIKE로 부분 매칭 (계층적 검색: "경기도" → "경기도 > 성남시")
    OR cb.region_display_name ILIKE '%' || search_text || '%'
    OR cb.name ILIKE '%' || search_text || '%'
    OR cb.category ILIKE '%' || search_text || '%'
  ORDER BY sim_score DESC, cb.name ASC;
END;
$$ LANGUAGE plpgsql;

-- 4. 통합 검색 함수 (필터 + 정렬)
CREATE OR REPLACE FUNCTION search_crawl_boards_advanced(
  search_text text DEFAULT NULL,
  filter_active boolean DEFAULT NULL,
  filter_region_code text DEFAULT NULL,
  similarity_threshold float DEFAULT 0.2
)
RETURNS SETOF crawl_boards AS $$
BEGIN
  RETURN QUERY
  SELECT cb.*
  FROM crawl_boards cb
  WHERE
    -- 활성화 필터
    (filter_active IS NULL OR cb.is_active = filter_active)
    -- 지역 코드 필터 (계층적: parent 또는 child)
    AND (
      filter_region_code IS NULL
      OR cb.region_code = filter_region_code
      OR cb.region_display_name ILIKE (
        SELECT name || '%' FROM regions WHERE code = filter_region_code LIMIT 1
      )
    )
    -- 검색어 필터 (similarity + ILIKE)
    AND (
      search_text IS NULL
      OR search_text = ''
      OR similarity(COALESCE(cb.region_display_name, ''), search_text) > similarity_threshold
      OR similarity(COALESCE(cb.name, ''), search_text) > similarity_threshold
      OR similarity(COALESCE(cb.category, ''), search_text) > similarity_threshold
      OR cb.region_display_name ILIKE '%' || search_text || '%'
      OR cb.name ILIKE '%' || search_text || '%'
      OR cb.category ILIKE '%' || search_text || '%'
      OR cb.board_url ILIKE '%' || search_text || '%'
    )
  ORDER BY
    CASE
      WHEN search_text IS NOT NULL AND search_text != '' THEN
        GREATEST(
          similarity(COALESCE(cb.region_display_name, ''), search_text),
          similarity(COALESCE(cb.name, ''), search_text),
          similarity(COALESCE(cb.category, ''), search_text)
        )
      ELSE 0
    END DESC,
    cb.name ASC;
END;
$$ LANGUAGE plpgsql;

-- 5. 통계 정보 업데이트
ANALYZE crawl_boards;

-- ===================================================================
-- 테스트 쿼리
-- ===================================================================

-- 테스트 1: "경기도" 검색 (계층적 매칭)
-- SELECT * FROM search_crawl_boards_by_region('경기도', 0.2);
-- 예상: 경기도, 경기도 > 성남시, 경기도 > 의정부시 모두 반환

-- 테스트 2: "성남" 검색
-- SELECT * FROM search_crawl_boards_by_region('성남', 0.2);
-- 예상: 성남교육지원청, 경기도 > 성남시 반환

-- 테스트 3: 통합 검색 함수 (활성화된 게시판만)
-- SELECT name, region_display_name, is_active
-- FROM search_crawl_boards_advanced('경기', true, NULL, 0.2);

-- 테스트 4: 지역 코드 필터 (경기도 전체)
-- SELECT name, region_display_name
-- FROM search_crawl_boards_advanced(NULL, NULL, 'KR-41', 0.2);

-- ===================================================================
-- 성능 테스트
-- ===================================================================

-- EXPLAIN ANALYZE
-- SELECT * FROM search_crawl_boards_advanced('경기도', NULL, NULL, 0.2);

-- ===================================================================
-- 롤백
-- ===================================================================

-- DROP INDEX IF EXISTS crawl_boards_name_trgm_idx;
-- DROP INDEX IF EXISTS crawl_boards_board_url_trgm_idx;
-- DROP INDEX IF EXISTS crawl_boards_category_trgm_idx;
-- DROP INDEX IF EXISTS crawl_boards_region_display_name_trgm_idx;
-- DROP FUNCTION IF EXISTS search_crawl_boards_by_region(text, float);
-- DROP FUNCTION IF EXISTS search_crawl_boards_advanced(text, boolean, text, float);
