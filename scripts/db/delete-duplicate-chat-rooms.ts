import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function deleteDuplicateRooms() {
  console.log('🗑️  중복 채팅방 삭제 작업 시작...\n');
  console.log('='.repeat(60));

  // Step 1: 중복 채팅방 찾기
  console.log('\n📍 Step 1: 중복 채팅방 확인');

  const { data: rooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('participant_1_id, participant_2_id, id, created_at')
    .order('created_at', { ascending: true });

  if (roomsError) {
    console.error('❌ 채팅방 조회 실패:', roomsError);
    return;
  }

  // participant_1_id, participant_2_id 조합별로 그룹화
  const roomsByPair = new Map<string, any[]>();
  rooms.forEach(room => {
    const key = `${room.participant_1_id}|${room.participant_2_id}`;
    if (!roomsByPair.has(key)) {
      roomsByPair.set(key, []);
    }
    roomsByPair.get(key)!.push(room);
  });

  console.log(`✅ 총 ${rooms.length}개 채팅방 발견`);
  console.log(`✅ ${roomsByPair.size}쌍의 사용자 조합`);

  // 중복된 채팅방 찾기
  const toDelete: string[] = [];
  roomsByPair.forEach((roomList, pairKey) => {
    if (roomList.length > 1) {
      console.log(`\n⚠️  중복 발견: ${pairKey}`);
      console.log(`   - 채팅방 ${roomList.length}개 존재`);

      // 첫 번째(가장 오래된) 채팅방은 유지
      const [keep, ...remove] = roomList;
      console.log(`   ✅ 유지: ${keep.id.substring(0, 8)}... (생성: ${keep.created_at})`);

      remove.forEach((r, i) => {
        console.log(`   ❌ 삭제: ${r.id.substring(0, 8)}... (생성: ${r.created_at})`);
        toDelete.push(r.id);
      });
    }
  });

  if (toDelete.length === 0) {
    console.log('\n✅ 중복 채팅방 없음 - 삭제 작업 불필요');
    return;
  }

  console.log(`\n⚠️  ${toDelete.length}개 채팅방 삭제 예정`);

  // Step 2: SQL 생성
  console.log('\n📍 Step 2: 삭제 SQL 생성');

  const deleteSQL = `
-- 중복 채팅방 삭제 (가장 오래된 채팅방만 유지)

-- 1. 삭제할 채팅방의 메시지 먼저 삭제
DELETE FROM chat_messages
WHERE room_id IN (
${toDelete.map(id => `  '${id}'`).join(',\n')}
);

-- 2. 삭제할 채팅방의 참여자 정보 삭제
DELETE FROM chat_participants
WHERE room_id IN (
${toDelete.map(id => `  '${id}'`).join(',\n')}
);

-- 3. 중복 채팅방 삭제
DELETE FROM chat_rooms
WHERE id IN (
${toDelete.map(id => `  '${id}'`).join(',\n')}
);
  `;

  console.log('\n✅ 다음 SQL을 Supabase SQL Editor에서 실행하세요:');
  console.log('\n' + '='.repeat(60));
  console.log(deleteSQL);
  console.log('='.repeat(60) + '\n');

  // Step 3: 함수 수정 SQL도 함께 출력
  console.log('\n📍 Step 3: 함수 수정 SQL (중복 방지)');

  const fixFunctionSQL = `
-- 중복 채팅방 생성 방지 (같은 사용자 쌍은 항상 하나의 채팅방만 사용)
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
  IF user1_id < user2_id THEN
    smaller_id := user1_id;
    larger_id := user2_id;
  ELSE
    smaller_id := user2_id;
    larger_id := user1_id;
  END IF;

  SELECT id INTO room_id
  FROM chat_rooms
  WHERE participant_1_id = smaller_id
    AND participant_2_id = larger_id
  ORDER BY created_at ASC
  LIMIT 1;

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

    INSERT INTO chat_participants (room_id, user_id) VALUES (room_id, smaller_id);
    INSERT INTO chat_participants (room_id, user_id) VALUES (room_id, larger_id);
  END IF;

  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  console.log('\n✅ 함수 수정 SQL도 함께 실행하세요:');
  console.log('\n' + '='.repeat(60));
  console.log(fixFunctionSQL);
  console.log('='.repeat(60) + '\n');

  console.log('\n='.repeat(60));
  console.log('\n✅ SQL 생성 완료!');
  console.log('\n실행 순서:');
  console.log('1. 위의 "중복 채팅방 삭제" SQL 실행');
  console.log('2. "함수 수정" SQL 실행');
  console.log('3. 브라우저 강제 새로고침 (Ctrl+Shift+R)');
  console.log('4. 채팅 목록 확인 → 1개만 보여야 함');
}

deleteDuplicateRooms().catch(console.error);
