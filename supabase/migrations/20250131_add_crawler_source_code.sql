-- Add crawler_source_code column to crawl_boards for AI-generated crawlers
ALTER TABLE public.crawl_boards
ADD COLUMN IF NOT EXISTS crawler_source_code TEXT;

COMMENT ON COLUMN public.crawl_boards.crawler_source_code IS 'AI-generated crawler source code (JavaScript/ES6 module)';
