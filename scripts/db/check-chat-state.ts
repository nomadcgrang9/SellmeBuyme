import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkChatState() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 채팅 시스템 상태 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 채팅방 확인
  const { data: rooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('📌 최근 채팅방 (최대 5개):');
  if (roomsError) {
    console.log('   ❌ 에러:', roomsError.message);
  } else if (!rooms || rooms.length === 0) {
    console.log('   ⚠️  채팅방이 없습니다');
  } else {
    rooms.forEach((room, idx) => {
      console.log(`\n   [${idx + 1}] Room ID: ${room.id}`);
      console.log(`       생성일: ${new Date(room.created_at).toLocaleString()}`);
      console.log(`       참여자1: ${room.participant_1_id}`);
      console.log(`       참여자2: ${room.participant_2_id}`);
      console.log(`       컨텍스트: ${room.context_type || 'null'} / ${room.context_card_id || 'null'}`);
    });
  }

  // 2. 채팅 참여자 확인
  console.log('\n\n📌 채팅 참여자 정보:');
  const { data: participants, error: participantsError } = await supabase
    .from('chat_participants')
    .select('*')
    .order('joined_at', { ascending: false })
    .limit(10);

  if (participantsError) {
    console.log('   ❌ 에러:', participantsError.message);
  } else if (!participants || participants.length === 0) {
    console.log('   ⚠️  참여자 정보가 없습니다');
  } else {
    participants.forEach((p, idx) => {
      console.log(`\n   [${idx + 1}] Room: ${p.room_id}`);
      console.log(`       User: ${p.user_id}`);
      console.log(`       읽지 않음: ${p.unread_count}`);
      console.log(`       가입일: ${new Date(p.joined_at).toLocaleString()}`);
    });
  }

  // 3. 최근 메시지 확인
  console.log('\n\n📌 최근 메시지 (최대 10개):');
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (messagesError) {
    console.log('   ❌ 에러:', messagesError.message);
  } else if (!messages || messages.length === 0) {
    console.log('   ⚠️  메시지가 없습니다');
  } else {
    messages.forEach((msg, idx) => {
      console.log(`\n   [${idx + 1}] ${new Date(msg.created_at).toLocaleString()}`);
      console.log(`       Room: ${msg.room_id}`);
      console.log(`       Sender: ${msg.sender_id}`);
      console.log(`       Type: ${msg.message_type}`);
      console.log(`       Content: ${msg.content || '(파일)'}`);
      console.log(`       읽음: ${msg.is_read}`);
    });
  }

  // 4. 사용자 프로필 확인
  console.log('\n\n📌 테스트 사용자 프로필:');
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, phone')
    .limit(5);

  if (profilesError) {
    console.log('   ❌ 에러:', profilesError.message);
  } else if (!profiles || profiles.length === 0) {
    console.log('   ⚠️  사용자 프로필이 없습니다');
  } else {
    profiles.forEach((profile, idx) => {
      console.log(`\n   [${idx + 1}] User ID: ${profile.user_id}`);
      console.log(`       이름: ${profile.display_name || '(없음)'}`);
      console.log(`       전화: ${profile.phone || '(없음)'}`);
    });
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 상태 확인 완료');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkChatState();
