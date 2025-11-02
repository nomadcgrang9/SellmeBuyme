import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkAuthUser() {
  // 이메일로 사용자 조회 (auth.users는 RLS로 보호되므로 다른 방법 사용)
  console.log('📧 l34017305@gmail.com 계정 확인 중...\n');

  // user_profiles 테이블에서 email로 검색
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*');

  if (error) {
    console.error('프로필 목록 조회 실패:', error);
    return;
  }

  console.log(`✅ 총 ${profiles.length}개의 프로필 발견:\n`);

  profiles.forEach((profile, idx) => {
    console.log(`프로필 #${idx + 1}:`);
    console.log(`  user_id: ${profile.user_id}`);
    console.log(`  display_name: ${profile.display_name}`);
    console.log(`  roles: ${profile.roles}`);
    console.log(`  interest_regions: ${profile.interest_regions}`);
    console.log(`  teacher_level: ${profile.teacher_level}`);
    console.log(`  created_at: ${profile.created_at}`);
    console.log('');
  });

  // recommendations_cache 확인
  const { data: caches } = await supabase
    .from('recommendations_cache')
    .select('user_id, updated_at')
    .order('updated_at', { ascending: false });

  console.log(`\n📦 recommendations_cache 테이블:`);
  console.log(`  총 ${caches?.length || 0}개의 캐시 발견\n`);

  caches?.forEach((cache, idx) => {
    const hasProfile = profiles.some(p => p.user_id === cache.user_id);
    console.log(`캐시 #${idx + 1}: ${cache.user_id} ${hasProfile ? '✅ 프로필 있음' : '❌ 프로필 없음'}`);
  });
}

checkAuthUser();
