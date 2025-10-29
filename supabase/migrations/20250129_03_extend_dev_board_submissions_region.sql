-- Extend dev_board_submissions table with regional management and approval workflow
-- Adds: region codes, school level, crawl_board linkage, review tracking

-- ============================================================================
-- Add regional and review tracking columns
-- ============================================================================
ALTER TABLE public.dev_board_submissions
  ADD COLUMN IF NOT EXISTS region_code TEXT REFERENCES public.regions(code),
  ADD COLUMN IF NOT EXISTS subregion_code TEXT REFERENCES public.regions(code),
  ADD COLUMN IF NOT EXISTS school_level TEXT CHECK (school_level IN ('elementary', 'middle', 'high', 'mixed')),
  ADD COLUMN IF NOT EXISTS crawl_board_id UUID REFERENCES public.crawl_boards(id),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Rename admin_notes to admin_review_comment for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'dev_board_submissions'
    AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.dev_board_submissions
    RENAME COLUMN admin_notes TO admin_review_comment;
  END IF;
END $$;

-- ============================================================================
-- Indexes for filtering and performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_region_code ON public.dev_board_submissions(region_code);
CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_subregion_code ON public.dev_board_submissions(subregion_code);
CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_school_level ON public.dev_board_submissions(school_level);
CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_crawl_board_id ON public.dev_board_submissions(crawl_board_id);
CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_reviewed_at ON public.dev_board_submissions(reviewed_at DESC);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN public.dev_board_submissions.region_code IS '광역자치단체 코드 (예: KR-41 = 경기도)';
COMMENT ON COLUMN public.dev_board_submissions.subregion_code IS '시군구 코드 (예: 4136025 = 남양주시)';
COMMENT ON COLUMN public.dev_board_submissions.school_level IS '학교급 (elementary=초등, middle=중등, high=고등, mixed=혼합)';
COMMENT ON COLUMN public.dev_board_submissions.crawl_board_id IS '승인 시 생성된 crawl_board의 ID (연결)';
COMMENT ON COLUMN public.dev_board_submissions.reviewed_by IS '검토한 관리자 user_id';
COMMENT ON COLUMN public.dev_board_submissions.reviewed_at IS '검토 완료 시각';
COMMENT ON COLUMN public.dev_board_submissions.admin_review_comment IS '관리자 검토 코멘트 (승인/거부 사유)';
