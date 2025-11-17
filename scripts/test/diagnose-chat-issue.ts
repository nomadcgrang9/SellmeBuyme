import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseChatIssue() {
  console.log('🔍 채팅 문제 진단 시작...\n');
  console.log('━'.repeat(60));

  // 1. 최근 생성된 채팅방 확인
  console.log('\n📍 Step 1: 최근 채팅방 확인');
  const { data: rooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (roomsError) {
    console.error('❌ 채팅방 조회 실패:', roomsError);
  } else {
    console.log(`✅ 채팅방 ${rooms?.length || 0}개 발견:`);
    rooms?.forEach((room, i) => {
      console.log(`\n   [${i + 1}] Room ID: ${room.id.substring(0, 8)}...`);
      console.log(`       참여자 1: ${room.participant_1_id.substring(0, 8)}...`);
      console.log(`       참여자 2: ${room.participant_2_id.substring(0, 8)}...`);
      console.log(`       생성일: ${room.created_at}`);
      console.log(`       마지막 메시지: ${room.last_message_at || '없음'}`);
    });
  }

  // 2. 최근 메시지 확인 (모든 채팅방)
  console.log('\n\n📍 Step 2: 최근 메시지 확인');
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (messagesError) {
    console.error('❌ 메시지 조회 실패:', messagesError);
  } else {
    console.log(`✅ 메시지 ${messages?.length || 0}개 발견:`);
    messages?.forEach((msg, i) => {
      console.log(`\n   [${i + 1}] Message ID: ${msg.id.substring(0, 8)}...`);
      console.log(`       Room ID: ${msg.room_id.substring(0, 8)}...`);
      console.log(`       발신자: ${msg.sender_id.substring(0, 8)}...`);
      console.log(`       내용: ${msg.content || '(파일 메시지)'}`);
      console.log(`       타입: ${msg.message_type}`);
      console.log(`       생성일: ${msg.created_at}`);
    });
  }

  // 3. 특정 채팅방의 메시지 확인 (가장 최근 채팅방)
  if (rooms && rooms.length > 0) {
    const targetRoom = rooms[0];
    console.log(`\n\n📍 Step 3: 특정 채팅방(${targetRoom.id.substring(0, 8)}...) 메시지 상세 확인`);

    const { data: roomMessages, error: roomMessagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', targetRoom.id)
      .order('created_at', { ascending: true });

    if (roomMessagesError) {
      console.error('❌ 채팅방 메시지 조회 실패:', roomMessagesError);
    } else {
      console.log(`✅ 채팅방 메시지 ${roomMessages?.length || 0}개:`);
      roomMessages?.forEach((msg, i) => {
        console.log(`\n   [${i + 1}] ${msg.sender_id.substring(0, 8)}...: ${msg.content || '(파일)'}`);
        console.log(`       시간: ${new Date(msg.created_at).toLocaleString('ko-KR')}`);
      });
    }
  }

  // 4. chat_participants 확인 (읽지 않은 메시지 수)
  console.log('\n\n📍 Step 4: chat_participants 확인');
  const { data: participants, error: participantsError } = await supabase
    .from('chat_participants')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (participantsError) {
    console.error('❌ participants 조회 실패:', participantsError);
  } else {
    console.log(`✅ 참여자 ${participants?.length || 0}명 발견:`);
    participants?.forEach((p, i) => {
      console.log(`\n   [${i + 1}] User: ${p.user_id.substring(0, 8)}...`);
      console.log(`       Room: ${p.room_id.substring(0, 8)}...`);
      console.log(`       읽지 않음: ${p.unread_count}`);
      console.log(`       마지막 읽음: ${p.last_read_at || '없음'}`);
    });
  }

  // 5. RLS 정책 확인을 위한 특정 유저 시뮬레이션
  console.log('\n\n📍 Step 5: 특정 유저의 메시지 접근 가능 여부 확인');

  if (rooms && rooms.length > 0) {
    const targetRoom = rooms[0];
    const user1Id = targetRoom.participant_1_id;
    const user2Id = targetRoom.participant_2_id;

    console.log(`\n   채팅방 ID: ${targetRoom.id.substring(0, 8)}...`);
    console.log(`   참여자 1: ${user1Id.substring(0, 8)}...`);
    console.log(`   참여자 2: ${user2Id.substring(0, 8)}...`);

    // 익명으로 메시지 조회 시도 (RLS 확인)
    const { data: anonMessages, error: anonError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', targetRoom.id);

    if (anonError) {
      console.log('\n   ❌ 익명 사용자: 접근 불가 (RLS 정상 작동)');
      console.log(`      에러: ${anonError.message}`);
    } else {
      console.log(`\n   ⚠️  익명 사용자: ${anonMessages?.length || 0}개 메시지 조회 가능 (RLS 문제 가능성)`);
    }
  }

  console.log('\n\n' + '━'.repeat(60));
  console.log('📊 진단 요약\n');
  console.log(`채팅방 개수: ${rooms?.length || 0}`);
  console.log(`전체 메시지 개수: ${messages?.length || 0}`);
  console.log(`참여자 레코드: ${participants?.length || 0}`);

  if (messages && messages.length > 0) {
    const latestMessage = messages[0];
    console.log(`\n최근 메시지:`);
    console.log(`  - 내용: "${latestMessage.content || '(파일)'}"`);
    console.log(`  - 시간: ${new Date(latestMessage.created_at).toLocaleString('ko-KR')}`);
  }

  console.log('\n✅ 진단 완료!');
}

diagnoseChatIssue().catch(console.error);
