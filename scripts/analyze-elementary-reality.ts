/**
 * 초등담임 공고 실태 분석
 * 경기도 전체 DB에서 초등담임/초등교사 공고가 실제로 존재하는지 철저히 분석
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeElementaryReality() {
  console.log('=== 초등담임 공고 실태 분석 (경기도 전체) ===\n');

  // 1. 경기도 초등학교 공고 전체 조회
  const { data: allGyeonggi, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, school_level, created_at')
    .ilike('location', '%경기%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DB 조회 에러:', error);
    return;
  }

  console.log(`=== 1. 경기도 전체 공고 현황 ===`);
  console.log(`총 공고 수: ${allGyeonggi?.length || 0}개\n`);

  // 2. 초등학교 관련 공고만 필터링
  const elementaryJobs = allGyeonggi?.filter(job => {
    const org = (job.organization || '').toLowerCase();
    const sl = (job.school_level || '').toLowerCase();
    return org.includes('초등') || org.endsWith('초') || sl.includes('초등');
  }) || [];

  console.log(`=== 2. 초등학교 공고 현황 ===`);
  console.log(`초등학교 관련 공고: ${elementaryJobs.length}개\n`);

  // 3. 초등 공고의 제목 키워드 분석
  console.log(`=== 3. 초등학교 공고 제목 키워드 분석 ===`);
  const titleKeywords: Record<string, number> = {};
  const importantKeywords = [
    '담임', '기간제', '계약제', '교사', '교원', '전담',
    '강사', '방과후', '돌봄', '늘봄', '실무', '보육',
    '영어', '체육', '음악', '미술', '과학', '수학',
    '시설', '경비', '미화', '당직', '지킴이', '튜터',
    '협력', '보조', '지원', '전담사', '안전', '봉사'
  ];

  elementaryJobs.forEach(job => {
    const title = job.title || '';
    importantKeywords.forEach(kw => {
      if (title.includes(kw)) {
        titleKeywords[kw] = (titleKeywords[kw] || 0) + 1;
      }
    });
  });

  Object.entries(titleKeywords)
    .sort((a, b) => b[1] - a[1])
    .forEach(([kw, count]) => {
      const percentage = ((count / elementaryJobs.length) * 100).toFixed(1);
      console.log(`  ${kw}: ${count}건 (${percentage}%)`);
    });

  // 4. 초등 공고의 태그 분석
  console.log(`\n=== 4. 초등학교 공고 태그 분석 ===`);
  const tagCounts: Record<string, number> = {};
  let jobsWithTags = 0;
  let jobsWithoutTags = 0;

  elementaryJobs.forEach(job => {
    if (job.tags && job.tags.length > 0) {
      jobsWithTags++;
      job.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    } else {
      jobsWithoutTags++;
    }
  });

  console.log(`태그 있는 공고: ${jobsWithTags}건 (${((jobsWithTags / elementaryJobs.length) * 100).toFixed(1)}%)`);
  console.log(`태그 없는 공고: ${jobsWithoutTags}건`);
  console.log(`\n상위 30개 태그:`);

  Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([tag, count]) => {
      console.log(`  ${tag}: ${count}건`);
    });

  // 5. 핵심 질문: "담임" 관련 공고 상세 분석
  console.log(`\n=== 5. "담임" 키워드 포함 공고 상세 분석 ===`);
  const damimJobs = elementaryJobs.filter(job => {
    const title = (job.title || '').toLowerCase();
    const tags = (job.tags || []).map(t => t.toLowerCase());
    return title.includes('담임') || tags.some(t => t.includes('담임'));
  });

  console.log(`"담임" 포함 공고: ${damimJobs.length}건\n`);
  damimJobs.slice(0, 20).forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}]`);
    console.log(`   제목: ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
    console.log(`   등록일: ${job.created_at?.slice(0, 10)}`);
    console.log();
  });

  // 6. "기간제교사" 또는 "계약제교원" 공고
  console.log(`=== 6. "기간제/계약제" 교사/교원 공고 ===`);
  const contractJobs = elementaryJobs.filter(job => {
    const title = (job.title || '').toLowerCase();
    return (title.includes('기간제') || title.includes('계약제')) &&
           (title.includes('교사') || title.includes('교원'));
  });

  console.log(`기간제/계약제 교사/교원: ${contractJobs.length}건\n`);
  contractJobs.slice(0, 15).forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}]`);
    console.log(`   제목: ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
    console.log();
  });

  // 7. 진짜 초등담임으로 보이는 공고 (담임 O, 강사/방과후/돌봄/실무 X)
  console.log(`=== 7. 진짜 초등담임 후보 공고 ===`);
  const realDamimCandidates = elementaryJobs.filter(job => {
    const title = (job.title || '').toLowerCase();
    const tags = (job.tags || []).map(t => t.toLowerCase());
    const combined = title + ' ' + tags.join(' ');

    // 담임 또는 기간제교사/계약제교원 포함
    const hasDamim = combined.includes('담임') ||
      ((combined.includes('기간제') || combined.includes('계약제')) &&
       (combined.includes('교사') || combined.includes('교원')));

    // 방과후/돌봄/강사/실무 등 제외 키워드
    const excludeKeywords = ['강사', '방과후', '돌봄', '늘봄', '실무', '보육', '전담사',
                            '지킴이', '경비', '미화', '시설', '당직', '안전', '보조',
                            '협력', '튜터', '봉사', '영양사'];
    const hasExclude = excludeKeywords.some(kw => title.includes(kw));

    return hasDamim && !hasExclude;
  });

  console.log(`진짜 초등담임 후보: ${realDamimCandidates.length}건\n`);
  realDamimCandidates.forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}]`);
    console.log(`   제목: ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
    console.log(`   등록일: ${job.created_at?.slice(0, 10)}`);
    console.log();
  });

  // 8. 태그에 "담임" 포함된 공고
  console.log(`=== 8. 태그에 "담임" 포함된 공고 ===`);
  const tagDamimJobs = elementaryJobs.filter(job => {
    const tags = (job.tags || []).map(t => t.toLowerCase());
    return tags.some(t => t.includes('담임'));
  });

  console.log(`태그에 "담임" 포함: ${tagDamimJobs.length}건\n`);
  tagDamimJobs.slice(0, 15).forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ')}`);
  });

  // 9. 전체 현황 요약
  console.log(`\n\n========================================`);
  console.log(`         최종 분석 결과 요약`);
  console.log(`========================================`);
  console.log(`경기도 전체 공고: ${allGyeonggi?.length || 0}건`);
  console.log(`초등학교 관련 공고: ${elementaryJobs.length}건`);
  console.log(`├─ "담임" 포함 공고: ${damimJobs.length}건`);
  console.log(`├─ 기간제/계약제 교사/교원: ${contractJobs.length}건`);
  console.log(`├─ 태그에 "담임": ${tagDamimJobs.length}건`);
  console.log(`└─ 진짜 초등담임 후보: ${realDamimCandidates.length}건`);

  console.log(`\n[결론]`);
  if (realDamimCandidates.length === 0) {
    console.log(`❌ 경기도에 현재 초등담임 공고가 0건입니다.`);
    console.log(`   가능한 원인:`);
    console.log(`   1. 실제로 초등담임 모집 비수기`);
    console.log(`   2. 크롤러가 초등담임 공고를 수집하지 못함`);
    console.log(`   3. 초등담임 공고가 다른 형태로 저장됨`);
  } else {
    console.log(`✅ 초등담임 후보 공고 ${realDamimCandidates.length}건 발견`);
    console.log(`   필터링 로직 점검 필요`);
  }
}

analyzeElementaryReality().catch(console.error);
