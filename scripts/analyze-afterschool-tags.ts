/**
 * 방과후/돌봄 공고 태그 분석
 * 경기도 전체 DB에서 방과후/돌봄 카테고리의 태그 분포 파악
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { classifyJob } from '../src/lib/utils/jobClassifier';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeAfterSchoolTags() {
  console.log('==============================================');
  console.log('   방과후/돌봄 공고 태그 분석 (경기도)');
  console.log('==============================================\n');

  // 경기도 공고 전체 가져오기
  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, school_level')
    .or('location.ilike.%경기%,location.ilike.%성남%,location.ilike.%용인%,location.ilike.%수원%,location.ilike.%화성%,location.ilike.%안양%,location.ilike.%평택%,location.ilike.%고양%,location.ilike.%의정부%,location.ilike.%부천%,location.ilike.%시흥%,location.ilike.%광명%,location.ilike.%안산%,location.ilike.%군포%,location.ilike.%파주%,location.ilike.%양주%,location.ilike.%구리%,location.ilike.%남양주%,location.ilike.%하남%,location.ilike.%김포%,location.ilike.%광주%,location.ilike.%이천%,location.ilike.%양평%,location.ilike.%오산%,location.ilike.%동두천%,location.ilike.%여주%,location.ilike.%포천%,location.ilike.%가평%,location.ilike.%연천%')
    .order('created_at', { ascending: false })
    .limit(2000);

  if (!allJobs) {
    console.log('데이터 없음');
    return;
  }

  console.log(`경기도 전체 공고: ${allJobs.length}건\n`);

  // 방과후/돌봄으로 분류된 공고 필터
  const afterSchoolJobs = allJobs.filter(job => classifyJob(job) === '방과후/돌봄');
  console.log(`방과후/돌봄 분류: ${afterSchoolJobs.length}건\n`);

  // 1. 태그 빈도 분석
  const tagCounts: Record<string, number> = {};
  const titleKeywords: Record<string, number> = {};

  afterSchoolJobs.forEach(job => {
    // 태그 수집
    (job.tags || []).forEach(tag => {
      const normalizedTag = tag.toLowerCase().trim();
      tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
    });

    // 타이틀에서 키워드 추출
    const title = job.title || '';
    const keywords = title.split(/[\s,()（）[\]【】·\-_]+/).filter(k => k.length > 1);
    keywords.forEach(kw => {
      const normalized = kw.toLowerCase().trim();
      if (normalized.length >= 2) {
        titleKeywords[normalized] = (titleKeywords[normalized] || 0) + 1;
      }
    });
  });

  // 2. 태그 빈도순 정렬
  console.log('=== 1. 태그 빈도 TOP 50 ===');
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  sortedTags.forEach(([tag, count], i) => {
    console.log(`${String(i + 1).padStart(2)}. "${tag}": ${count}건`);
  });

  // 3. 타이틀 키워드 빈도
  console.log('\n\n=== 2. 타이틀 키워드 TOP 30 ===');
  const sortedKeywords = Object.entries(titleKeywords)
    .filter(([kw]) => !['기간제', '계약제', '교원', '교사', '채용', '공고', '초등', '학교'].includes(kw))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  sortedKeywords.forEach(([kw, count], i) => {
    console.log(`${String(i + 1).padStart(2)}. "${kw}": ${count}건`);
  });

  // 4. 현재 2차 필터 카테고리별 매칭 분석
  console.log('\n\n=== 3. 현재 2차 필터 커버리지 분석 ===');
  const currentCategories = {
    '체육': ['체육', '스포츠', '축구', '농구', '배드민턴', '태권도', '수영', '놀이체육'],
    '음악': ['음악', '피아노', '바이올린', '기타연주', '합창', '밴드', '우쿨렐레'],
    '미술': ['미술', '그림', '도예', '공예', '드로잉'],
    '무용': ['무용', '발레', '댄스'],
    '요리': ['요리', '조리', '베이킹', '제과', '제빵'],
    '외국어': ['영어', '중국어', '일본어', '외국어'],
    '코딩/STEM': ['코딩', 'sw', '로봇', '드론', 'stem', '3d', '과학실험', '프로그래밍'],
    '돌봄/늘봄': ['돌봄', '늘봄', '에듀케어', '방과후과정', '방과후'],
  };

  let coveredCount = 0;
  let uncoveredJobs: typeof afterSchoolJobs = [];

  afterSchoolJobs.forEach(job => {
    const tags = (job.tags || []).map(t => t.toLowerCase()).join(' ');
    const title = (job.title || '').toLowerCase();
    const combined = tags + ' ' + title;

    let matched = false;
    for (const [, keywords] of Object.entries(currentCategories)) {
      if (keywords.some(kw => combined.includes(kw))) {
        matched = true;
        break;
      }
    }

    if (matched) {
      coveredCount++;
    } else {
      uncoveredJobs.push(job);
    }
  });

  console.log(`현재 2차 필터로 커버되는 공고: ${coveredCount}/${afterSchoolJobs.length}건 (${Math.round(coveredCount / afterSchoolJobs.length * 100)}%)`);
  console.log(`커버되지 않는 공고: ${uncoveredJobs.length}건`);

  // 5. 커버되지 않는 공고 샘플
  console.log('\n\n=== 4. 커버되지 않는 공고 (전체) ===');
  uncoveredJobs.forEach((job, i) => {
    console.log(`${i + 1}. [${job.organization}] ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
  });

  // 6. 고유 태그 수
  console.log('\n\n=== 5. 태그 다양성 분석 ===');
  console.log(`총 고유 태그 수: ${Object.keys(tagCounts).length}개`);
  console.log(`1회만 등장하는 태그: ${Object.values(tagCounts).filter(c => c === 1).length}개`);
  console.log(`2~5회 등장하는 태그: ${Object.values(tagCounts).filter(c => c >= 2 && c <= 5).length}개`);
  console.log(`6회 이상 등장하는 태그: ${Object.values(tagCounts).filter(c => c >= 6).length}개`);

  // 7. 롱테일 태그 샘플
  console.log('\n\n=== 6. 롱테일 태그 샘플 (1~2회 등장) ===');
  const longTailTags = Object.entries(tagCounts)
    .filter(([, count]) => count <= 2)
    .slice(0, 50);

  longTailTags.forEach(([tag, count]) => {
    console.log(`  "${tag}": ${count}건`);
  });

  // 8. 카테고리별 상세 분석
  console.log('\n\n=== 7. 카테고리별 매칭 상세 ===');
  for (const [category, keywords] of Object.entries(currentCategories)) {
    const matchedJobs = afterSchoolJobs.filter(job => {
      const combined = ((job.tags || []).join(' ') + ' ' + (job.title || '')).toLowerCase();
      return keywords.some(kw => combined.includes(kw));
    });
    console.log(`${category}: ${matchedJobs.length}건`);
  }

  // 9. 검색 기반 UX 시뮬레이션
  console.log('\n\n=== 8. 검색 키워드 제안 (태그 + 타이틀) ===');
  const allKeywords: Record<string, number> = { ...tagCounts };

  // 타이틀 키워드 중 의미있는 것만 추가
  const meaningfulTitleKws = Object.entries(titleKeywords)
    .filter(([kw]) =>
      !['기간제', '계약제', '교원', '교사', '채용', '공고', '초등', '학교', '외부강사', '강사', '개인위탁'].includes(kw) &&
      kw.length >= 2
    );

  meaningfulTitleKws.forEach(([kw, count]) => {
    allKeywords[kw] = (allKeywords[kw] || 0) + count;
  });

  const searchSuggestions = Object.entries(allKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  console.log('추천 검색 키워드 (빈도순):');
  searchSuggestions.forEach(([kw, count], i) => {
    console.log(`${String(i + 1).padStart(2)}. "${kw}": ${count}건`);
  });

  console.log('\n==============================================');
  console.log('              분석 완료');
  console.log('==============================================');
}

analyzeAfterSchoolTags().catch(console.error);
