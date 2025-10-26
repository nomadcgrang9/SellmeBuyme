-- Ensure there is at least one active promo card collection and card for the homepage carousel
DO $$
DECLARE
    target_collection_id UUID;
BEGIN
    -- Try to find an already active collection first
    SELECT id
    INTO target_collection_id
    FROM promo_card_collections
    WHERE is_active = TRUE
    ORDER BY updated_at DESC
    LIMIT 1;

    -- If none is active, promote the most recently updated one
    IF target_collection_id IS NULL THEN
        SELECT id
        INTO target_collection_id
        FROM promo_card_collections
        ORDER BY updated_at DESC
        LIMIT 1;

        IF target_collection_id IS NOT NULL THEN
            UPDATE promo_card_collections
            SET is_active = TRUE,
                updated_at = NOW()
            WHERE id = target_collection_id;
        END IF;
    END IF;

    -- Still nothing? create a fresh default collection
    IF target_collection_id IS NULL THEN
        INSERT INTO promo_card_collections (name, is_active)
        VALUES ('기본 프로모 카드', TRUE)
        RETURNING id INTO target_collection_id;
    END IF;

    -- Make sure the selected collection has at least one card
    IF NOT EXISTS (
        SELECT 1
        FROM promo_cards
        WHERE collection_id = target_collection_id
    ) THEN
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
            created_at,
            updated_at
        )
        VALUES (
            target_collection_id,
            1,
            2,
            TRUE,
            '셀바, 학교와 교육자원을 연결합니다',
            '/picture/section%20right%20ad2.png',
            '#ffffff',
            'gradient',
            '#6366f1',
            '#22d3ee',
            '#1f2937',
            28,
            '#dbeafe',
            'gradient',
            '#f97316',
            '#facc15',
            1,
            NOW(),
            NOW(),
            NOW(),
            NOW()
        );
    ELSE
        UPDATE promo_cards
        SET is_active = TRUE,
            updated_at = NOW()
        WHERE collection_id = target_collection_id;
    END IF;
END $$;
