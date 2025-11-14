-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- chat_participants RLS 정책 수정
-- 생성일: 2025-01-14
-- 문제: INSERT 정책이 SECURITY DEFINER 함수에서 상대방 레코드 생성 차단
-- 해결: INSERT 정책 삭제, SECURITY DEFINER 함수에서만 생성 가능하도록
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Users can create own participant info" ON chat_participants;

-- 새로운 INSERT 정책: SECURITY DEFINER 함수에서만 생성 가능
-- 일반 사용자는 직접 chat_participants를 생성할 수 없음
-- 오직 get_or_create_chat_room 함수를 통해서만 생성됨
CREATE POLICY "Only functions can create participant info"
ON chat_participants FOR INSERT
WITH CHECK (false);  -- 일반 사용자는 INSERT 불가

-- SECURITY DEFINER 함수는 RLS를 우회하므로 정상 작동
COMMENT ON POLICY "Only functions can create participant info" ON chat_participants IS
  'Prevents direct INSERT by users. Only SECURITY DEFINER functions (like get_or_create_chat_room) can create participants.';
