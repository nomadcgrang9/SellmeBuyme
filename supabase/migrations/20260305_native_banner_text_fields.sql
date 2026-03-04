-- 카드배너에 텍스트 필드 추가 (이미지+캡션, 텍스트 전용 모드 지원)
ALTER TABLE native_banners
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS bg_color TEXT,
  ADD COLUMN IF NOT EXISTS text_color TEXT;

-- image_url을 필수가 아닌 선택으로 변경 (텍스트 전용 배너 지원)
ALTER TABLE native_banners
  ALTER COLUMN image_url SET DEFAULT '';
