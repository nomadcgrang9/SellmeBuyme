-- Create crawler_health_jobs table for tracking health check jobs
CREATE TABLE IF NOT EXISTS crawler_health_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed

  -- Results
  original_count INTEGER,
  original_titles JSONB,
  db_count INTEGER,
  latest_crawl_date TIMESTAMPTZ,
  days_since_crawl INTEGER,
  match_count INTEGER,
  missing_count INTEGER,
  collection_rate NUMERIC,
  missing_titles JSONB,
  health_status TEXT, -- healthy, warning, critical, inactive, error
  status_reason TEXT,
  ai_comment TEXT,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_crawler_health_jobs_status ON crawler_health_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crawler_health_jobs_region ON crawler_health_jobs(region_code);
CREATE INDEX IF NOT EXISTS idx_crawler_health_jobs_created ON crawler_health_jobs(created_at DESC);

-- Row Level Security
ALTER TABLE crawler_health_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read health jobs
CREATE POLICY "Allow authenticated users to read health jobs"
  ON crawler_health_jobs FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage health jobs
CREATE POLICY "Allow service role to manage health jobs"
  ON crawler_health_jobs FOR ALL
  TO service_role
  USING (true);
