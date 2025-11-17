import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAllJobs() {
  console.log('🔍 전체 공고 데이터 조회 중...\n');

  // 최근 공고 20개 조회
  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('id, organization, title, school_level, subject, location, deadline, is_urgent, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ 공고 조회 실패:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️ 공고 데이터가 없습니다.');
    return;
  }

  console.log(`✅ 최근 공고 ${jobs.length}개 발견\n`);
  console.log('='.repeat(120));

  // 학교급별로 분류
  const byLevel: Record<string, any[]> = {
    '초등': [],
    '중등': [],
    '고등': [],
    '유치원': [],
    '특수': [],
    '미설정': []
  };

  jobs.forEach(job => {
    const level = job.school_level || '미설정';
    if (!byLevel[level]) {
      byLevel[level] = [];
    }
    byLevel[level].push(job);
  });

  // 학교급별로 출력
  Object.entries(byLevel).forEach(([level, levelJobs]) => {
    if (levelJobs.length === 0) return;

    console.log(`\n📚 ${level} 공고 (${levelJobs.length}개):`);
    console.log('-'.repeat(120));

    levelJobs.forEach((job, idx) => {
      console.log(`  ${idx + 1}. [${job.organization}] ${job.title}`);
      console.log(`     - 과목: ${job.subject || '미설정'}`);
      console.log(`     - 위치: ${job.location || '미설정'}`);
      console.log(`     - 마감: ${job.deadline || '미설정'} | 긴급: ${job.is_urgent ? '예' : '아니오'}`);
      console.log(`     - 등록: ${new Date(job.created_at).toLocaleDateString('ko-KR')}`);
      console.log('');
    });
  });

  // 통계
  console.log('\n📊 전체 공고 통계:');
  console.log(`  - 총 공고: ${jobs.length}개`);
  Object.entries(byLevel).forEach(([level, levelJobs]) => {
    if (levelJobs.length > 0) {
      console.log(`  - ${level}: ${levelJobs.length}개`);
    }
  });

  // 사용자가 볼 수 있는 초등 공고 확인
  const elementaryJobs = byLevel['초등'] || [];
  console.log(`\n✅ 초등교사가 볼 수 있는 공고: ${elementaryJobs.length}개`);

  // school_level이 null인 공고 중 초등 관련 키워드가 있는지 확인
  const undefinedJobs = byLevel['미설정'] || [];
  const elementaryKeywords = ['초등', '담임', '초등학교'];
  const likelyElementary = undefinedJobs.filter(job => {
    const text = `${job.title} ${job.organization}`.toLowerCase();
    return elementaryKeywords.some(kw => text.includes(kw));
  });

  if (likelyElementary.length > 0) {
    console.log(`⚠️  school_level이 미설정이지만 초등 관련으로 보이는 공고: ${likelyElementary.length}개`);
    likelyElementary.forEach((job, idx) => {
      console.log(`  ${idx + 1}. [${job.organization}] ${job.title}`);
    });
  }

  // 중등 공고 샘플
  const middleJobs = byLevel['중등'] || [];
  if (middleJobs.length > 0) {
    console.log(`\n🏫 중등 공고 샘플 (상위 3개):`);
    middleJobs.slice(0, 3).forEach((job, idx) => {
      console.log(`  ${idx + 1}. [${job.organization}] ${job.title} - ${job.subject || '과목 미설정'}`);
    });
  }
}

debugAllJobs().catch(console.error);
