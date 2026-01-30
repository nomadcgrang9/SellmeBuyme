/**
 * 초등담임 필터 분류 문제 분석
 * 경기도 초등 관련 공고의 분류 현황 파악
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

async function analyzeElementaryFilter() {
  console.log('=== 초등담임 필터 분류 문제 분석 ===\n');

  // 경기도 초등 관련 공고 전체 조회
  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, school_level')
    .or('location.ilike.%경기%,organization.ilike.%초등%,organization.like.%초')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DB 조회 에러:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('데이터 없음');
    return;
  }

  // 초등담임으로 분류되는 공고만 필터링
  const elementaryJobs = jobs.filter(job => {
    const category = classifyJob({
      title: job.title,
      school_level: job.school_level,
      organization: job.organization
    });
    return category === '초등담임';
  });

  console.log(`총 조회된 공고: ${jobs.length}개`);
  console.log(`초등담임으로 분류된 공고: ${elementaryJobs.length}개\n`);

  // 1. 초등담임으로 분류된 공고 상세 분석
  console.log('--- 1. 초등담임으로 분류된 공고 목록 ---');
  elementaryJobs.forEach((job, i) => {
    console.log(`\n${i + 1}. [${job.organization}]`);
    console.log(`   제목: ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
    console.log(`   학교급: ${job.school_level || '없음'}`);
  });

  // 2. 문제가 될 수 있는 키워드 패턴 분석
  console.log('\n\n--- 2. 초등담임으로 분류된 공고의 제목 키워드 분석 ---');
  const titleKeywords: Record<string, number> = {};

  elementaryJobs.forEach(job => {
    const title = job.title || '';
    // 주요 키워드 추출
    const keywords = ['보육', '전담', '담임', '기간제', '계약제', '교사', '교원', '강사', '지원', '돌봄', '늘봄'];
    keywords.forEach(kw => {
      if (title.includes(kw)) {
        titleKeywords[kw] = (titleKeywords[kw] || 0) + 1;
      }
    });
  });

  Object.entries(titleKeywords)
    .sort((a, b) => b[1] - a[1])
    .forEach(([kw, count]) => {
      console.log(`${kw}: ${count}건`);
    });

  // 3. 잘못 분류된 것으로 보이는 공고 식별
  console.log('\n\n--- 3. 잘못 분류 의심 공고 (초등담임 아닌 것 같은 공고) ---');
  const suspiciousKeywords = ['보육', '전담사', '지원', '강사', '돌봄', '늘봄', '방과후'];

  const suspiciousJobs = elementaryJobs.filter(job => {
    const title = (job.title || '').toLowerCase();
    return suspiciousKeywords.some(kw => title.includes(kw)) &&
      !title.includes('담임') && !title.includes('교사') && !title.includes('교원');
  });

  if (suspiciousJobs.length === 0) {
    console.log('의심 공고 없음');
  } else {
    suspiciousJobs.forEach((job, i) => {
      console.log(`\n${i + 1}. [${job.organization}]`);
      console.log(`   제목: ${job.title}`);
      console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
      console.log(`   → 문제: 제목에 '담임/교사/교원' 없이 '${suspiciousKeywords.filter(kw => job.title?.includes(kw)).join(', ')}' 포함`);
    });
  }

  // 4. 판교초 사례 상세 분석
  console.log('\n\n--- 4. 판교초 사례 상세 분석 ---');
  const pangyo = jobs.filter(j => j.organization?.includes('판교'));
  if (pangyo.length > 0) {
    pangyo.forEach(job => {
      const category = classifyJob({
        title: job.title,
        school_level: job.school_level,
        organization: job.organization
      });
      console.log(`조직: ${job.organization}`);
      console.log(`제목: ${job.title}`);
      console.log(`태그: ${job.tags?.join(', ') || '없음'}`);
      console.log(`학교급: ${job.school_level}`);
      console.log(`현재 분류: ${category}`);
      console.log(`분류 이유: organization에 '초'가 포함되어 초등으로 판별 → 제목에 방과후/돌봄/실무 등 키워드 없음 → 초등담임으로 fallback`);
      console.log();
    });
  } else {
    console.log('판교초 공고 없음');
  }

  // 5. 태그 기반 분류 가능성 분석
  console.log('\n--- 5. 태그 기반 분류 가능성 ---');
  const tagCategories: Record<string, string[]> = {
    '담임 관련': ['담임', '학급담임', '초등담임', '초등학급담임'],
    '보육/돌봄 관련': ['보육', '돌봄', '늘봄', '방과후', '에듀케어'],
    '교과 관련': ['국어', '영어', '수학', '과학', '사회', '체육', '음악', '미술'],
    '지원직 관련': ['전담사', '지원', '실무', '보조'],
  };

  console.log('\n초등담임 분류 공고의 태그 분포:');
  Object.entries(tagCategories).forEach(([category, keywords]) => {
    const matchCount = elementaryJobs.filter(job =>
      job.tags?.some(tag => keywords.some(kw => tag.includes(kw)))
    ).length;
    console.log(`${category}: ${matchCount}건`);
  });

  console.log('\n=== 분석 완료 ===');
  console.log('\n결론:');
  console.log('- "초등보육전담사"는 초등담임이 아닌 방과후/돌봄 또는 행정·교육지원으로 분류되어야 함');
  console.log('- 현재 로직: 초등 학교 + 특정 키워드 없음 → 초등담임 fallback');
  console.log('- 개선안: "보육", "전담사", "지원" 등 키워드를 방과후/돌봄 또는 행정·교육지원으로 분류');
}

analyzeElementaryFilter().catch(console.error);
