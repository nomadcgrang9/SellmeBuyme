-- ==========================================
-- 프로모 카드 컬렉션 정리 스크립트
-- ==========================================
-- 문제: 매번 새 컬렉션이 생성되어 카드들이 흩어져 있음
-- 해결: 하나의 메인 컬렉션으로 모든 카드 통합

DO $$
DECLARE
    main_collection_id UUID;
    current_order INT := 1;
BEGIN
    -- 1. 메인 컬렉션 선택 (가장 많은 카드를 가진 컬렉션)
    SELECT 
        pcc.id INTO main_collection_id
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

    -- 2. 모든 카드를 메인 컬렉션으로 이동 및 order_index 재정렬
    UPDATE promo_cards
    SET 
        collection_id = main_collection_id,
        order_index = (
            SELECT ROW_NUMBER() OVER (ORDER BY created_at ASC)
            FROM promo_cards pc2
            WHERE pc2.id = promo_cards.id
        ),
        updated_at = NOW()
    WHERE collection_id != main_collection_id;

    -- 3. 빈 컬렉션 삭제 (메인 컬렉션 제외)
    DELETE FROM promo_card_collections
    WHERE id != main_collection_id;

    -- 4. 다른 컬렉션 비활성화 (혹시 남아있다면)
    UPDATE promo_card_collections
    SET is_active = FALSE
    WHERE id != main_collection_id;

    RAISE NOTICE '정리 완료! 메인 컬렉션 ID: %', main_collection_id;
    RAISE NOTICE '총 카드 개수: %', (SELECT COUNT(*) FROM promo_cards WHERE collection_id = main_collection_id);
END $$;

-- 5. 결과 확인
SELECT 
    pcc.id as collection_id,
    pcc.name,
    pcc.is_active,
    COUNT(pc.id) as card_count
FROM promo_card_collections pcc
LEFT JOIN promo_cards pc ON pcc.id = pc.collection_id
GROUP BY pcc.id, pcc.name, pcc.is_active
ORDER BY card_count DESC;

-- 6. 모든 카드 확인 (order_index 순서대로)
SELECT 
    pc.id,
    pc.order_index,
    pc.headline,
    pc.is_active,
    pcc.name as collection_name
FROM promo_cards pc
JOIN promo_card_collections pcc ON pc.collection_id = pcc.id
ORDER BY pc.order_index ASC;
