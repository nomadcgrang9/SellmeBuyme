-- Add created_by column to crawl_boards for AI crawler ownership tracking
-- Ensures Phase 5 pipeline can record the administrator who registered the crawler

BEGIN;

ALTER TABLE public.crawl_boards
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.crawl_boards.created_by IS '크롤러를 생성한 관리자 user_id';

COMMIT;
