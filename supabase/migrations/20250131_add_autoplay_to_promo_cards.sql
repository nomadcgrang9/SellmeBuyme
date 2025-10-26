-- Add auto-play and duration fields to promo_cards table
ALTER TABLE promo_cards
ADD COLUMN IF NOT EXISTS auto_play BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 5000; -- milliseconds (5 seconds)

COMMENT ON COLUMN promo_cards.auto_play IS 'Whether to automatically advance to next card';
COMMENT ON COLUMN promo_cards.duration IS 'Duration in milliseconds before advancing to next card (default: 5000ms = 5s)';
