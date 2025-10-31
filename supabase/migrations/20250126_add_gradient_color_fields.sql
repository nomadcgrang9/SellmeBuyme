-- Add gradient color support for promo cards and stripe banners

ALTER TABLE public.promo_card_settings
  ADD COLUMN IF NOT EXISTS background_color_mode TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS background_gradient_start TEXT,
  ADD COLUMN IF NOT EXISTS background_gradient_end TEXT,
  ADD COLUMN IF NOT EXISTS badge_color_mode TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS badge_gradient_start TEXT,
  ADD COLUMN IF NOT EXISTS badge_gradient_end TEXT;
ALTER TABLE public.stripe_banners
  ADD COLUMN IF NOT EXISTS bg_color_mode TEXT NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS bg_gradient_start TEXT,
  ADD COLUMN IF NOT EXISTS bg_gradient_end TEXT;
