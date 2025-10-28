-- promo_cards 테이블의 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('promo_cards', 'promo_card_collections')
ORDER BY tablename, policyname;
