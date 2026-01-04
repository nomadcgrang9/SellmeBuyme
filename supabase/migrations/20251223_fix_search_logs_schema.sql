-- search_logs 테이블 스키마 수정
-- query 컬럼이 없는 경우 추가 (기존 테이블과의 호환성 유지)

-- 1. query 컬럼 추가 (없는 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_logs'
      AND column_name = 'query'
  ) THEN
    -- query 컬럼이 없으면 추가
    ALTER TABLE public.search_logs ADD COLUMN query TEXT;
    RAISE NOTICE 'Added column: query';
  ELSE
    RAISE NOTICE 'Column query already exists';
  END IF;
END $$;

-- 2. search_query 컬럼이 있으면 query로 데이터 마이그레이션 후 삭제 (선택적)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_logs'
      AND column_name = 'search_query'
  ) THEN
    -- search_query 데이터를 query로 복사 (query가 비어있는 경우만)
    UPDATE public.search_logs 
    SET query = search_query 
    WHERE query IS NULL AND search_query IS NOT NULL;
    
    RAISE NOTICE 'Migrated data from search_query to query';
  END IF;
END $$;

-- 3. filters 컬럼 추가 (없는 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_logs'
      AND column_name = 'filters'
  ) THEN
    ALTER TABLE public.search_logs ADD COLUMN filters JSONB DEFAULT '{}';
    RAISE NOTICE 'Added column: filters';
  ELSE
    RAISE NOTICE 'Column filters already exists';
  END IF;
END $$;

-- 4. result_count 컬럼 추가 (없는 경우에만)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_logs'
      AND column_name = 'result_count'
  ) THEN
    ALTER TABLE public.search_logs ADD COLUMN result_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added column: result_count';
  ELSE
    RAISE NOTICE 'Column result_count already exists';
  END IF;
END $$;

-- 5. 테이블이 아예 없는 경우 생성
CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  query TEXT,
  search_query TEXT, -- 호환성을 위해 유지
  filters JSONB DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS 활성화 (이미 있으면 무시됨)
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책 생성 (이미 있으면 무시)
DO $$
BEGIN
  -- SELECT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_logs'
      AND policyname = 'Users can view own search logs'
  ) THEN
    CREATE POLICY "Users can view own search logs"
    ON public.search_logs FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  
  -- INSERT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'search_logs'
      AND policyname = 'Anyone can insert search logs'
  ) THEN
    CREATE POLICY "Anyone can insert search logs"
    ON public.search_logs FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- 8. 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON public.search_logs(user_id);
