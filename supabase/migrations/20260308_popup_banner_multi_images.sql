-- ============================================================
-- 접속배너 멀티 이미지 캐러셀 지원
-- image_url (단일) → image_urls (배열) 변환
-- rotation_speed 설정 추가
-- ============================================================

-- 1. popup_banners: image_urls 배열 컬럼 추가
ALTER TABLE public.popup_banners
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- 2. 기존 image_url 데이터를 image_urls 배열로 이관
UPDATE public.popup_banners
  SET image_urls = ARRAY[image_url]
  WHERE image_url IS NOT NULL AND image_url != '';

-- 3. 기존 image_url 컬럼 제거
ALTER TABLE public.popup_banners
  DROP COLUMN IF EXISTS image_url;

-- 4. popup_banner_config: 회전 속도 설정 추가 (기본 3초)
ALTER TABLE public.popup_banner_config
  ADD COLUMN IF NOT EXISTS rotation_speed INTEGER DEFAULT 3;
