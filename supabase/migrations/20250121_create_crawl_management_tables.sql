-- Phase 1: Crawl management tables

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crawl_job_status') THEN
    CREATE TYPE crawl_job_status AS ENUM ('pending', 'running', 'success', 'failed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.crawl_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  board_url TEXT NOT NULL,
  category TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  status crawl_status DEFAULT 'active',
  crawl_config JSONB DEFAULT '{}'::JSONB,
  last_crawled_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  error_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crawl_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.crawl_boards(id) ON DELETE CASCADE,
  status crawl_job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  items_found INT DEFAULT 0,
  items_new INT DEFAULT 0,
  items_skipped INT DEFAULT 0,
  ai_tokens_used INT DEFAULT 0,
  error_log TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS crawl_board_id UUID REFERENCES public.crawl_boards(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_boards_board_url ON public.crawl_boards(board_url);
CREATE INDEX IF NOT EXISTS idx_crawl_boards_is_active ON public.crawl_boards(is_active);
CREATE INDEX IF NOT EXISTS idx_crawl_boards_status ON public.crawl_boards(status);
CREATE INDEX IF NOT EXISTS idx_crawl_boards_last_success_at ON public.crawl_boards(last_success_at DESC);

CREATE INDEX IF NOT EXISTS idx_crawl_logs_board_id_started_at ON public.crawl_logs(board_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_logs_status ON public.crawl_logs(status);

CREATE INDEX IF NOT EXISTS idx_job_postings_crawl_board_id ON public.job_postings(crawl_board_id);

CREATE TRIGGER update_crawl_boards_updated_at
  BEFORE UPDATE ON public.crawl_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
