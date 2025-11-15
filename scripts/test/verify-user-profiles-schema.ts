import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verifySchema() {
  console.log('🔍 user_profiles 스키마 확인...\n');
  console.log('='.repeat(60));

  // 1. user_profiles 테이블 구조 확인
  console.log('\n📍 Step 1: 테이블 컬럼 목록 확인');

  const { data: tableInfo, error: tableError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ 테이블 조회 실패:', tableError);
    return;
  }

  if (tableInfo && tableInfo.length > 0) {
    const columns = Object.keys(tableInfo[0]);
    console.log('✅ user_profiles 컬럼 목록:');
    columns.forEach((col, i) => {
      console.log(`   [${i + 1}] ${col}`);
    });

    const hasDisplayName = columns.includes('display_name');
    console.log(`\n${hasDisplayName ? '✅' : '❌'} display_name 컬럼 존재: ${hasDisplayName}`);
  }

  // 2. 실제 데이터 샘플 확인
  console.log('\n\n📍 Step 2: user_profiles 데이터 샘플 (10개)');

  const { data: profiles, error: dataError } = await supabase
    .from('user_profiles')
    .select('user_id, display_name')
    .limit(10);

  if (dataError) {
    console.error('❌ 프로필 데이터 조회 실패:', dataError);
  } else if (profiles) {
    profiles.forEach((p, i) => {
      const displayName = (p as any).display_name;
      console.log(`[${i + 1}] user_id: ${p.user_id.substring(0, 8)}... → display_name: ${displayName || 'NULL'}`);
    });

    const nullCount = profiles.filter(p => !(p as any).display_name).length;
    console.log(`\n⚠️  display_name이 NULL인 프로필: ${nullCount}/${profiles.length}`);
  }

  // 3. auth.users와 비교
  console.log('\n\n📍 Step 3: auth.users 이메일 확인');

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ auth.users 조회 실패:', usersError);
  } else if (users) {
    console.log(`✅ 총 ${users.length}명의 사용자 발견\n`);

    users.slice(0, 5).forEach((u, i) => {
      console.log(`[${i + 1}] ${u.email} (provider: ${u.app_metadata.provider})`);
      console.log(`    user_metadata:`, {
        display_name: u.user_metadata.display_name,
        full_name: u.user_metadata.full_name,
      });
    });
  }

  // 4. 채팅 참여자 프로필 확인
  console.log('\n\n📍 Step 4: 채팅 참여자 프로필 확인');

  const { data: rooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('participant_1_id, participant_2_id')
    .limit(5);

  if (roomsError) {
    console.error('❌ 채팅방 조회 실패:', roomsError);
  } else if (rooms) {
    const participantIds = new Set<string>();
    rooms.forEach(room => {
      participantIds.add(room.participant_1_id);
      participantIds.add(room.participant_2_id);
    });

    console.log(`✅ 채팅 참여자 ${participantIds.size}명 발견\n`);

    for (const userId of Array.from(participantIds)) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', userId)
        .single();

      const { data: { user } } = await supabase.auth.admin.getUserById(userId);

      const displayName = (profile as any)?.display_name;
      const email = user?.email;
      const emailPrefix = email?.split('@')[0];

      console.log(`user_id: ${userId.substring(0, 8)}...`);
      console.log(`  display_name: ${displayName || 'NULL'}`);
      console.log(`  email: ${email}`);
      console.log(`  이메일 @ 앞부분: ${emailPrefix}`);
      console.log(`  → 표시될 이름: ${displayName || emailPrefix || '알 수 없음'}\n`);
    }
  }

  console.log('='.repeat(60));
  console.log('\n📊 결론\n');
  console.log('위 데이터를 기반으로:');
  console.log('1. display_name 컬럼이 존재하는지 확인');
  console.log('2. NULL 값이 있다면 이메일 @ 앞부분으로 fallback 필요');
  console.log('3. 마이그레이션이 필요한지 판단\n');
  console.log('✅ 진단 완료!');
}

verifySchema().catch(console.error);
