-- 프로모 카드 테이블 구조 단순화
ALTER TABLE public.promo_card_settings
  DROP COLUMN IF EXISTS sub_headline,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS cta_label,
  DROP COLUMN IF EXISTS cta_url,
  DROP COLUMN IF EXISTS accent_color;

ALTER TABLE public.promo_card_settings
  RENAME COLUMN primary_color TO background_color;

ALTER TABLE public.promo_card_settings
  ADD COLUMN IF NOT EXISTS font_color TEXT NOT NULL DEFAULT '#1f2937',
  ADD COLUMN IF NOT EXISTS font_size INTEGER NOT NULL DEFAULT 28;

UPDATE public.promo_card_settings
SET
  background_color = COALESCE(background_color, '#ffffff'),
  font_color = COALESCE(font_color, '#1f2937'),
  font_size = COALESCE(font_size, 28),
  headline = COALESCE(headline, '셀바, 학교와 교육자원을 연결합니다'),
  image_url = COALESCE(image_url, '/picture/section%20right%20ad2.png'),
  insert_position = COALESCE(insert_position, 2);
