import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDU3NzAsImV4cCI6MjA3NjI4MTc3MH0.anomdGhxNrL3aHJ4x-PM6wXWcADNKuKZnuQ2mv8cWuQ';

const supabase = createClient(supabaseUrl, anonKey);

async function testRefreshStats() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 새로고침 기능 팩트체크');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const todayStr = today.toISOString().split('T')[0];

  console.log(`📅 오늘 날짜: ${todayStr}`);
  console.log(`⏰ 현재 시각: ${new Date().toLocaleString('ko-KR')}\n`);

  // 1️⃣  실시간 자동 집계 (getAutoStatistics와 동일한 로직)
  console.log('1️⃣  실시간 자동 집계 시뮬레이션');
  console.log('─────────────────────────────────────────────────────────────');

  // 오늘 신규 공고
  const { count: newJobsCount } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  console.log(`✅ 오늘 신규 공고: ${newJobsCount || 0}건`);

  // 마감임박 공고 (7일 이내)
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(today.getDate() + 7);
  const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

  const { count: urgentJobsCount } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .gte('deadline', todayStr)
    .lte('deadline', sevenDaysStr);

  console.log(`✅ 마감임박 공고: ${urgentJobsCount || 0}건 (7일 이내)`);

  // 오늘 신규 인력
  const { count: newTalentsCount } = await supabase
    .from('talents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  console.log(`✅ 오늘 신규 인력: ${newTalentsCount || 0}명\n`);

  // 2️⃣  DB 저장된 통계와 비교
  console.log('2️⃣  DB 저장된 통계 (수동 모드일 때 표시되는 값)');
  console.log('─────────────────────────────────────────────────────────────');

  const { data: dbStats, error } = await supabase
    .from('stripe_statistics')
    .select('*')
    .eq('stats_date', todayStr)
    .maybeSingle();

  if (error) {
    console.error('❌ 오류:', error.message);
  } else if (dbStats) {
    console.log(`📊 DB 통계 (${todayStr}):`);
    console.log(`   - 신규 공고: ${dbStats.new_jobs_count}건`);
    console.log(`   - 마감임박: ${dbStats.urgent_jobs_count}건`);
    console.log(`   - 신규 인력: ${dbStats.new_talents_count}명\n`);

    // 차이 확인
    const diffJobs = (newJobsCount || 0) - dbStats.new_jobs_count;
    const diffUrgent = (urgentJobsCount || 0) - dbStats.urgent_jobs_count;
    const diffTalents = (newTalentsCount || 0) - dbStats.new_talents_count;

    console.log('📈 실시간 vs DB 차이:');
    console.log(`   신규 공고: ${diffJobs >= 0 ? '+' : ''}${diffJobs}건`);
    console.log(`   마감임박: ${diffUrgent >= 0 ? '+' : ''}${diffUrgent}건`);
    console.log(`   신규 인력: ${diffTalents >= 0 ? '+' : ''}${diffTalents}명\n`);
  } else {
    console.log('ℹ️  DB에 저장된 통계 데이터 없음 (수동 모드에서 아직 저장 안 함)\n');
  }

  // 3️⃣  결론
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 새로고침 버튼 작동 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✅ 새로고침 버튼 클릭 시:');
  console.log(`   → 오늘 신규 공고: ${newJobsCount || 0}건`);
  console.log(`   → 마감임박 공고: ${urgentJobsCount || 0}건`);
  console.log(`   → 오늘 신규 인력: ${newTalentsCount || 0}명`);
  console.log('');
  console.log('🎯 관리자 페이지에서 확인:');
  console.log('   1. 통계 설정 → "자동 집계" 선택');
  console.log('   2. "새로고침" 버튼 클릭');
  console.log('   3. 위의 숫자로 업데이트되어야 함');
  console.log('   4. Toast 알림 "통계가 새로고침되었습니다" 표시');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testRefreshStats();
