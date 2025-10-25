-- Phase 2: Full-Text Search 개선 (simple config + pg_trgm 유사도 검색)
-- 목적: "일본" 검색 시 "일본어" 자동 매칭, "자원봉사" 검색 시 "자원봉사자" 자동 매칭
-- 참고: PostgreSQL 'korean' config는 Supabase에서 지원되지 않으므로 'simple' + pg_trgm 조합 사용

-- 1. 기존 트리거 삭제 (충돌 방지) - 모든 가능한 트리거 이름 삭제
DROP TRIGGER IF EXISTS tsvectorupdate ON public.job_postings;
DROP TRIGGER IF EXISTS job_postings_search_vector_tgr ON public.job_postings;
DROP TRIGGER IF EXISTS job_postings_search_vector_trigger ON public.job_postings;
DROP TRIGGER IF EXISTS talents_search_vector_tgr ON public.talents;
DROP TRIGGER IF EXISTS talents_search_vector_trigger ON public.talents;

-- 2. 기존 함수 삭제 (CASCADE로 의존성 문제 해결)
DROP FUNCTION IF EXISTS public.update_job_postings_search_vector() CASCADE;
DROP FUNCTION IF EXISTS public.job_postings_update_search_vector() CASCADE;
DROP FUNCTION IF EXISTS public.update_talents_search_vector() CASCADE;
DROP FUNCTION IF EXISTS public.talents_update_search_vector() CASCADE;

-- 3. job_postings를 위한 새로운 트리거 함수 생성 (simple config 사용)
-- simple config는 유니코드 문자를 개별 토큰으로 분리하므로 "일본어" → "일본", "어"로 tokenize됨
CREATE OR REPLACE FUNCTION public.update_job_postings_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.organization, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.location, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.subject, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.detail_content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. job_postings 트리거 생성
CREATE TRIGGER job_postings_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.job_postings
FOR EACH ROW EXECUTE FUNCTION public.update_job_postings_search_vector();

-- 5. talents를 위한 새로운 트리거 함수 생성 (simple config 사용)
CREATE OR REPLACE FUNCTION public.update_talents_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.specialty, '')), 'A') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.tags, '{}'::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW.location, '{}'::text[]), ' ')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. talents 트리거 생성
CREATE TRIGGER talents_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.talents
FOR EACH ROW EXECUTE FUNCTION public.update_talents_search_vector();

-- 7. 인덱스 재생성 (이미 있으면 무시)
CREATE INDEX IF NOT EXISTS job_postings_search_vector_idx ON public.job_postings USING gin (search_vector);
CREATE INDEX IF NOT EXISTS talents_search_vector_idx ON public.talents USING gin (search_vector);

-- 8. 기존 데이터에 대한 search_vector 재생성
-- job_postings 테이블의 모든 행에 대해 트리거 실행 (title 필드를 자기 자신으로 업데이트)
UPDATE public.job_postings SET title = title WHERE search_vector IS NULL OR true;

-- talents 테이블의 모든 행에 대해 트리거 실행
UPDATE public.talents SET name = name WHERE search_vector IS NULL OR true;

-- 9. pg_trgm을 활용한 유사도 검색 헬퍼 함수 생성
-- "일본" 검색 시 "일본어" 공고를 similarity로 찾기
CREATE OR REPLACE FUNCTION public.search_jobs_with_similarity(
  search_text text,
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 100
)
RETURNS SETOF public.job_postings AS $$
BEGIN
  RETURN QUERY
  SELECT j.*
  FROM public.job_postings j
  WHERE
    similarity(j.title, search_text) > similarity_threshold OR
    similarity(j.organization, search_text) > similarity_threshold OR
    similarity(j.location, search_text) > similarity_threshold OR
    similarity(array_to_string(j.tags, ' '), search_text) > similarity_threshold OR
    similarity(coalesce(j.subject, ''), search_text) > similarity_threshold
  ORDER BY
    GREATEST(
      similarity(j.title, search_text),
      similarity(j.organization, search_text),
      similarity(j.location, search_text),
      similarity(array_to_string(j.tags, ' '), search_text),
      similarity(coalesce(j.subject, ''), search_text)
    ) DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 10. talents용 유사도 검색 헬퍼 함수
CREATE OR REPLACE FUNCTION public.search_talents_with_similarity(
  search_text text,
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 100
)
RETURNS SETOF public.talents AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM public.talents t
  WHERE
    similarity(t.name, search_text) > similarity_threshold OR
    similarity(t.specialty, search_text) > similarity_threshold OR
    similarity(array_to_string(t.tags, ' '), search_text) > similarity_threshold OR
    similarity(array_to_string(t.location, ' '), search_text) > similarity_threshold
  ORDER BY
    GREATEST(
      similarity(t.name, search_text),
      similarity(t.specialty, search_text),
      similarity(array_to_string(t.tags, ' '), search_text),
      similarity(array_to_string(t.location, ' '), search_text)
    ) DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 완료: search_vector(simple) + pg_trgm 유사도 검색 함수가 생성되었습니다.';
  RAISE NOTICE '- FTS: simple config로 기본 tokenization';
  RAISE NOTICE '- pg_trgm: 유사도 검색으로 "일본" → "일본어" 매칭 지원';
END
$$;
