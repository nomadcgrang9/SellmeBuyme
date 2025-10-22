-- 프로모 카드 상단 띠지 색상 추가
ALTER TABLE public.promo_card_settings
  ADD COLUMN IF NOT EXISTS badge_color TEXT NOT NULL DEFAULT '#dbeafe';

UPDATE public.promo_card_settings
SET badge_color = COALESCE(badge_color, '#dbeafe');
