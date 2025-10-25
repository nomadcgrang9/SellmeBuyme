
-- 1. job_postings 테이블에 search_vector 컬럼 추가
ALTER TABLE public.job_postings
ADD COLUMN search_vector tsvector;

-- 2. 검색 성능 향상을 위한 GIN 인덱스 생성
CREATE INDEX job_postings_search_vector_idx ON public.job_postings USING gin (search_vector);

-- 3. search_vector를 자동으로 업데이트하는 함수 생성
CREATE OR REPLACE FUNCTION public.update_job_postings_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('korean',
      coalesce(NEW.title, '') || ' ' ||
      coalesce(NEW.organization, '') || ' ' ||
      coalesce(NEW.location, '') || ' ' ||
      array_to_string(NEW.tags, ' ') || ' ' ||
      coalesce(NEW.detail_content, '')
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. job_postings 테이블에 트리거 생성
CREATE TRIGGER tsvectorupdate
BEFORE INSERT OR UPDATE ON public.job_postings
FOR EACH ROW EXECUTE FUNCTION public.update_job_postings_search_vector();

