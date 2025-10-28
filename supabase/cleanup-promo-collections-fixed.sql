-- ==========================================
-- 프로모 카드 컬렉션 정리 스크립트 (수정판)
-- ==========================================

DO $$
DECLARE
    main_collection_id UUID;
BEGIN
    -- 1. 메인 컬렉션 선택 (가장 많은 카드를 가진 컬렉션)
    SELECT pcc.id INTO main_collection_id
    FROM promo_card_collections pcc
    LEFT JOIN promo_cards pc ON pcc.id = pc.collection_id
    GROUP BY pcc.id
    ORDER BY COUNT(pc.id) DESC, pcc.updated_at DESC
    LIMIT 1;

    -- 메인 컬렉션이 없으면 새로 생성
    IF main_collection_id IS NULL THEN
        INSERT INTO promo_card_collections (name, is_active)
        VALUES ('메인 프로모 카드', TRUE)
        RETURNING id INTO main_collection_id;
    ELSE
        -- 기존 메인 컬렉션 활성화 및 이름 변경
        UPDATE promo_card_collections
        SET is_active = TRUE,
            name = '메인 프로모 카드',
            updated_at = NOW()
        WHERE id = main_collection_id;
    END IF;

    -- 2. 임시로 unique 제약조건 비활성화 (DEFERRED)
    -- 대신 CTE를 사용하여 한 번에 업데이트
    WITH ordered_cards AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
        FROM promo_cards
    )
    UPDATE promo_cards
    SET 
        collection_id = main_collection_id,
        order_index = ordered_cards.new_order,
        updated_at = NOW()
    FROM ordered_cards
    WHERE promo_cards.id = ordered_cards.id;

    -- 3. 빈 컬렉션 삭제 (메인 컬렉션 제외)
    DELETE FROM promo_card_collections
    WHERE id != main_collection_id;

    RAISE NOTICE '정리 완료! 메인 컬렉션 ID: %', main_collection_id;
    RAISE NOTICE '총 카드 개수: %', (SELECT COUNT(*) FROM promo_cards WHERE collection_id = main_collection_id);
END $$;

-- 결과 확인
SELECT 
    pc.id,
    pc.order_index,
    pc.headline,
    pc.is_active,
    pcc.name as collection_name
FROM promo_cards pc
JOIN promo_card_collections pcc ON pc.collection_id = pcc.id
ORDER BY pc.order_index ASC;
