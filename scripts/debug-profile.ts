import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugProfiles() {
  console.log('🔍 사용자 프로필 조회 중...\n');

  // 모든 프로필 조회 (최근 5개)
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ 프로필 조회 실패:', error);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️ 프로필 데이터가 없습니다.');
    return;
  }

  console.log(`✅ 총 ${profiles.length}개 프로필 발견\n`);
  console.log('='.repeat(80));

  profiles.forEach((profile, idx) => {
    console.log(`\n[프로필 ${idx + 1}]`);
    console.log(`User ID: ${profile.user_id}`);
    console.log(`이름: ${profile.display_name || '미설정'}`);
    console.log(`역할(roles): ${JSON.stringify(profile.roles)}`);
    console.log(`교사 레벨(teacher_level): ${profile.teacher_level || '미설정'}`);
    console.log(`담당 가능 과목(capable_subjects): ${JSON.stringify(profile.capable_subjects)}`);
    console.log(`관심 지역(interest_regions): ${JSON.stringify(profile.interest_regions)}`);
    console.log(`선호 과목(preferred_subjects): ${JSON.stringify(profile.preferred_subjects)}`);
    console.log(`선호 공고 유형(preferred_job_types): ${JSON.stringify(profile.preferred_job_types)}`);
    console.log(`경력(experience_years): ${profile.experience_years || '미설정'}년`);
    console.log(`마지막 업데이트: ${profile.updated_at}`);
    console.log('-'.repeat(80));
  });

  // 추천 캐시도 확인
  console.log('\n📦 추천 캐시 조회 중...\n');
  const { data: caches, error: cacheError } = await supabase
    .from('recommendations_cache')
    .select('user_id, updated_at, ai_comment, profile_snapshot')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (cacheError) {
    console.error('❌ 캐시 조회 실패:', cacheError);
    return;
  }

  if (!caches || caches.length === 0) {
    console.log('⚠️ 추천 캐시가 없습니다.');
    return;
  }

  console.log(`✅ 총 ${caches.length}개 캐시 발견\n`);

  caches.forEach((cache, idx) => {
    console.log(`\n[캐시 ${idx + 1}]`);
    console.log(`User ID: ${cache.user_id}`);
    console.log(`AI 코멘트: ${JSON.stringify(cache.ai_comment, null, 2)}`);
    console.log(`프로필 스냅샷: ${JSON.stringify(cache.profile_snapshot, null, 2)}`);
    console.log(`마지막 업데이트: ${cache.updated_at}`);
    console.log('-'.repeat(80));
  });
}

debugProfiles().catch(console.error);
