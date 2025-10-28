-- ==========================================
-- 프로모 카드 컬렉션 정리 스크립트 (안전 버전)
-- ==========================================

DO $$
DECLARE
    main_collection_id UUID;
BEGIN
    -- 1. 메인 컬렉션 선택
    SELECT pcc.id INTO main_collection_id
    FROM promo_card_collections pcc
    LEFT JOIN promo_cards pc ON pcc.id = pc.collection_id
    GROUP BY pcc.id
    ORDER BY COUNT(pc.id) DESC, pcc.updated_at DESC
    LIMIT 1;

    IF main_collection_id IS NULL THEN
        INSERT INTO promo_card_collections (name, is_active)
        VALUES ('메인 프로모 카드', TRUE)
        RETURNING id INTO main_collection_id;
    ELSE
        UPDATE promo_card_collections
        SET is_active = TRUE,
            name = '메인 프로모 카드',
            updated_at = NOW()
        WHERE id = main_collection_id;
    END IF;

    -- 2단계 업데이트로 unique 제약조건 충돌 방지
    
    -- 2-1. 먼저 order_index를 임시 큰 값으로 변경 (충돌 방지)
    UPDATE promo_cards
    SET order_index = order_index + 1000
    WHERE collection_id != main_collection_id;

    -- 2-2. collection_id를 메인으로 변경
    UPDATE promo_cards
    SET collection_id = main_collection_id,
        updated_at = NOW()
    WHERE collection_id != main_collection_id;

    -- 2-3. 모든 카드의 order_index를 올바르게 재정렬
    WITH ordered_cards AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
        FROM promo_cards
        WHERE collection_id = main_collection_id
    )
    UPDATE promo_cards
    SET order_index = ordered_cards.new_order
    FROM ordered_cards
    WHERE promo_cards.id = ordered_cards.id;

    -- 3. 빈 컬렉션 삭제
    DELETE FROM promo_card_collections
    WHERE id != main_collection_id;

    RAISE NOTICE '✅ 정리 완료! 메인 컬렉션 ID: %', main_collection_id;
    RAISE NOTICE '✅ 총 카드 개수: %', (SELECT COUNT(*) FROM promo_cards WHERE collection_id = main_collection_id);
END $$;

-- 결과 확인
SELECT 
    '✅ 정리 결과' as status,
    COUNT(*) as total_cards,
    COUNT(DISTINCT collection_id) as total_collections
FROM promo_cards;

SELECT 
    pc.order_index as "순서",
    pc.headline as "제목",
    pc.is_active as "활성",
    pcc.name as "컬렉션"
FROM promo_cards pc
JOIN promo_card_collections pcc ON pc.collection_id = pcc.id
ORDER BY pc.order_index ASC;
