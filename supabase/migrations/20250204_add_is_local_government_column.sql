-- Phase 6-1: Add is_local_government column to board tables
-- Adds boolean flag to distinguish between local (기초자치단체) and regional (광역자치단체) government boards

-- ============================================================================
-- Add is_local_government to crawl_boards
-- ============================================================================
ALTER TABLE public.crawl_boards
  ADD COLUMN IF NOT EXISTS is_local_government BOOLEAN DEFAULT false;

-- Add region column if not exists (for simple string-based region names)
ALTER TABLE public.crawl_boards
  ADD COLUMN IF NOT EXISTS region TEXT;

-- ============================================================================
-- Add is_local_government to dev_board_submissions
-- ============================================================================
ALTER TABLE public.dev_board_submissions
  ADD COLUMN IF NOT EXISTS is_local_government BOOLEAN DEFAULT false;

-- Add region column if not exists
ALTER TABLE public.dev_board_submissions
  ADD COLUMN IF NOT EXISTS region TEXT;

-- ============================================================================
-- Create indexes for filtering
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_crawl_boards_is_local_government
  ON public.crawl_boards(is_local_government);

CREATE INDEX IF NOT EXISTS idx_crawl_boards_region
  ON public.crawl_boards(region);

CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_is_local_government
  ON public.dev_board_submissions(is_local_government);

CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_region
  ON public.dev_board_submissions(region);

-- ============================================================================
-- Backfill existing manual crawlers with is_local_government flag
-- ============================================================================

-- 성남교육지원청: 기초자치단체
UPDATE public.crawl_boards
SET
  is_local_government = true,
  region = '성남'
WHERE name = '성남교육지원청 구인' OR board_url LIKE '%goesn.kr%';

-- 의정부교육지원청: 기초자치단체
UPDATE public.crawl_boards
SET
  is_local_government = true,
  region = '의정부'
WHERE name = '의정부교육지원청 구인' OR board_url LIKE '%goeujb%';

-- 구리남양주교육지원청: 기초자치단체 (통합)
UPDATE public.crawl_boards
SET
  is_local_government = true,
  region = '구리남양주'
WHERE name LIKE '%구리남양주%' OR name LIKE '%남양주%' OR board_url LIKE '%goegn.kr%';

-- 경기도교육청: 광역자치단체
UPDATE public.crawl_boards
SET
  is_local_government = false,
  region = '경기'
WHERE name LIKE '%경기도%교육청%' OR board_url LIKE '%goe.go.kr%';

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN public.crawl_boards.is_local_government IS
  '기초자치단체 여부 (true=기초자치단체 단일 시/군, false=광역자치단체 여러 시/군 관할)';

COMMENT ON COLUMN public.crawl_boards.region IS
  '지역명 (예: "성남", "의정부", "구리남양주", "경기")';

COMMENT ON COLUMN public.dev_board_submissions.is_local_government IS
  '기초자치단체 여부 (true=기초자치단체 단일 시/군, false=광역자치단체 여러 시/군 관할)';

COMMENT ON COLUMN public.dev_board_submissions.region IS
  '지역명 (예: "가평", "포천", "경기")';
