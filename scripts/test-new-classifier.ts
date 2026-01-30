/**
 * 새 classifyJob 로직 테스트
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PrimaryCategory = '유치원' | '초등담임' | '교과과목' | '비교과' | '특수' | '방과후/돌봄' | '행정·교육지원' | '기타';

interface JobLike {
  title?: string | null;
  school_level?: string | null;
  organization?: string | null;
  tags?: string[] | null;
}

// 새 classifyJob 로직 (v2)
function classifyJobV2(job: JobLike): PrimaryCategory {
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

  // P4/P6/P7: 초등 분기 (v2: 키워드 확장 + fallback 수정)
  const isElementary = combined.includes('초등') || org.endsWith('초');
  if (isElementary) {
    const tagsLower = (job.tags || []).map(t => t.toLowerCase()).join(' ');

    // 1. 방과후/돌봄 (키워드 확장)
    if (
      tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄') ||
      tl.includes('에듀케어') || tl.includes('외부강사') || tl.includes('개인위탁') ||
      (tl.includes('강사') && !tl.includes('교사') && !tl.includes('교원')) ||
      tl.includes('프로그램') || tl.includes('맞춤형') ||
      tl.includes('스포츠') || tl.includes('운동부') ||
      tl.includes('특기적성') || tl.includes('동아리') ||
      tl.includes('보육')
    ) {
      return '방과후/돌봄';
    }

    // 2. 행정·교육지원 (키워드 확장)
    if (
      tl.includes('실무') || tl.includes('공무직') || tl.includes('봉사') ||
      tl.includes('지킴이') || tl.includes('튜터') || tl.includes('협력강사') ||
      tl.includes('안전') || tl.includes('보조') || tl.includes('영양사') || tl.includes('배움터') ||
      tl.includes('전담사') || tl.includes('당직') ||
      tl.includes('미화') || tl.includes('경비') ||
      tl.includes('시설') || tl.includes('관리') ||
      tl.includes('보호인력') || tl.includes('학생보호') ||
      tl.includes('조리') || tl.includes('사서')
    ) {
      return '행정·교육지원';
    }

    // 3. 초등담임 (명시적 키워드 필요)
    if (
      tl.includes('담임') ||
      (tl.includes('기간제') && (tl.includes('교사') || tl.includes('교원'))) ||
      (tl.includes('계약제') && (tl.includes('교사') || tl.includes('교원'))) ||
      tl.includes('초등교사') || tl.includes('학급담임')
    ) {
      return '초등담임';
    }

    // 4. 태그 기반 보완
    if (
      tagsLower.includes('담임') ||
      tagsLower.includes('기간제교사') ||
      tagsLower.includes('초등교사') ||
      tagsLower.includes('초등학급담임')
    ) {
      return '초등담임';
    }

    // 5. 그 외는 기타
    return '기타';
  }

  // P5: 교과과목 (중/고)
  const isSecondary = combined.includes('중학') || combined.includes('중등') || combined.includes('고등') || combined.includes('고교');
  if (isSecondary) {
    if (tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄')) return '방과후/돌봄';
    if (
      tl.includes('실무') || tl.includes('공무직') || tl.includes('봉사') ||
      tl.includes('지킴이') || tl.includes('안전') || tl.includes('보조') || tl.includes('영양사')
    ) {
      return '행정·교육지원';
    }
    return '교과과목';
  }

  // P6: 방과후/돌봄 (학교급 불명)
  if (
    tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄') ||
    tl.includes('에듀케어') || tl.includes('외부강사') || tl.includes('개인위탁') ||
    (tl.includes('예체능') && tl.includes('강사'))
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

async function testNewClassifier() {
  console.log('==============================================');
  console.log('   새 classifyJob v2 테스트');
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

  // 새 로직으로 분류
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
    const category = classifyJobV2(job);
    categories[category].push(job);
  });

  console.log('=== 새 로직 분류 결과 ===');
  Object.entries(categories).forEach(([cat, jobs]) => {
    if (jobs.length > 0) {
      console.log(`\n${cat}: ${jobs.length}건`);
    }
  });

  // 초등담임 목록
  console.log('\n\n=== "초등담임"으로 분류된 공고 (전체) ===');
  categories['초등담임'].forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
  });

  // 방과후/돌봄 샘플
  console.log('\n\n=== "방과후/돌봄"으로 분류된 공고 (상위 20개) ===');
  categories['방과후/돌봄'].slice(0, 20).forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
  });

  // 행정·교육지원 샘플
  console.log('\n\n=== "행정·교육지원"으로 분류된 공고 (상위 20개) ===');
  categories['행정·교육지원'].slice(0, 20).forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
  });

  // 기타 샘플
  console.log('\n\n=== "기타"로 분류된 공고 (전체) ===');
  categories['기타'].forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
  });

  // 최종 요약
  console.log('\n\n==============================================');
  console.log('              최종 요약');
  console.log('==============================================');
  console.log(`초등학교 전체: ${elementaryJobs.length}건`);
  console.log(`├─ 초등담임: ${categories['초등담임'].length}건`);
  console.log(`├─ 방과후/돌봄: ${categories['방과후/돌봄'].length}건`);
  console.log(`├─ 행정·교육지원: ${categories['행정·교육지원'].length}건`);
  console.log(`├─ 비교과: ${categories['비교과'].length}건`);
  console.log(`├─ 특수: ${categories['특수'].length}건`);
  console.log(`└─ 기타: ${categories['기타'].length}건`);
}

testNewClassifier().catch(console.error);
