-- Developer Page Tables Migration
-- Creates tables for: ideas, board submissions, and github deployments

-- =============================================================================
-- 1. dev_ideas (아이디어 수집)
-- =============================================================================
CREATE TABLE IF NOT EXISTS dev_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NULL,  -- 공개 접근이므로 NULL 허용
  author_name TEXT DEFAULT '익명',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feature', 'bug', 'design', 'other')),
  images TEXT[] DEFAULT '{}',  -- Supabase Storage URL 배열
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dev_ideas
CREATE INDEX IF NOT EXISTS idx_dev_ideas_created_at ON dev_ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_ideas_category ON dev_ideas(category);

-- RLS Policies for dev_ideas (완전 공개)
ALTER TABLE dev_ideas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ideas" ON dev_ideas;
CREATE POLICY "Anyone can view ideas"
  ON dev_ideas FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can create ideas" ON dev_ideas;
CREATE POLICY "Anyone can create ideas"
  ON dev_ideas FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update own ideas" ON dev_ideas;
CREATE POLICY "Anyone can update own ideas"
  ON dev_ideas FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete own ideas" ON dev_ideas;
CREATE POLICY "Anyone can delete own ideas"
  ON dev_ideas FOR DELETE
  TO public
  USING (true);

-- =============================================================================
-- 2. dev_board_submissions (게시판 제출)
-- =============================================================================
CREATE TABLE IF NOT EXISTS dev_board_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID REFERENCES auth.users(id) NULL,
  submitter_name TEXT DEFAULT '익명',
  board_name TEXT NOT NULL,
  board_url TEXT NOT NULL,
  region TEXT,
  description TEXT,
  screenshot_url TEXT,  -- Supabase Storage URL
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dev_board_submissions
CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_status ON dev_board_submissions(status);
CREATE INDEX IF NOT EXISTS idx_dev_board_submissions_created_at ON dev_board_submissions(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_board_submissions_url ON dev_board_submissions(board_url);

-- RLS Policies for dev_board_submissions (완전 공개)
ALTER TABLE dev_board_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view submissions" ON dev_board_submissions;
CREATE POLICY "Anyone can view submissions"
  ON dev_board_submissions FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Anyone can create submissions" ON dev_board_submissions;
CREATE POLICY "Anyone can create submissions"
  ON dev_board_submissions FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update submissions" ON dev_board_submissions;
CREATE POLICY "Anyone can update submissions"
  ON dev_board_submissions FOR UPDATE
  TO public
  USING (status = 'pending')  -- 대기 중일 때만 수정 가능
  WITH CHECK (status = 'pending');

-- =============================================================================
-- 3. github_deployments (GitHub 배포 추적)
-- =============================================================================
CREATE TABLE IF NOT EXISTS github_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_sha TEXT NOT NULL,
  commit_message TEXT,
  branch TEXT NOT NULL,
  author TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failure')),
  workflow_run_id TEXT,
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for github_deployments
CREATE INDEX IF NOT EXISTS idx_github_deployments_deployed_at ON github_deployments(deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_deployments_branch ON github_deployments(branch);

-- RLS Policies for github_deployments (읽기만 가능)
ALTER TABLE github_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view deployments" ON github_deployments;
CREATE POLICY "Anyone can view deployments"
  ON github_deployments FOR SELECT
  TO public
  USING (true);

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON TABLE dev_ideas IS '개발자 페이지 아이디어 수집 테이블 (완전 공개)';
COMMENT ON TABLE dev_board_submissions IS '게시판 등록 제출 테이블 (관리자 승인 필요)';
COMMENT ON TABLE github_deployments IS 'GitHub 배포 추적 테이블 (읽기 전용)';
