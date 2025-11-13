-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 채팅 시스템 마이그레이션
-- 생성일: 2025-01-13
-- 설명: 1:1 채팅, 파일 전송 (최대 20MB), Realtime 지원
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. 채팅방 테이블
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,

  -- 참여자 (1:1 채팅, 항상 2명)
  participant_1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 컨텍스트: 어떤 카드에서 시작되었는지
  -- 'talent' 또는 'experience'만 가능 (공고는 채팅 불가)
  context_type TEXT CHECK (context_type IN ('talent', 'experience')),
  context_card_id UUID,

  -- 메타데이터
  is_archived BOOLEAN DEFAULT false,

  -- 참여자 + 컨텍스트 조합은 유일해야 함
  CONSTRAINT unique_room_participants_context
    UNIQUE(participant_1_id, participant_2_id, context_card_id)
);

-- 인덱스: 사용자별 채팅방 조회 최적화
CREATE INDEX idx_chat_rooms_participant_1 ON chat_rooms(participant_1_id);
CREATE INDEX idx_chat_rooms_participant_2 ON chat_rooms(participant_2_id);
CREATE INDEX idx_chat_rooms_last_message ON chat_rooms(last_message_at DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. 메시지 테이블
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- 메시지 내용
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),

  -- 파일 전송 (최대 20MB)
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER, -- bytes
  file_type TEXT, -- MIME type

  -- 읽음 표시
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- 검증: text 타입은 content 필수, file 타입은 file_url 필수
  CONSTRAINT check_message_content CHECK (
    (message_type = 'text' AND content IS NOT NULL) OR
    (message_type = 'system' AND content IS NOT NULL) OR
    (message_type = 'file' AND file_url IS NOT NULL)
  )
);

-- 인덱스: 채팅방별 최신 메시지 조회 최적화
CREATE INDEX idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_unread ON chat_messages(room_id, is_read) WHERE is_read = false;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. 참여자 정보 테이블
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_message_id UUID REFERENCES chat_messages(id),
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,

  -- 한 채팅방에 같은 사용자는 한 번만
  CONSTRAINT unique_participant UNIQUE(room_id, user_id)
);

-- 인덱스: 사용자별 채팅방 목록 조회 최적화
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX idx_chat_participants_room ON chat_participants(room_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Row Level Security (RLS) 정책
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- RLS 활성화
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- chat_rooms: 본인이 참여자인 채팅방만 읽기
CREATE POLICY "Users can read own chat rooms"
ON chat_rooms FOR SELECT
USING (
  auth.uid() = participant_1_id
  OR auth.uid() = participant_2_id
);

-- chat_rooms: 본인이 참여자로 포함된 채팅방만 생성
CREATE POLICY "Users can create chat rooms where they are participant"
ON chat_rooms FOR INSERT
WITH CHECK (
  auth.uid() IN (participant_1_id, participant_2_id)
);

-- chat_rooms: 본인이 참여자인 채팅방만 업데이트
CREATE POLICY "Users can update own chat rooms"
ON chat_rooms FOR UPDATE
USING (
  auth.uid() = participant_1_id
  OR auth.uid() = participant_2_id
);

-- chat_messages: 본인이 속한 채팅방의 메시지만 읽기
CREATE POLICY "Users can read messages in their rooms"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id = chat_messages.room_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- chat_messages: 본인이 sender인 메시지만 생성
CREATE POLICY "Users can send messages in their rooms"
ON chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id = room_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- chat_messages: 본인이 속한 채팅방의 메시지만 업데이트 (읽음 표시)
CREATE POLICY "Users can update messages in their rooms"
ON chat_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id = chat_messages.room_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- chat_participants: 본인 참여 정보만 읽기
CREATE POLICY "Users can read own participant info"
ON chat_participants FOR SELECT
USING (user_id = auth.uid());

-- chat_participants: 본인 참여 정보만 생성
CREATE POLICY "Users can create own participant info"
ON chat_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

-- chat_participants: 본인 참여 정보만 업데이트
CREATE POLICY "Users can update own participant info"
ON chat_participants FOR UPDATE
USING (user_id = auth.uid());

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. 트리거 함수
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 새 메시지 INSERT 시 채팅방의 last_message_at 업데이트
CREATE OR REPLACE FUNCTION update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_rooms
  SET
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_room_last_message();

-- 새 메시지 INSERT 시 상대방의 unread_count 증가
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
DECLARE
  receiver_id UUID;
BEGIN
  -- 발신자가 아닌 참여자(수신자) ID 찾기
  SELECT user_id INTO receiver_id
  FROM chat_participants
  WHERE room_id = NEW.room_id
  AND user_id != NEW.sender_id;

  -- 수신자의 unread_count 증가
  IF receiver_id IS NOT NULL THEN
    UPDATE chat_participants
    SET unread_count = unread_count + 1
    WHERE room_id = NEW.room_id
    AND user_id = receiver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_unread
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION increment_unread_count();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Realtime 활성화
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- chat_messages 테이블의 INSERT 이벤트를 Realtime으로 브로드캐스트
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. 유틸리티 함수
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 사용자 ID로 채팅방 찾기 또는 생성
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

  -- 기존 채팅방 찾기
  SELECT id INTO room_id
  FROM chat_rooms
  WHERE participant_1_id = smaller_id
  AND participant_2_id = larger_id
  AND (ctx_card_id IS NULL OR context_card_id = ctx_card_id);

  -- 없으면 생성
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

-- 채팅방의 읽지 않은 메시지를 모두 읽음 처리
CREATE OR REPLACE FUNCTION mark_room_as_read(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- 메시지를 읽음 처리
  UPDATE chat_messages
  SET is_read = true, read_at = NOW()
  WHERE room_id = p_room_id
  AND sender_id != p_user_id
  AND is_read = false;

  -- unread_count 초기화
  UPDATE chat_participants
  SET
    unread_count = 0,
    last_read_at = NOW()
  WHERE room_id = p_room_id
  AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 마이그레이션 완료
COMMENT ON TABLE chat_rooms IS '채팅방: 1:1 채팅만 지원, 인력/체험 카드에서 시작';
COMMENT ON TABLE chat_messages IS '채팅 메시지: 텍스트 + 파일 전송 (최대 20MB)';
COMMENT ON TABLE chat_participants IS '채팅 참여자 정보: 읽음 상태, 알림 카운트';
