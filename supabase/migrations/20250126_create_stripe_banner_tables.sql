========================================
띠지배너 시스템 테이블 생성
========================================

1. stripe_banner_config: 전체 설정 테이블
CREATE TABLE IF NOT EXISTS public.stripe_banner_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  rotation_speed INTEGER NOT NULL DEFAULT 3, -- 초 단위
  stats_mode VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (stats_mode IN ('auto', 'manual')),
  keywords_mode VARCHAR(10) NOT NULL DEFAULT 'auto' CHECK (keywords_mode IN ('auto', 'manual')),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

2. stripe_banners: 개별 배너 데이터 테이블
CREATE TABLE IF NOT EXISTS public.stripe_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('event', 'notice', 'review')),
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  bg_color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  text_color VARCHAR(7) NOT NULL DEFAULT '#ffffff',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

3. stripe_statistics: 수동 모드용 통계 데이터 테이블
CREATE TABLE IF NOT EXISTS public.stripe_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  new_jobs_count INTEGER NOT NULL DEFAULT 0,
  urgent_jobs_count INTEGER NOT NULL DEFAULT 0,
  new_talents_count INTEGER NOT NULL DEFAULT 0,
  stats_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stats_date)
);

4. popular_keywords: 인기 검색어 테이블
CREATE TABLE IF NOT EXISTS public.popular_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_manual BOOLEAN NOT NULL DEFAULT FALSE, -- 수동 추가 여부
  search_count INTEGER DEFAULT 0, -- 자동 모드에서 사용
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

인덱스 생성
CREATE INDEX IF NOT EXISTS idx_stripe_banners_order ON public.stripe_banners(display_order);
CREATE INDEX IF NOT EXISTS idx_stripe_banners_active ON public.stripe_banners(is_active);
CREATE INDEX IF NOT EXISTS idx_stripe_statistics_date ON public.stripe_statistics(stats_date DESC);
CREATE INDEX IF NOT EXISTS idx_popular_keywords_order ON public.popular_keywords(display_order);
CREATE INDEX IF NOT EXISTS idx_popular_keywords_active ON public.popular_keywords(is_active);
CREATE INDEX IF NOT EXISTS idx_popular_keywords_count ON public.popular_keywords(search_count DESC);

updated_at 자동 갱신 트리거
CREATE TRIGGER update_stripe_banner_config_updated_at
  BEFORE UPDATE ON public.stripe_banner_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_banners_updated_at
  BEFORE UPDATE ON public.stripe_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stripe_statistics_updated_at
  BEFORE UPDATE ON public.stripe_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_popular_keywords_updated_at
  BEFORE UPDATE ON public.popular_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

RLS 활성화
ALTER TABLE public.stripe_banner_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popular_keywords ENABLE ROW LEVEL SECURITY;

RLS 정책: 모두 읽기 가능
CREATE POLICY "Anyone can view stripe banner config"
ON public.stripe_banner_config FOR SELECT
USING (true);

CREATE POLICY "Anyone can view stripe banners"
ON public.stripe_banners FOR SELECT
USING (true);

CREATE POLICY "Anyone can view stripe statistics"
ON public.stripe_statistics FOR SELECT
USING (true);

CREATE POLICY "Anyone can view popular keywords"
ON public.popular_keywords FOR SELECT
USING (true);

RLS 정책: 관리자만 수정 가능
CREATE POLICY "Admins can manage stripe banner config"
ON public.stripe_banner_config FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND 'admin' = ANY(user_profiles.roles)
  )
);

CREATE POLICY "Admins can manage stripe banners"
ON public.stripe_banners FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND 'admin' = ANY(user_profiles.roles)
  )
);

CREATE POLICY "Admins can manage stripe statistics"
ON public.stripe_statistics FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND 'admin' = ANY(user_profiles.roles)
  )
);

CREATE POLICY "Admins can manage popular keywords"
ON public.popular_keywords FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND 'admin' = ANY(user_profiles.roles)
  )
);

기본 데이터 삽입
1. 전체 설정 (기본값)
INSERT INTO public.stripe_banner_config (
  is_active,
  rotation_speed,
  stats_mode,
  keywords_mode
) VALUES (
  TRUE,
  3,
  'auto',
  'auto'
) ON CONFLICT DO NOTHING;

2. 샘플 배너 데이터
INSERT INTO public.stripe_banners (type, title, description, link, bg_color, text_color, display_order, is_active) VALUES
  ('event', '신규 회원 가입 이벤트', '프리미엄 1개월 무료!', '/event/signup', '#f97316', '#ffffff', 1, TRUE),
  ('notice', '시스템 점검 안내', '10/20 02:00-04:00', '/notice/maintenance', '#3b82f6', '#ffffff', 2, TRUE),
  ('review', '성공 사례', '3일 만에 강사 구했어요!', '/review/success', '#10b981', '#ffffff', 3, TRUE)
ON CONFLICT DO NOTHING;

3. 오늘 통계 (기본값)
INSERT INTO public.stripe_statistics (
  stats_date,
  new_jobs_count,
  urgent_jobs_count,
  new_talents_count
) VALUES (
  CURRENT_DATE,
  0,
  0,
  0
) ON CONFLICT (stats_date) DO NOTHING;

4. 인기 검색어 (샘플)
INSERT INTO public.popular_keywords (keyword, display_order, is_active, is_manual) VALUES
  ('#코딩강사', 1, TRUE, TRUE),
  ('#영어강사', 2, TRUE, TRUE),
  ('#방과후', 3, TRUE, TRUE),
  ('#수원', 4, TRUE, TRUE),
  ('#성남', 5, TRUE, TRUE)
ON CONFLICT DO NOTHING;
