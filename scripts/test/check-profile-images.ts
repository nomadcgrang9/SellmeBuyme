import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkProfileImages() {
  console.log('🔍 프로필 이미지 확인...\n');
  console.log('='.repeat(60));

  // 채팅 참여자들의 프로필 조회
  console.log('\n📍 Step 1: 채팅 참여자 프로필 확인');

  const { data: rooms, error: roomsError } = await supabase
    .from('chat_rooms')
    .select('participant_1_id, participant_2_id')
    .limit(5);

  if (roomsError) {
    console.error('❌ 채팅방 조회 실패:', roomsError);
    return;
  }

  const userIds = new Set<string>();
  rooms.forEach(room => {
    userIds.add(room.participant_1_id);
    userIds.add(room.participant_2_id);
  });

  console.log(`✅ ${userIds.size}명의 채팅 참여자 발견\n`);

  for (const userId of userIds) {
    console.log(`\n사용자 ID: ${userId.substring(0, 8)}...`);

    // 1. user_profiles 조회
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('display_name, profile_image_url')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.log(`  ❌ user_profiles 조회 실패: ${profileError.message}`);
    } else {
      console.log(`  ✅ display_name: ${profile.display_name || 'NULL'}`);
      console.log(`  ✅ profile_image_url: ${profile.profile_image_url || 'NULL'}`);
    }

    // 2. auth.users 조회
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);

    if (authError) {
      console.log(`  ❌ auth.users 조회 실패: ${authError.message}`);
    } else {
      console.log(`  ✅ email: ${user?.email}`);
      console.log(`  ✅ user_metadata.avatar_url: ${user?.user_metadata?.avatar_url || 'NULL'}`);
      console.log(`  ✅ user_metadata.picture: ${user?.user_metadata?.picture || 'NULL'}`);
    }
  }

  // Step 2: Storage에서 프로필 이미지 확인
  console.log('\n\n📍 Step 2: Storage (profiles 버킷) 확인');

  const { data: files, error: storageError } = await supabase.storage
    .from('profiles')
    .list('', { limit: 10 });

  if (storageError) {
    console.log(`❌ Storage 조회 실패: ${storageError.message}`);
  } else {
    console.log(`✅ profiles 버킷에 ${files.length}개 파일 존재`);
    files.forEach((file, i) => {
      console.log(`  [${i + 1}] ${file.name}`);
    });
  }

  console.log('\n='.repeat(60));
  console.log('\n✅ 진단 완료!');
}

checkProfileImages().catch(console.error);
