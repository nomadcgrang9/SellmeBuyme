import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestProfiles() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 테스트 사용자 프로필 생성');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Find existing users by email
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ 사용자 목록 조회 실패:', usersError.message);
    process.exit(1);
  }

  console.log(`📌 총 ${users.users.length}명의 사용자 발견\n`);

  const user1 = users.users.find(u => u.email === 'l30417305@gmail.com');
  const user2 = users.users.find(u => u.email === 'cgrang@naver.com');

  if (!user1) {
    console.error('❌ l30417305@gmail.com 사용자를 찾을 수 없습니다.');
    console.log('   Google OAuth로 먼저 로그인해주세요.\n');
  } else {
    console.log(`✅ User 1 발견: ${user1.email} (ID: ${user1.id})`);
  }

  if (!user2) {
    console.error('❌ cgrang@naver.com 사용자를 찾을 수 없습니다.');
    console.log('   Kakao OAuth로 먼저 로그인해주세요.\n');
  } else {
    console.log(`✅ User 2 발견: ${user2.email} (ID: ${user2.id})`);
  }

  if (!user1 || !user2) {
    console.log('\n💡 두 계정 모두 로그인이 필요합니다.');
    console.log('   http://localhost:5174 접속 후 각각 로그인하세요.\n');
    process.exit(1);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 프로필 생성 중...\n');

  // 2. Create or update user profiles
  const profile1 = {
    user_id: user1.id,
    display_name: 'l3041 (Google)',
    phone: '010-1234-5678',
    interest_regions: ['서울특별시'],
    experience_years: 5,
    teacher_level: 'advanced',
    capable_subjects: ['수학', '영어']
  };

  const profile2 = {
    user_id: user2.id,
    display_name: 'cgrang (Kakao)',
    phone: '010-9876-5432',
    interest_regions: ['경기도'],
    experience_years: 3,
    teacher_level: 'intermediate',
    capable_subjects: ['국어', '사회']
  };

  const { error: error1 } = await supabase
    .from('user_profiles')
    .upsert(profile1, { onConflict: 'user_id' });

  if (error1) {
    console.error('❌ User 1 프로필 생성 실패:', error1.message);
  } else {
    console.log('✅ User 1 프로필 생성: l3041 (Google)');
  }

  const { error: error2 } = await supabase
    .from('user_profiles')
    .upsert(profile2, { onConflict: 'user_id' });

  if (error2) {
    console.error('❌ User 2 프로필 생성 실패:', error2.message);
  } else {
    console.log('✅ User 2 프로필 생성: cgrang (Kakao)');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 테스트 프로필 생성 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 다음 단계: 채팅 테스트');
  console.log('   1. User 1으로 로그인 → /chat → 사용자 검색 → "cgrang" 검색');
  console.log('   2. 채팅방 생성 → 메시지 전송');
  console.log('   3. User 2로 로그인 → 메시지 수신 확인\n');
}

createTestProfiles();
