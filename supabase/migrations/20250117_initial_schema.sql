-- 사용자 역할 enum
CREATE TYPE user_role AS ENUM ('school', 'talent', 'admin');
-- 공고 소스 enum
CREATE TYPE job_source AS ENUM ('crawled', 'user_posted');
-- 크롤링 소스 상태 enum
CREATE TYPE crawl_status AS ENUM ('active', 'broken', 'blocked');
-- 크롤링 파서 타입 enum
CREATE TYPE parser_type AS ENUM ('html', 'api');
-- 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'talent',
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 공고 테이블
CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  source job_source DEFAULT 'user_posted',
  crawl_source_id UUID,
  organization TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  location TEXT NOT NULL,
  compensation TEXT,
  deadline DATE,
  is_urgent BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 인력풀 테이블
CREATE TABLE IF NOT EXISTS public.talents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  location TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC(2,1) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 크롤링 소스 관리 테이블
CREATE TABLE IF NOT EXISTS public.crawl_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  parser_type parser_type DEFAULT 'html',
  selectors JSONB DEFAULT '{}',
  status crawl_status DEFAULT 'active',
  last_successful TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 검색 로그 테이블
CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON public.job_postings(location);
CREATE INDEX IF NOT EXISTS idx_job_postings_tags ON public.job_postings USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_job_postings_deadline ON public.job_postings(deadline);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON public.job_postings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talents_location ON public.talents USING GIN(location);
CREATE INDEX IF NOT EXISTS idx_talents_tags ON public.talents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_talents_rating ON public.talents(rating DESC);
-- Row Level Security (RLS) 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
-- RLS 정책: 모든 사용자가 공고 조회 가능
CREATE POLICY "Anyone can view job postings"
ON public.job_postings FOR SELECT
USING (true);
-- RLS 정책: 인증된 사용자만 공고 등록 가능
CREATE POLICY "Authenticated users can insert job postings"
ON public.job_postings FOR INSERT
WITH CHECK (auth.uid() = user_id);
-- RLS 정책: 본인이 등록한 공고만 수정 가능
CREATE POLICY "Users can update own job postings"
ON public.job_postings FOR UPDATE
USING (auth.uid() = user_id);
-- RLS 정책: 본인이 등록한 공고만 삭제 가능
CREATE POLICY "Users can delete own job postings"
ON public.job_postings FOR DELETE
USING (auth.uid() = user_id);
-- RLS 정책: 모든 사용자가 인력풀 조회 가능
CREATE POLICY "Anyone can view talents"
ON public.talents FOR SELECT
USING (true);
-- RLS 정책: 인증된 사용자만 인력 등록 가능
CREATE POLICY "Authenticated users can insert talents"
ON public.talents FOR INSERT
WITH CHECK (auth.uid() = user_id);
-- RLS 정책: 본인 프로필만 수정 가능
CREATE POLICY "Users can update own talent profile"
ON public.talents FOR UPDATE
USING (auth.uid() = user_id);
-- RLS 정책: 본인 프로필만 삭제 가능
CREATE POLICY "Users can delete own talent profile"
ON public.talents FOR DELETE
USING (auth.uid() = user_id);
-- RLS 정책: 본인 검색 로그만 조회 가능
CREATE POLICY "Users can view own search logs"
ON public.search_logs FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);
-- RLS 정책: 모든 사용자가 검색 로그 생성 가능
CREATE POLICY "Anyone can insert search logs"
ON public.search_logs FOR INSERT
WITH CHECK (true);
-- 자동 updated_at 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- updated_at 트리거 설정
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_talents_updated_at
  BEFORE UPDATE ON public.talents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crawl_sources_updated_at
  BEFORE UPDATE ON public.crawl_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
