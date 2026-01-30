/**
 * 초등담임 문제 팩트 체크
 * 가설 1: 게시판에 초등담임 공고가 없다
 * 가설 2: 크롤링/저장이 잘못되었다
 * 가설 3: 태그 기반 필터가 더 정확하다
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 현재 classifyJob 로직 재현
function classifyJob(job: { title: string; school_level: string | null; organization: string | null }) {
  const title = job.title || '';
  const tl = title.toLowerCase();
  const sl = (job.school_level || '').toLowerCase();
  const org = (job.organization || '').toLowerCase();
  const combined = `${sl} ${org} ${title}`.toLowerCase();

  // P1: 특수
  if (tl.includes('특수')) return '특수';

  // P1.5: 특수학교
  const orgRaw = (job.organization || '').trim();
  if (
    orgRaw.endsWith('학교') &&
    !orgRaw.endsWith('초등학교') &&
    !orgRaw.endsWith('중학교') &&
    !orgRaw.endsWith('고등학교') &&
    !orgRaw.endsWith('대학교')
  ) {
    return '특수';
  }

  // P2: 비교과
  if (
    (tl.includes('보건') && (tl.includes('교사') || tl.includes('교원'))) ||
    (tl.includes('상담') && (tl.includes('교사') || tl.includes('교원') || tl.includes('전문상담'))) ||
    (tl.includes('사서') && (tl.includes('교사') || tl.includes('교원'))) ||
    (tl.includes('영양') && tl.includes('교사'))
  ) {
    return '비교과';
  }

  // P3: 유치원
  if (combined.includes('유치')) return '유치원';

  // P4/P6/P7: 초등 분기
  const isElementary = combined.includes('초등') || org.endsWith('초');
  if (isElementary) {
    if (tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄') || tl.includes('에듀케어') || tl.includes('외부강사') || tl.includes('개인위탁')) {
      return '방과후/돌봄';
    }
    if (
      tl.includes('실무') || tl.includes('공무직') || tl.includes('봉사') ||
      tl.includes('지킴이') || tl.includes('튜터') || tl.includes('협력강사') ||
      tl.includes('안전') || tl.includes('보조') || tl.includes('영양사') || tl.includes('배움터')
    ) {
      return '행정·교육지원';
    }
    return '초등담임';
  }

  // P5: 교과과목 (중/고)
  const isSecondary = combined.includes('중학') || combined.includes('중등') || combined.includes('고등') || combined.includes('고교');
  if (isSecondary) {
    return '교과과목';
  }

  // P6: 방과후/돌봄 (학교급 불명)
  if (
    tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄') ||
    tl.includes('에듀케어') || tl.includes('외부강사') || tl.includes('개인위탁')
  ) {
    return '방과후/돌봄';
  }

  // P7: 행정·교육지원
  if (
    tl.includes('실무') || tl.includes('공무직') || tl.includes('봉사') ||
    tl.includes('지킴이') || tl.includes('튜터') || tl.includes('협력강사') ||
    tl.includes('안전') || tl.includes('보조') || tl.includes('영양사') || tl.includes('배움터')
  ) {
    return '행정·교육지원';
  }

  return '기타';
}

async function factCheck() {
  console.log('==============================================');
  console.log('   초등담임 문제 팩트 체크');
  console.log('==============================================\n');

  // 전체 DB 조회
  const { data: allJobs, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, school_level, created_at')
    .order('created_at', { ascending: false });

  if (error || !allJobs) {
    console.error('DB 조회 에러:', error);
    return;
  }

  console.log(`전체 DB 공고 수: ${allJobs.length}건\n`);

  // ============================================
  // 가설 1 검증: 초등학교 공고가 DB에 얼마나 있는가?
  // ============================================
  console.log('==============================================');
  console.log('가설 1 검증: 초등학교 관련 공고 현황');
  console.log('==============================================\n');

  const elementaryJobs = allJobs.filter(job => {
    const org = (job.organization || '').toLowerCase();
    const sl = (job.school_level || '').toLowerCase();
    return org.includes('초등') || org.endsWith('초') || sl === '초등';
  });

  console.log(`[1-1] 초등학교 관련 공고 총: ${elementaryJobs.length}건\n`);

  // school_level이 "초등"인 공고
  const schoolLevelElementary = allJobs.filter(j => j.school_level === '초등');
  console.log(`[1-2] school_level="초등" 공고: ${schoolLevelElementary.length}건`);

  // organization에 "초등" 포함
  const orgElementary = allJobs.filter(j => (j.organization || '').includes('초등'));
  console.log(`[1-3] organization에 "초등" 포함: ${orgElementary.length}건`);

  // ============================================
  // 가설 2 검증: 진짜 초등담임 공고 vs 잘못 분류된 공고
  // ============================================
  console.log('\n==============================================');
  console.log('가설 2 검증: 현재 분류 로직의 문제점');
  console.log('==============================================\n');

  // 현재 로직으로 "초등담임"으로 분류되는 공고
  const classifiedAsElementaryDamim = allJobs.filter(job => {
    return classifyJob({
      title: job.title,
      school_level: job.school_level,
      organization: job.organization
    }) === '초등담임';
  });

  console.log(`[2-1] 현재 로직으로 "초등담임" 분류: ${classifiedAsElementaryDamim.length}건\n`);

  // 이 중 진짜 담임 vs 잘못 분류
  const realDamim: typeof allJobs = [];
  const wronglyClassified: typeof allJobs = [];

  // 진짜 초등담임으로 볼 수 있는 키워드
  const realDamimKeywords = ['담임', '기간제교사', '기간제교원', '계약제교사', '계약제교원', '초등교사', '학급담임'];
  // 초등담임이 아닌 것 (강사, 지원, 보육 등)
  const notDamimKeywords = ['강사', '보육', '전담사', '지원', '시설', '경비', '미화', '당직', '조리', '영양사', '지킴이', '봉사', '튜터', '운동부', '스포츠'];

  classifiedAsElementaryDamim.forEach(job => {
    const title = job.title || '';
    const tags = (job.tags || []).join(' ');
    const combined = (title + ' ' + tags).toLowerCase();

    const hasRealDamimKeyword = realDamimKeywords.some(kw => combined.includes(kw.toLowerCase()));
    const hasNotDamimKeyword = notDamimKeywords.some(kw => title.toLowerCase().includes(kw.toLowerCase()));

    if (hasRealDamimKeyword && !hasNotDamimKeyword) {
      realDamim.push(job);
    } else {
      wronglyClassified.push(job);
    }
  });

  console.log(`[2-2] 진짜 초등담임으로 보이는 공고: ${realDamim.length}건`);
  console.log(`[2-3] 잘못 분류된 공고 (초등담임 아님): ${wronglyClassified.length}건`);
  console.log(`[2-4] 잘못 분류 비율: ${((wronglyClassified.length / classifiedAsElementaryDamim.length) * 100).toFixed(1)}%\n`);

  // 진짜 초등담임 샘플
  console.log('--- 진짜 초등담임으로 보이는 공고 (전체) ---');
  realDamim.forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
  });

  console.log('\n--- 잘못 분류된 공고 샘플 (상위 30개) ---');
  wronglyClassified.slice(0, 30).forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
  });

  // ============================================
  // 가설 3 검증: 태그 기반 필터링이 더 정확한가?
  // ============================================
  console.log('\n==============================================');
  console.log('가설 3 검증: 태그 기반 분류 정확도');
  console.log('==============================================\n');

  // 태그에 "담임" 포함된 공고
  const tagDamim = elementaryJobs.filter(job => {
    const tags = (job.tags || []).map(t => t.toLowerCase());
    return tags.some(t => t.includes('담임'));
  });

  console.log(`[3-1] 초등학교 공고 중 태그에 "담임" 포함: ${tagDamim.length}건`);

  // 태그에 "기간제교사" 또는 "초등교사" 포함
  const tagTeacher = elementaryJobs.filter(job => {
    const tags = (job.tags || []).map(t => t.toLowerCase());
    return tags.some(t => t.includes('기간제교사') || t.includes('초등교사') || t.includes('교사'));
  });

  console.log(`[3-2] 초등학교 공고 중 태그에 "교사" 포함: ${tagTeacher.length}건`);

  // 태그 OR 타이틀에 담임/기간제교사/계약제교원 포함
  const realElementaryTeacher = elementaryJobs.filter(job => {
    const title = (job.title || '').toLowerCase();
    const tags = (job.tags || []).map(t => t.toLowerCase()).join(' ');
    const combined = title + ' ' + tags;

    return (combined.includes('담임') ||
            ((combined.includes('기간제') || combined.includes('계약제')) &&
             (combined.includes('교사') || combined.includes('교원')))) &&
           !notDamimKeywords.some(kw => title.includes(kw.toLowerCase()));
  });

  console.log(`[3-3] 태그+타이틀 기반 진짜 초등담임: ${realElementaryTeacher.length}건\n`);

  console.log('--- 태그+타이틀 기반 진짜 초등담임 목록 (전체) ---');
  realElementaryTeacher.forEach((job, i) => {
    console.log(`${i + 1}. [${job.location}] ${job.organization}`);
    console.log(`   제목: ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
  });

  // ============================================
  // 최종 결론
  // ============================================
  console.log('\n==============================================');
  console.log('              최종 팩트 체크 결과');
  console.log('==============================================\n');

  console.log(`1. 전체 DB 공고: ${allJobs.length}건`);
  console.log(`2. 초등학교 관련 공고: ${elementaryJobs.length}건`);
  console.log(`3. 현재 "초등담임"으로 분류: ${classifiedAsElementaryDamim.length}건`);
  console.log(`   - 진짜 초등담임: ${realDamim.length}건`);
  console.log(`   - 잘못 분류 (강사/지원 등): ${wronglyClassified.length}건 (${((wronglyClassified.length / classifiedAsElementaryDamim.length) * 100).toFixed(1)}%)`);
  console.log(`4. 태그+타이틀 기반 진짜 초등담임: ${realElementaryTeacher.length}건`);

  console.log('\n[문제 원인]');
  if (wronglyClassified.length > realDamim.length) {
    console.log(`❌ 현재 분류 로직 심각한 문제!`);
    console.log(`   - "초등담임"으로 분류된 ${classifiedAsElementaryDamim.length}건 중`);
    console.log(`   - ${wronglyClassified.length}건(${((wronglyClassified.length / classifiedAsElementaryDamim.length) * 100).toFixed(1)}%)이 강사/보육/지원 등 잘못 분류`);
    console.log(`   - classifyJob() 로직에서 "초등학교 + 특정 키워드 없음 = 초등담임" fallback이 문제`);
  }

  if (realElementaryTeacher.length < 50) {
    console.log(`\n⚠️ 실제 초등담임 공고 자체가 ${realElementaryTeacher.length}건으로 적음`);
    console.log(`   - 비수기이거나 크롤러가 수집 못하고 있을 가능성`);
    console.log(`   - 실제 교육청 게시판 확인 필요`);
  }

  // 잘못 분류된 공고의 패턴 분석
  console.log('\n[잘못 분류된 공고 패턴 분석]');
  const wrongPatterns: Record<string, number> = {};
  wronglyClassified.forEach(job => {
    const title = (job.title || '').toLowerCase();
    if (title.includes('강사')) wrongPatterns['강사'] = (wrongPatterns['강사'] || 0) + 1;
    if (title.includes('보육')) wrongPatterns['보육'] = (wrongPatterns['보육'] || 0) + 1;
    if (title.includes('전담사')) wrongPatterns['전담사'] = (wrongPatterns['전담사'] || 0) + 1;
    if (title.includes('시설') || title.includes('관리')) wrongPatterns['시설/관리'] = (wrongPatterns['시설/관리'] || 0) + 1;
    if (title.includes('지킴이') || title.includes('안전')) wrongPatterns['안전/지킴이'] = (wrongPatterns['안전/지킴이'] || 0) + 1;
    if (title.includes('미화') || title.includes('경비')) wrongPatterns['미화/경비'] = (wrongPatterns['미화/경비'] || 0) + 1;
    if (title.includes('당직')) wrongPatterns['당직'] = (wrongPatterns['당직'] || 0) + 1;
    if (title.includes('운동부') || title.includes('스포츠')) wrongPatterns['운동부/스포츠'] = (wrongPatterns['운동부/스포츠'] || 0) + 1;
    if (title.includes('프로그램') || title.includes('맞춤형')) wrongPatterns['프로그램/맞춤형'] = (wrongPatterns['프로그램/맞춤형'] || 0) + 1;
  });

  Object.entries(wrongPatterns)
    .sort((a, b) => b[1] - a[1])
    .forEach(([pattern, count]) => {
      console.log(`  - ${pattern}: ${count}건`);
    });
}

factCheck().catch(console.error);
