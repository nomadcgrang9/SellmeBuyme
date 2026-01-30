/**
 * 방과후/돌봄 최적 카테고리 분석
 * 5개 카테고리로 최대 커버리지 달성하기 위한 그룹핑 분석
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { classifyJob } from '../src/lib/utils/jobClassifier';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 카테고리 그룹 정의 (테스트용)
const CATEGORY_GROUPS: Record<string, string[]> = {
  // 체육 계열
  '체육': [
    '체육', '놀이체육', '스포츠', '축구', '농구', '배드민턴', '배드민턴', '베드민턴',
    '태권도', '수영', '체조', '육상', '배구', '야구', '탁구', '줄넘기', '음악줄넘기',
    '체육놀이', '생활체육', '키성장운동', '뉴스포츠', '소프트테니스', '양궁',
  ],
  // 음악 계열
  '음악': [
    '음악', '피아노', '바이올린', '기타', '우쿨렐레', '플룻', '플루트', '리코더',
    '오카리나', '합창', '밴드', '난타', '사물놀이', '국악', '장구', '소고', '탈춤',
    '뮤지컬', '성악', '드럼', '현악합주',
  ],
  // 미술/공예 계열
  '미술': [
    '미술', '그림', '도예', '공예', '드로잉', '창의미술', '일러스트', '웹툰',
    '애니메이션', '토탈공예', '종이접기', '클레이', '캘리그라피', '디자인',
  ],
  // 영어/외국어 계열
  '영어': [
    '영어', '영어회화', '중국어', '일본어', '외국어', '한국어', '스페인어',
    '영어뮤지컬', '영어동화', '파닉스',
  ],
  // 코딩/과학 계열
  '코딩': [
    '코딩', '컴퓨터', 'sw', '로봇', '드론', 'stem', '3d', '과학', '과학실험',
    '프로그래밍', '스마트레고', '레고', '발명', '창의과학', 'ai', '인공지능',
  ],
  // 독서/학습 계열
  '독서': [
    '책놀이', '독서', '독서논술', '논술', '한자', '수학', '놀이수학', '주산암산',
    '바둑', '보드게임', '교육', '학습',
  ],
  // 무용/댄스 계열
  '댄스': [
    '방송댄스', '무용', '발레', '댄스', '케이팝', 'k-pop', '치어리딩',
  ],
  // 요리 계열
  '요리': [
    '요리', '조리', '베이킹', '제과', '제빵', '쿠킹클래스', '쿠킹',
  ],
  // 돌봄 계열
  '돌봄': [
    '돌봄', '늘봄', '에듀케어', '방과후과정', '방과후', '돌봄교실', '보육',
    '초등돌봄교실', '늘봄학교',
  ],
};

async function analyzeOptimalCategories() {
  console.log('==============================================');
  console.log('   최적 카테고리 그룹핑 분석');
  console.log('==============================================\n');

  // 전체 데이터 로드
  let allJobs: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('job_postings')
      .select('id, title, organization, location, tags, school_level')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error || !data || data.length === 0) break;
    allJobs = allJobs.concat(data);
    page++;
    if (data.length < pageSize) break;
  }

  // 태그 정리
  allJobs.forEach(job => {
    if (job.tags) {
      job.tags = job.tags.filter((t: string | null) => t !== null && t !== undefined);
    }
  });

  // 방과후/돌봄 필터
  const afterSchoolJobs = allJobs.filter(job => classifyJob(job) === '방과후/돌봄');
  console.log(`방과후/돌봄 공고: ${afterSchoolJobs.length}건\n`);

  // 전체 태그 수집
  const allTags: Record<string, number> = {};
  afterSchoolJobs.forEach(job => {
    (job.tags || []).forEach((tag: string) => {
      const normalized = tag.toLowerCase().trim();
      if (normalized && normalized.length >= 2) {
        allTags[normalized] = (allTags[normalized] || 0) + 1;
      }
    });
    // 타이틀에서도 키워드 추출
    const title = (job.title || '').toLowerCase();
    Object.entries(CATEGORY_GROUPS).forEach(([, keywords]) => {
      keywords.forEach(kw => {
        if (title.includes(kw.toLowerCase())) {
          allTags[kw.toLowerCase()] = (allTags[kw.toLowerCase()] || 0) + 1;
        }
      });
    });
  });

  // 카테고리별 커버리지 계산
  console.log('=== 카테고리별 커버리지 분석 ===\n');

  const categoryStats: Record<string, { count: number; matchedJobs: Set<string> }> = {};

  Object.entries(CATEGORY_GROUPS).forEach(([category, keywords]) => {
    const matchedJobs = new Set<string>();

    afterSchoolJobs.forEach(job => {
      const tags = (job.tags || []).map((t: string) => t.toLowerCase()).join(' ');
      const title = (job.title || '').toLowerCase();
      const combined = tags + ' ' + title;

      if (keywords.some(kw => combined.includes(kw.toLowerCase()))) {
        matchedJobs.add(job.id);
      }
    });

    categoryStats[category] = {
      count: matchedJobs.size,
      matchedJobs,
    };

    const percent = ((matchedJobs.size / afterSchoolJobs.length) * 100).toFixed(1);
    console.log(`${category}: ${matchedJobs.size}건 (${percent}%)`);
    console.log(`  키워드: ${keywords.slice(0, 10).join(', ')}...`);
    console.log();
  });

  // 5개 조합 최적화 분석
  console.log('\n=== 5개 카테고리 조합 시뮬레이션 ===\n');

  const categories = Object.keys(categoryStats);
  const combinations: { combo: string[]; coverage: number; uniqueJobs: number }[] = [];

  // 5개 조합 생성 (C(9,5) = 126가지)
  function getCombinations(arr: string[], k: number): string[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];
    const [first, ...rest] = arr;
    const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
    const withoutFirst = getCombinations(rest, k);
    return [...withFirst, ...withoutFirst];
  }

  const allCombos = getCombinations(categories, 5);

  allCombos.forEach(combo => {
    const uniqueJobs = new Set<string>();
    combo.forEach(cat => {
      categoryStats[cat].matchedJobs.forEach(id => uniqueJobs.add(id));
    });
    combinations.push({
      combo,
      coverage: (uniqueJobs.size / afterSchoolJobs.length) * 100,
      uniqueJobs: uniqueJobs.size,
    });
  });

  // 커버리지 순 정렬
  combinations.sort((a, b) => b.coverage - a.coverage);

  console.log('상위 5개 조합:\n');
  combinations.slice(0, 5).forEach((c, i) => {
    console.log(`${i + 1}. [${c.combo.join(', ')}]`);
    console.log(`   커버리지: ${c.coverage.toFixed(1)}% (${c.uniqueJobs}/${afterSchoolJobs.length}건)\n`);
  });

  // 최적 조합 상세 분석
  const bestCombo = combinations[0];
  console.log('\n=== 최적 조합 상세 분석 ===\n');
  console.log(`선택된 5개: ${bestCombo.combo.join(', ')}`);
  console.log(`총 커버리지: ${bestCombo.coverage.toFixed(1)}%\n`);

  // 각 카테고리 기여도
  console.log('카테고리별 기여도:\n');
  bestCombo.combo.forEach(cat => {
    const stats = categoryStats[cat];
    const percent = ((stats.count / afterSchoolJobs.length) * 100).toFixed(1);
    console.log(`  ${cat}: ${stats.count}건 (${percent}%)`);
  });

  // 커버되지 않는 공고 분석
  const coveredJobs = new Set<string>();
  bestCombo.combo.forEach(cat => {
    categoryStats[cat].matchedJobs.forEach(id => coveredJobs.add(id));
  });

  const uncoveredJobs = afterSchoolJobs.filter(job => !coveredJobs.has(job.id));
  console.log(`\n커버되지 않는 공고: ${uncoveredJobs.length}건\n`);

  if (uncoveredJobs.length > 0) {
    console.log('미커버 공고 샘플 (상위 15개):');
    uncoveredJobs.slice(0, 15).forEach((job, i) => {
      console.log(`${i + 1}. [${job.organization}] ${job.title}`);
      console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
    });
  }

  // 미커버 태그 분석
  console.log('\n\n미커버 공고의 태그 빈도:');
  const uncoveredTags: Record<string, number> = {};
  uncoveredJobs.forEach(job => {
    (job.tags || []).forEach((tag: string) => {
      const normalized = tag.toLowerCase().trim();
      if (normalized && normalized.length >= 2 &&
          !['초등', '중등', '고등학교', '강사', '방과후'].includes(normalized)) {
        uncoveredTags[normalized] = (uncoveredTags[normalized] || 0) + 1;
      }
    });
  });

  Object.entries(uncoveredTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([tag, count]) => {
      console.log(`  "${tag}": ${count}건`);
    });

  console.log('\n==============================================');
  console.log('   분석 완료');
  console.log('==============================================');
}

analyzeOptimalCategories().catch(console.error);
