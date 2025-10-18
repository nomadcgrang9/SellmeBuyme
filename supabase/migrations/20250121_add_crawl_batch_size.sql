-- Phase 2 prep: per-board crawl batch size

ALTER TABLE public.crawl_boards
  ADD COLUMN IF NOT EXISTS crawl_batch_size INT NOT NULL DEFAULT 20 CHECK (crawl_batch_size > 0);
