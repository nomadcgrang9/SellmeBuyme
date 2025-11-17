import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service Role 클라이언트 (RLS 우회)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnoseAuthenticated() {
  console.log('🔍 Service Role로 DB 직접 확인 (RLS 우회)\n');
  console.log('━'.repeat(60));

  // 1. 채팅방 확인
  console.log('\n📍 Step 1: 모든 채팅방 조회 (RLS 우회)');
  const { data: rooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('*')
    .order('created_at', { ascending: false });

  if (roomsError) {
    console.error('❌ 채팅방 조회 실패:', roomsError);
  } else {
    console.log(`✅ 채팅방 ${rooms?.length || 0}개 발견:`);
    rooms?.forEach((room, i) => {
      console.log(`\n   [${i + 1}] Room ID: ${room.id}`);
      console.log(`       참여자 1: ${room.participant_1_id}`);
      console.log(`       참여자 2: ${room.participant_2_id}`);
      console.log(`       생성일: ${room.created_at}`);
      console.log(`       마지막 메시지: ${room.last_message_at || '없음'}`);
    });
  }

  // 2. 메시지 확인
  console.log('\n\n📍 Step 2: 모든 메시지 조회 (RLS 우회)');
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (messagesError) {
    console.error('❌ 메시지 조회 실패:', messagesError);
  } else {
    console.log(`✅ 메시지 ${messages?.length || 0}개 발견:`);
    messages?.forEach((msg, i) => {
      console.log(`\n   [${i + 1}] Message ID: ${msg.id}`);
      console.log(`       Room ID: ${msg.room_id}`);
      console.log(`       발신자: ${msg.sender_id}`);
      console.log(`       내용: ${msg.content || '(파일 메시지)'}`.substring(0, 100));
      console.log(`       타입: ${msg.message_type}`);
      console.log(`       생성일: ${msg.created_at}`);
    });
  }

  // 3. chat_participants 확인
  console.log('\n\n📍 Step 3: 모든 참여자 조회 (RLS 우회)');
  const { data: participants, error: participantsError } = await supabase
    .from('chat_participants')
    .select('*')
    .order('joined_at', { ascending: false });

  if (participantsError) {
    console.error('❌ 참여자 조회 실패:', participantsError);
  } else {
    console.log(`✅ 참여자 ${participants?.length || 0}명 발견:`);
    participants?.forEach((p, i) => {
      console.log(`\n   [${i + 1}] User: ${p.user_id}`);
      console.log(`       Room: ${p.room_id}`);
      console.log(`       읽지 않음: ${p.unread_count}`);
      console.log(`       마지막 읽음: ${p.last_read_at || '없음'}`);
      console.log(`       가입일: ${p.joined_at}`);
    });
  }

  // 4. 특정 사용자 이메일로 조회
  console.log('\n\n📍 Step 4: 테스트 사용자 확인');
  const testEmails = ['cgrang@naver.com', 'l30417305@gmail.com'];

  for (const email of testEmails) {
    const { data: user, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error(`❌ 사용자 목록 조회 실패:`, userError);
      continue;
    }

    const targetUser = user.users.find(u => u.email === email);
    if (targetUser) {
      console.log(`\n   📧 ${email}`);
      console.log(`      User ID: ${targetUser.id}`);
      console.log(`      Provider: ${targetUser.app_metadata.provider}`);

      // 이 사용자의 채팅방 찾기
      const userRooms = rooms?.filter(r =>
        r.participant_1_id === targetUser.id || r.participant_2_id === targetUser.id
      );
      console.log(`      참여 중인 채팅방: ${userRooms?.length || 0}개`);

      // 이 사용자가 보낸 메시지 찾기
      const userMessages = messages?.filter(m => m.sender_id === targetUser.id);
      console.log(`      보낸 메시지: ${userMessages?.length || 0}개`);

      if (userMessages && userMessages.length > 0) {
        userMessages.slice(0, 3).forEach((msg, idx) => {
          console.log(`         [${idx + 1}] "${msg.content}" (${msg.created_at})`);
        });
      }
    } else {
      console.log(`\n   ⚠️  ${email} - 사용자를 찾을 수 없음`);
    }
  }

  // 5. RLS 정책 확인
  console.log('\n\n📍 Step 5: RLS 정책 상태 확인');
  const { data: rlsPolicies, error: rlsError } = await supabase
    .rpc('pg_policies')
    .select('*');

  if (rlsError) {
    console.log('⚠️  RLS 정책 직접 조회 실패 (권한 없음)');
    console.log('   → Supabase 대시보드에서 확인 필요');
  }

  console.log('\n\n' + '━'.repeat(60));
  console.log('📊 Service Role 진단 요약\n');
  console.log(`채팅방 개수: ${rooms?.length || 0}`);
  console.log(`메시지 개수: ${messages?.length || 0}`);
  console.log(`참여자 레코드: ${participants?.length || 0}`);

  if (messages && messages.length === 0 && rooms && rooms.length === 0) {
    console.log('\n🔴 결론: DB에 데이터가 전혀 없음');
    console.log('\n원인 가능성:');
    console.log('1. 메시지 전송 API 호출이 실제로 실패함 (에러 무시됨)');
    console.log('2. Realtime 이벤트는 오지만 INSERT가 실행되지 않음');
    console.log('3. 다른 테이블/스키마에 저장되고 있음');
    console.log('4. 트랜잭션 롤백 발생');
    console.log('\n다음 단계:');
    console.log('- 브라우저 Console에서 sendMessage() 호출 결과 확인');
    console.log('- Network 탭에서 Supabase API 요청 확인');
    console.log('- Supabase 대시보드 → Logs → API 로그 확인');
  } else if (messages && messages.length > 0) {
    console.log('\n🟢 결론: 메시지가 DB에 존재함!');
    console.log('→ 이전 진단에서 anon key로 조회했을 때 RLS가 차단했을 가능성');
  }

  console.log('\n✅ 진단 완료!');
}

diagnoseAuthenticated().catch(console.error);
