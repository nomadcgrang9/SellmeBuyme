-- Fix: 중복 채팅방 생성 방지
-- 문제: get_or_create_chat_room 함수가 context_card_id 조건 때문에 같은 사용자 간에 여러 채팅방 생성
-- 해결: 같은 두 사용자 간에는 항상 하나의 채팅방만 유지

CREATE OR REPLACE FUNCTION get_or_create_chat_room(
  user1_id UUID,
  user2_id UUID,
  ctx_type TEXT DEFAULT NULL,
  ctx_card_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- participant_1_id가 항상 작은 UUID가 되도록 정렬
  IF user1_id < user2_id THEN
    smaller_id := user1_id;
    larger_id := user2_id;
  ELSE
    smaller_id := user2_id;
    larger_id := user1_id;
  END IF;

  -- ✅ 같은 두 사용자 간에는 항상 하나의 채팅방만 반환
  -- context_card_id와 관계없이 기존 채팅방 재사용
  SELECT id INTO room_id
  FROM chat_rooms
  WHERE participant_1_id = smaller_id
    AND participant_2_id = larger_id
  LIMIT 1;  -- 여러 개 있을 경우 첫 번째 채팅방 사용

  -- 없으면 새로 생성
  IF room_id IS NULL THEN
    INSERT INTO chat_rooms (
      participant_1_id,
      participant_2_id,
      context_type,
      context_card_id
    ) VALUES (
      smaller_id,
      larger_id,
      ctx_type,
      ctx_card_id
    ) RETURNING id INTO room_id;

    -- 참여자 정보 생성
    INSERT INTO chat_participants (room_id, user_id) VALUES (room_id, smaller_id);
    INSERT INTO chat_participants (room_id, user_id) VALUES (room_id, larger_id);
  END IF;

  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_chat_room IS '같은 두 사용자 간에는 항상 하나의 채팅방만 유지 (context_card_id 무시)';
