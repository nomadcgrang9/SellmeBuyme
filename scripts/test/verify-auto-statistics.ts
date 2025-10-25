import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDU3NzAsImV4cCI6MjA3NjI4MTc3MH0.anomdGhxNrL3aHJ4x-PM6wXWcADNKuKZnuQ2mv8cWuQ';

const supabase = createClient(supabaseUrl, anonKey);

async function verifyAutoStatistics() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 자동 통계 집계 검증');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const todayStr = today.toISOString().split('T')[0];

  console.log(`📅 오늘 날짜: ${todayStr}\n`);

  // 1. 오늘 신규 공고 카운트 (실제 DB 쿼리)
  console.log('1️⃣  오늘 신규 공고 집계');
  console.log('─────────────────────────────────────────────────────────────');
  const { count: jobCount, error: jobError } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  if (jobError) {
    console.error('❌ 오류:', jobError.message);
  } else {
    console.log(`✅ 오늘 신규 공고: ${jobCount || 0}건`);

    // 샘플 데이터 표시
    const { data: sampleJobs } = await supabase
      .from('job_postings')
      .select('id, title, organization, created_at')
      .gte('created_at', todayISO)
      .order('created_at', { ascending: false })
      .limit(3);

    if (sampleJobs && sampleJobs.length > 0) {
      console.log('\n   📝 최근 신규 공고:');
      sampleJobs.forEach((job: any, idx: number) => {
        const time = new Date(job.created_at).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`   ${idx + 1}. [${time}] ${job.organization} - ${job.title}`);
      });
    }
  }
  console.log('');

  // 2. 마감임박 공고 카운트 (7일 이내)
  console.log('2️⃣  마감임박 공고 집계 (7일 이내)');
  console.log('─────────────────────────────────────────────────────────────');
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(today.getDate() + 7);
  const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

  const { count: urgentCount, error: urgentError } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .gte('deadline', todayStr)
    .lte('deadline', sevenDaysStr);

  if (urgentError) {
    console.error('❌ 오류:', urgentError.message);
  } else {
    console.log(`✅ 마감임박 공고: ${urgentCount || 0}건 (${todayStr} ~ ${sevenDaysStr})`);

    // 샘플 데이터 표시
    const { data: sampleUrgent } = await supabase
      .from('job_postings')
      .select('id, title, organization, deadline')
      .gte('deadline', todayStr)
      .lte('deadline', sevenDaysStr)
      .order('deadline', { ascending: true })
      .limit(3);

    if (sampleUrgent && sampleUrgent.length > 0) {
      console.log('\n   ⏰ 마감임박 공고:');
      sampleUrgent.forEach((job: any, idx: number) => {
        console.log(`   ${idx + 1}. [${job.deadline}] ${job.organization} - ${job.title}`);
      });
    }
  }
  console.log('');

  // 3. 오늘 신규 인력 카운트
  console.log('3️⃣  오늘 신규 인력 집계');
  console.log('─────────────────────────────────────────────────────────────');
  const { count: talentCount, error: talentError } = await supabase
    .from('talents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  if (talentError) {
    console.error('❌ 오류:', talentError.message);
  } else {
    console.log(`✅ 오늘 신규 인력: ${talentCount || 0}명`);

    if (talentCount && talentCount > 0) {
      const { data: sampleTalents } = await supabase
        .from('talents')
        .select('id, name, specialty, created_at')
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false })
        .limit(3);

      if (sampleTalents && sampleTalents.length > 0) {
        console.log('\n   👥 신규 인력:');
        sampleTalents.forEach((talent: any, idx: number) => {
          const time = new Date(talent.created_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          console.log(`   ${idx + 1}. [${time}] ${talent.name} - ${talent.specialty}`);
        });
      }
    }
  }
  console.log('');

  // 최종 요약
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 자동 집계 결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`오늘 신규 공고: ${jobCount || 0}건`);
  console.log(`마감임박 공고: ${urgentCount || 0}건 (7일 이내)`);
  console.log(`오늘 신규 인력: ${talentCount || 0}명`);
  console.log('');
  console.log('✅ 이 숫자들이 메인 페이지 AIInsightBox에 표시되어야 합니다!');
  console.log('✅ 관리자 페이지에서 "자동 집계" 버튼을 클릭하면 이 값들이 반영됩니다.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

verifyAutoStatistics();
