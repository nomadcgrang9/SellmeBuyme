-- 크롤러 헬스체크 결과 저장 테이블
-- GitHub Actions에서 매일 점검한 결과를 저장하고 프론트엔드에서 조회

CREATE TABLE IF NOT EXISTS crawler_health_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL UNIQUE,  -- seoul, busan, etc.
  region_name TEXT NOT NULL,         -- 서울, 부산, etc.
  board_url TEXT,                    -- 게시판 URL

  -- 원본 사이트 데이터
  original_count INTEGER DEFAULT 0,
  original_titles JSONB DEFAULT '[]'::jsonb,

  -- DB 데이터
  db_count INTEGER DEFAULT 0,
  latest_crawl_date TIMESTAMPTZ,
  days_since_crawl INTEGER,

  -- 비교 결과
  match_count INTEGER DEFAULT 0,
  missing_count INTEGER DEFAULT 0,
  collection_rate DECIMAL(5,2) DEFAULT 0,
  missing_titles JSONB DEFAULT '[]'::jsonb,

  -- 상태
  health_status TEXT NOT NULL DEFAULT 'unknown',  -- healthy, warning, critical, error
  status_reason TEXT,
  ai_comment TEXT,

  -- 메타
  batch_id TEXT,                     -- 같은 점검 세션 식별
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_health_results_region ON crawler_health_results(region_code);
CREATE INDEX IF NOT EXISTS idx_health_results_status ON crawler_health_results(health_status);
CREATE INDEX IF NOT EXISTS idx_health_results_checked ON crawler_health_results(checked_at);

-- RLS 비활성화 (내부 시스템용)
ALTER TABLE crawler_health_results ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "Anyone can read health results" ON crawler_health_results
  FOR SELECT USING (true);

-- 서비스 롤만 쓰기 허용
CREATE POLICY "Service role can insert/update" ON crawler_health_results
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE crawler_health_results IS '크롤러 헬스체크 결과 - GitHub Actions에서 매일 업데이트';
