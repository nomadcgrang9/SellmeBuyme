-- Create promo card collections and cards tables for stacked promo cards
CREATE TABLE IF NOT EXISTS promo_card_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES promo_card_collections(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    insert_position INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    headline TEXT NOT NULL,
    image_url TEXT,
    background_color TEXT NOT NULL DEFAULT '#ffffff',
    background_color_mode TEXT,
    background_gradient_start TEXT,
    background_gradient_end TEXT,
    font_color TEXT NOT NULL DEFAULT '#1f2937',
    font_size INTEGER NOT NULL DEFAULT 24,
    badge_color TEXT NOT NULL DEFAULT '#dbeafe',
    badge_color_mode TEXT,
    badge_gradient_start TEXT,
    badge_gradient_end TEXT,
    image_scale NUMERIC,
    last_draft_at TIMESTAMPTZ,
    last_applied_at TIMESTAMPTZ,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT promo_cards_order_unique UNIQUE (collection_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_promo_cards_collection ON promo_cards(collection_id);

-- Migrate existing promo_card_settings data if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'promo_card_settings'
    ) THEN
        INSERT INTO promo_card_collections (id, name, is_active, created_at, updated_at)
        SELECT
            id,
            COALESCE(NULLIF(TRIM(headline), ''), '기본 프로모 카드'),
            is_active,
            created_at,
            updated_at
        FROM promo_card_settings
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();

        INSERT INTO promo_cards (
            collection_id,
            order_index,
            insert_position,
            is_active,
            headline,
            image_url,
            background_color,
            background_color_mode,
            background_gradient_start,
            background_gradient_end,
            font_color,
            font_size,
            badge_color,
            badge_color_mode,
            badge_gradient_start,
            badge_gradient_end,
            image_scale,
            last_draft_at,
            last_applied_at,
            updated_by,
            created_at,
            updated_at
        )
        SELECT
            id,
            1,
            insert_position,
            is_active,
            headline,
            image_url,
            COALESCE(background_color, '#ffffff'),
            background_color_mode,
            background_gradient_start,
            background_gradient_end,
            COALESCE(font_color, '#1f2937'),
            COALESCE(font_size, 24),
            COALESCE(badge_color, '#dbeafe'),
            badge_color_mode,
            badge_gradient_start,
            badge_gradient_end,
            COALESCE(image_scale, 1),
            last_draft_at,
            last_applied_at,
            updated_by,
            created_at,
            updated_at
        FROM promo_card_settings;

        DROP TABLE promo_card_settings;
    END IF;
END $$;
