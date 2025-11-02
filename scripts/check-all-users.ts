import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// SERVICE_ROLE 키 사용 (RLS 우회)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkAllUsers() {
  console.log('🔍 모든 사용자 확인 중...\n');

  // user_profiles 테이블에서 모든 프로필 조회
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profileError) {
    console.error('프로필 목록 조회 실패:', profileError);
    return;
  }

  console.log(`✅ 총 ${profiles.length}개의 프로필 발견:\n`);

  profiles.forEach((profile, idx) => {
    console.log(`프로필 #${idx + 1}:`);
    console.log(`  user_id: ${profile.user_id}`);
    console.log(`  display_name: ${profile.display_name}`);
    console.log(`  roles: ${profile.roles}`);
    console.log(`  interest_regions: ${profile.interest_regions?.join(', ')}`);
    console.log(`  teacher_level: ${profile.teacher_level}`);
    console.log(`  created_at: ${profile.created_at}`);
    console.log('');
  });

  // recommendations_cache 확인
  const { data: caches, error: cacheError } = await supabase
    .from('recommendations_cache')
    .select('user_id, cards, updated_at')
    .order('updated_at', { ascending: false });

  if (cacheError) {
    console.error('캐시 조회 실패:', cacheError);
    return;
  }

  console.log(`\n📦 recommendations_cache 테이블:`);
  console.log(`  총 ${caches?.length || 0}개의 캐시 발견\n`);

  caches?.forEach((cache, idx) => {
    const matchingProfile = profiles.find(p => p.user_id === cache.user_id);
    const cards = cache.cards as any[];
    console.log(`캐시 #${idx + 1}:`);
    console.log(`  user_id: ${cache.user_id}`);
    console.log(`  프로필: ${matchingProfile ? `✅ ${matchingProfile.display_name}` : '❌ 없음'}`);
    console.log(`  카드 수: ${cards?.length || 0}개`);
    console.log(`  updated_at: ${cache.updated_at}`);
    console.log('');
  });
}

checkAllUsers();
