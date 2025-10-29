-- Extend crawl_boards table with regional management fields
-- Adds: region codes, school level, approval tracking

-- ============================================================================
-- Add regional management columns
-- ============================================================================
ALTER TABLE public.crawl_boards
  ADD COLUMN IF NOT EXISTS region_code TEXT REFERENCES public.regions(code),
  ADD COLUMN IF NOT EXISTS subregion_code TEXT REFERENCES public.regions(code),
  ADD COLUMN IF NOT EXISTS region_display_name TEXT,  -- UI용 표시명: "경기도 > 남양주시"
  ADD COLUMN IF NOT EXISTS school_level TEXT CHECK (school_level IN ('elementary', 'middle', 'high', 'mixed')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- Indexes for filtering
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_crawl_boards_region_code ON public.crawl_boards(region_code);
CREATE INDEX IF NOT EXISTS idx_crawl_boards_subregion_code ON public.crawl_boards(subregion_code);
CREATE INDEX IF NOT EXISTS idx_crawl_boards_school_level ON public.crawl_boards(school_level);
CREATE INDEX IF NOT EXISTS idx_crawl_boards_approved_at ON public.crawl_boards(approved_at DESC);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN public.crawl_boards.region_code IS '광역자치단체 코드 (예: KR-41 = 경기도)';
COMMENT ON COLUMN public.crawl_boards.subregion_code IS '시군구 코드 (예: 4136025 = 남양주시)';
COMMENT ON COLUMN public.crawl_boards.region_display_name IS 'UI 표시용 지역명 (예: "경기도 > 남양주시")';
COMMENT ON COLUMN public.crawl_boards.school_level IS '학교급 (elementary=초등, middle=중등, high=고등, mixed=혼합)';
COMMENT ON COLUMN public.crawl_boards.approved_at IS '관리자 승인 시각';
COMMENT ON COLUMN public.crawl_boards.approved_by IS '승인한 관리자 user_id';
