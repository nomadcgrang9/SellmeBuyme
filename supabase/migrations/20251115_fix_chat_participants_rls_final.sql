-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- chat_participants RLS 정책 재수정
-- 생성일: 2025-01-14 (v2)
-- 문제: WITH CHECK (false)가 SECURITY DEFINER 함수도 차단함
-- 해결: INSERT 정책 완전 삭제 → SECURITY DEFINER 함수만 INSERT 가능
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Only functions can create participant info" ON chat_participants;
DROP POLICY IF EXISTS "Users can create own participant info" ON chat_participants;

-- INSERT 정책을 만들지 않음!
-- RLS가 활성화되어 있지만 INSERT 정책이 없으면:
-- - 일반 사용자: INSERT 불가 (정책 없음 = 거부)
-- - SECURITY DEFINER 함수: INSERT 가능 (RLS 우회)

COMMENT ON TABLE chat_participants IS
  'RLS enabled but no INSERT policy. Only SECURITY DEFINER functions (get_or_create_chat_room) can insert.';
