/**
 * classifyJob v3 테스트 - 실제 jobClassifier.ts 사용
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { classifyJob, type PrimaryCategory } from '../src/lib/utils/jobClassifier';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testClassifierV3() {
  console.log('==============================================');
  console.log('   classifyJob v3 테스트 (실제 함수 사용)');
  console.log('==============================================\n');

  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, school_level')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!allJobs) return;

  // 초등학교 공고 필터
  const elementaryJobs = allJobs.filter(job => {
    const org = (job.organization || '').toLowerCase();
    const sl = (job.school_level || '').toLowerCase();
    return org.includes('초등') || org.endsWith('초') || sl === '초등';
  });

  console.log(`초등학교 관련 공고: ${elementaryJobs.length}건\n`);

  // 분류
  const categories: Record<PrimaryCategory, typeof allJobs> = {
    '유치원': [],
    '초등담임': [],
    '교과과목': [],
    '비교과': [],
    '특수': [],
    '방과후/돌봄': [],
    '행정·교육지원': [],
    '기타': [],
  };

  elementaryJobs.forEach(job => {
    const category = classifyJob(job);
    categories[category].push(job);
  });

  console.log('=== 분류 결과 ===');
  Object.entries(categories).forEach(([cat, jobs]) => {
    if (jobs.length > 0) {
      console.log(`${cat}: ${jobs.length}건`);
    }
  });

  // 초등담임 전체 목록
  console.log('\n\n=== "초등담임" 분류 (전체) ===');
  categories['초등담임'].forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
  });

  // 문제 케이스 확인
  console.log('\n\n=== 문제 케이스 검증 ===');

  // 보건교사 태그 검색
  const boheonCases = elementaryJobs.filter(j =>
    (j.tags || []).some(t => t.toLowerCase().includes('보건'))
  );
  console.log(`\n[보건교사 태그] ${boheonCases.length}건`);
  boheonCases.forEach(j => {
    const cat = classifyJob(j);
    console.log(`  ${cat === '비교과' ? '✅' : '❌'} [${j.organization}] ${j.title} → ${cat}`);
    console.log(`     태그: ${j.tags?.join(', ')}`);
  });

  // 특수교사 태그 검색
  const specialCases = elementaryJobs.filter(j =>
    (j.tags || []).some(t => t.toLowerCase().includes('특수'))
  );
  console.log(`\n[특수교사 태그] ${specialCases.length}건`);
  specialCases.forEach(j => {
    const cat = classifyJob(j);
    console.log(`  ${cat === '특수' ? '✅' : '❌'} [${j.organization}] ${j.title} → ${cat}`);
    console.log(`     태그: ${j.tags?.join(', ')}`);
  });

  // 사서교사 태그 검색
  const saseoeCases = elementaryJobs.filter(j =>
    (j.tags || []).some(t => t.toLowerCase().includes('사서'))
  );
  console.log(`\n[사서교사 태그] ${saseoeCases.length}건`);
  saseoeCases.forEach(j => {
    const cat = classifyJob(j);
    console.log(`  ${cat === '비교과' ? '✅' : '❌'} [${j.organization}] ${j.title} → ${cat}`);
    console.log(`     태그: ${j.tags?.join(', ')}`);
  });

  // 교과전담 태그 검색
  const gyogwaJeondamCases = elementaryJobs.filter(j =>
    (j.tags || []).some(t => t.toLowerCase().includes('전담')) ||
    (j.title || '').toLowerCase().includes('전담')
  );
  console.log(`\n[교과전담 키워드] ${gyogwaJeondamCases.length}건`);
  gyogwaJeondamCases.forEach(j => {
    const cat = classifyJob(j);
    const isCorrect = cat === '교과과목' || (j.title || '').includes('담임');
    console.log(`  ${isCorrect ? '✅' : '❌'} [${j.organization}] ${j.title} → ${cat}`);
    console.log(`     태그: ${j.tags?.join(', ')}`);
  });

  // 특정 과목만 있는 케이스 (과학, 영어, 체육 등)
  const subjectOnlyCases = elementaryJobs.filter(j => {
    const tags = (j.tags || []).map(t => t.toLowerCase()).join(' ');
    const subjects = ['과학', '영어', '체육', '음악', '미술'];
    const hasSubject = subjects.some(s => tags.includes(s));
    const hasDamim = tags.includes('담임');
    return hasSubject && !hasDamim;
  });
  console.log(`\n[과목만 있고 담임 없음] ${subjectOnlyCases.length}건`);
  subjectOnlyCases.slice(0, 20).forEach(j => {
    const cat = classifyJob(j);
    console.log(`  → [${j.organization}] ${j.title} → ${cat}`);
    console.log(`     태그: ${j.tags?.join(', ')}`);
  });

  console.log('\n==============================================');
  console.log('              완료');
  console.log('==============================================');
}

testClassifierV3().catch(console.error);
