-- 프로모 카드 설정 테이블
CREATE TABLE IF NOT EXISTS public.promo_card_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  headline TEXT NOT NULL,
  sub_headline TEXT,
  description TEXT,
  cta_label TEXT,
  cta_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  image_url TEXT,
  insert_position INTEGER NOT NULL DEFAULT 2,
  last_draft_at TIMESTAMPTZ,
  last_applied_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거 연결
CREATE TRIGGER update_promo_card_settings_updated_at
  BEFORE UPDATE ON public.promo_card_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 기본 데이터 삽입 (없을 경우에만)
INSERT INTO public.promo_card_settings (
  id,
  is_active,
  headline,
  sub_headline,
  description,
  cta_label,
  cta_url,
  primary_color,
  accent_color,
  image_url,
  insert_position,
  last_draft_at,
  last_applied_at
)
SELECT
  gen_random_uuid(),
  TRUE,
  '셀바, 학교와 교육자원을 연결합니다',
  '맞춤 매칭으로 원하는 파트너를 만나보세요',
  '학교와 강사를 연결하는 맞춤 큐레이션 서비스. 최신 공고와 인력 정보를 바탕으로 빠르게 매칭합니다.',
  '셀바 소개 보기',
  '/about',
  '#f7c6d9',
  '#ef8ab2',
  '/picture/section%20right%20ad2.png',
  2,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.promo_card_settings);

-- RLS 활성화 및 정책 설정
ALTER TABLE public.promo_card_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view promo card settings"
ON public.promo_card_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert promo card settings"
ON public.promo_card_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.roles IS NOT NULL
      AND 'admin' = ANY(user_profiles.roles)
  )
);

CREATE POLICY "Admins can update promo card settings"
ON public.promo_card_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.roles IS NOT NULL
      AND 'admin' = ANY(user_profiles.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.roles IS NOT NULL
      AND 'admin' = ANY(user_profiles.roles)
  )
);

CREATE POLICY "Admins can delete promo card settings"
ON public.promo_card_settings FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.roles IS NOT NULL
      AND 'admin' = ANY(user_profiles.roles)
  )
);
