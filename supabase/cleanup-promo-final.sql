-- ==========================================
-- 프로모 카드 컬렉션 정리 (최종 안전 버전)
-- ==========================================

-- 1단계: unique 제약조건 임시 삭제
ALTER TABLE promo_cards DROP CONSTRAINT IF EXISTS promo_cards_order_unique;

-- 2단계: 컬렉션 통합
DO $$
DECLARE
    main_collection_id UUID;
BEGIN
    -- 메인 컬렉션 선택
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

    -- 모든 카드를 메인 컬렉션으로 이동
    UPDATE promo_cards
    SET collection_id = main_collection_id,
        updated_at = NOW()
    WHERE collection_id != main_collection_id;

    -- order_index 재정렬 (1부터 시작)
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

    -- 빈 컬렉션 삭제
    DELETE FROM promo_card_collections
    WHERE id != main_collection_id;

    RAISE NOTICE '✅ 정리 완료! 메인 컬렉션 ID: %', main_collection_id;
    RAISE NOTICE '✅ 총 카드 개수: %', (SELECT COUNT(*) FROM promo_cards WHERE collection_id = main_collection_id);
END $$;

-- 3단계: unique 제약조건 재생성
ALTER TABLE promo_cards 
ADD CONSTRAINT promo_cards_order_unique UNIQUE (collection_id, order_index);

-- 4단계: 결과 확인
SELECT 
    '✅ 최종 결과' as status,
    COUNT(*) as "총 카드",
    COUNT(DISTINCT collection_id) as "컬렉션 수"
FROM promo_cards;

SELECT 
    pc.order_index as "순서",
    pc.headline as "제목",
    pc.is_active as "활성",
    pcc.name as "컬렉션"
FROM promo_cards pc
JOIN promo_card_collections pcc ON pc.collection_id = pcc.id
ORDER BY pc.order_index ASC;
