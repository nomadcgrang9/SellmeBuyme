-- Add crawler_source_code column to crawl_boards to store AI-generated source
-- Phase 5 AI crawler integration support

BEGIN;

ALTER TABLE public.crawl_boards
  ADD COLUMN IF NOT EXISTS crawler_source_code TEXT;

COMMENT ON COLUMN public.crawl_boards.crawler_source_code IS 'AI 생성 크롤러 원본 코드 저장';

COMMIT;
