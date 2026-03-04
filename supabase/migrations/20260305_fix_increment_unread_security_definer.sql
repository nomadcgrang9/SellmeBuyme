-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- increment_unread_count 함수에 SECURITY DEFINER 추가
-- 문제: RLS가 상대방의 unread_count UPDATE를 차단
-- 해결: SECURITY DEFINER로 RLS 우회
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receiver_id UUID;
BEGIN
  SELECT user_id INTO receiver_id
  FROM chat_participants
  WHERE room_id = NEW.room_id
  AND user_id != NEW.sender_id;

  IF receiver_id IS NOT NULL THEN
    UPDATE chat_participants
    SET unread_count = unread_count + 1
    WHERE room_id = NEW.room_id
    AND user_id = receiver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
