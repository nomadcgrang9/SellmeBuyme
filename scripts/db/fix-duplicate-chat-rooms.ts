import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fixDuplicateChatRooms() {
  console.log('🔧 중복 채팅방 수정 작업 시작...\n');
  console.log('='.repeat(60));

  // Step 1: 현재 중복 채팅방 확인
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
  const duplicates: any[] = [];
  roomsByPair.forEach((roomList, pairKey) => {
    if (roomList.length > 1) {
      console.log(`\n⚠️  중복 발견: ${pairKey}`);
      console.log(`   - 채팅방 ${roomList.length}개 존재`);
      roomList.forEach((r, i) => {
        console.log(`   [${i + 1}] ${r.id.substring(0, 8)}... (생성일: ${r.created_at})`);
      });
      duplicates.push({ pairKey, rooms: roomList });
    }
  });

  if (duplicates.length === 0) {
    console.log('\n✅ 중복 채팅방 없음');
  } else {
    console.log(`\n⚠️  ${duplicates.length}쌍에서 중복 발견`);
  }

  // Step 2: get_or_create_chat_room 함수 수정
  console.log('\n📍 Step 2: get_or_create_chat_room 함수 수정');

  const fixSQL = `
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
  ORDER BY created_at ASC
  LIMIT 1;  -- 가장 오래된 채팅방 사용

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

COMMENT ON FUNCTION get_or_create_chat_room IS '같은 두 사용자 간에는 항상 하나의 채팅방만 유지 (가장 오래된 채팅방 재사용)';
  `;

  // 함수 수정 SQL 출력 (수동 실행 필요)
  console.log('\n✅ 다음 SQL을 Supabase SQL Editor에서 실행하세요:');
  console.log('\n' + '='.repeat(60));
  console.log(fixSQL);
  console.log('='.repeat(60) + '\n');

  // Step 3: 중복 채팅방 병합 (선택사항)
  if (duplicates.length > 0) {
    console.log('\n📍 Step 3: 중복 채팅방 병합 (수동 확인 필요)');
    console.log('\n⚠️  다음 작업을 수동으로 수행하세요:');
    console.log('1. Supabase Dashboard → chat_rooms 테이블');
    console.log('2. 각 사용자 쌍에서 가장 오래된 채팅방만 남기고 나머지 삭제');
    console.log('3. 또는 메시지를 병합 후 삭제');
    console.log('\n중복 채팅방 목록:');
    duplicates.forEach(({ pairKey, rooms }) => {
      console.log(`\n- ${pairKey}:`);
      console.log(`  유지할 방: ${rooms[0].id} (가장 오래됨)`);
      console.log(`  삭제 후보: ${rooms.slice(1).map((r: any) => r.id.substring(0, 8) + '...').join(', ')}`);
    });
  }

  console.log('\n='.repeat(60));
  console.log('\n✅ 수정 작업 완료!');
  console.log('\n다음 단계:');
  console.log('1. 위의 SQL을 Supabase Dashboard에서 실행');
  console.log('2. 브라우저 새로고침 (Ctrl+Shift+R)');
  console.log('3. 채팅 기능 테스트');
}

fixDuplicateChatRooms().catch(console.error);
