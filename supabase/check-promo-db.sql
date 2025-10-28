-- =================================================
-- 프로모 카드 DB 전체 상태 확인 쿼리
-- =================================================

-- 1. 모든 프로모 카드 조회
SELECT 
    pc.id,
    pc.collection_id,
    pc.order_index,
    pc.is_active,
    pc.headline,
    pc.created_at,
    pcc.name as collection_name
FROM promo_cards pc
LEFT JOIN promo_card_collections pcc ON pc.collection_id = pcc.id
ORDER BY pc.order_index ASC;

-- 2. 컬렉션별 카드 개수
SELECT 
    pcc.id,
    pcc.name,
    pcc.is_active,
    COUNT(pc.id) as card_count
FROM promo_card_collections pcc
LEFT JOIN promo_cards pc ON pcc.id = pc.collection_id
GROUP BY pcc.id, pcc.name, pcc.is_active;

-- 3. RLS 정책 확인
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('promo_cards', 'promo_card_collections');

-- 4. 테이블 컬럼 확인 (auto_play, duration 있는지)
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'promo_cards' 
ORDER BY ordinal_position;
