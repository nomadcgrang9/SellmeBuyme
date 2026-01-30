/**
 * 경기도 job_postings의 tags 필드 분석
 * 태그 기반 필터링 가능성 검토
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface JobPosting {
  id: string;
  title: string;
  organization: string;
  location: string;
  tags: string[] | null;
  school_level: string | null;
}

async function analyzeGyeonggiTags() {
  console.log('=== 경기도 job_postings 태그 분석 ===\n');

  // 경기도 jobs 전체 조회
  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, school_level')
    .ilike('location', '%경기%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('DB 조회 에러:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('경기도 데이터 없음');
    return;
  }

  console.log(`총 경기도 공고 수: ${jobs.length}개\n`);

  // 1. 태그 유무 분석
  const withTags = jobs.filter(j => j.tags && j.tags.length > 0);
  const withoutTags = jobs.filter(j => !j.tags || j.tags.length === 0);

  console.log('--- 1. 태그 유무 분석 ---');
  console.log(`태그 있음: ${withTags.length}개 (${(withTags.length / jobs.length * 100).toFixed(1)}%)`);
  console.log(`태그 없음: ${withoutTags.length}개 (${(withoutTags.length / jobs.length * 100).toFixed(1)}%)\n`);

  // 2. 태그 종류 분석
  const tagCounts: Record<string, number> = {};
  withTags.forEach(job => {
    job.tags?.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]);

  console.log('--- 2. 태그 종류별 빈도 (상위 30개) ---');
  sortedTags.slice(0, 30).forEach(([tag, count], i) => {
    console.log(`${i + 1}. ${tag}: ${count}개`);
  });
  console.log();

  // 3. 교과목 관련 태그 분석
  const subjectKeywords = ['국어', '영어', '수학', '과학', '사회', '체육', '음악', '미술', '기술', '가정', '정보', '도덕', '역사', '지리', '물리', '화학', '생물'];
  const subjectTags = sortedTags.filter(([tag]) =>
    subjectKeywords.some(kw => tag.includes(kw))
  );

  console.log('--- 3. 교과목 관련 태그 ---');
  subjectTags.forEach(([tag, count]) => {
    console.log(`${tag}: ${count}개`);
  });
  console.log();

  // 4. 영어 태그가 있지만 title에 영어가 없는 케이스
  const englishTagNoTitle = withTags.filter(job => {
    const hasEnglishTag = job.tags?.some(t => t.includes('영어'));
    const titleHasEnglish = job.title?.toLowerCase().includes('영어');
    return hasEnglishTag && !titleHasEnglish;
  });

  console.log('--- 4. "영어" 태그는 있지만 title에 "영어" 없는 공고 ---');
  console.log(`총 ${englishTagNoTitle.length}개`);
  englishTagNoTitle.slice(0, 10).forEach(job => {
    console.log(`- [${job.organization}] ${job.title}`);
    console.log(`  태그: ${job.tags?.join(', ')}`);
  });
  console.log();

  // 5. 초월고등학교 케이스 확인 - 전체 DB에서 검색
  const { data: chowolData } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, school_level')
    .ilike('organization', '%초월%');

  console.log('--- 5. 초월고등학교 케이스 ---');
  if (chowolData && chowolData.length > 0) {
    chowolData.forEach(chowol => {
      console.log(`조직: ${chowol.organization}`);
      console.log(`제목: ${chowol.title}`);
      console.log(`태그: ${chowol.tags?.join(', ') || '없음'}`);
      console.log(`학교급: ${chowol.school_level}`);
      console.log(`지역: ${chowol.location}`);
      console.log();
    });
  } else {
    console.log('초월고등학교 공고 없음\n');
  }

  // 6. 방과후/돌봄 관련 태그 분석
  const afterSchoolKeywords = ['방과후', '돌봄', '늘봄', '에듀케어', '강사'];
  const afterSchoolTags = sortedTags.filter(([tag]) =>
    afterSchoolKeywords.some(kw => tag.includes(kw))
  );

  console.log('--- 6. 방과후/돌봄 관련 태그 ---');
  afterSchoolTags.forEach(([tag, count]) => {
    console.log(`${tag}: ${count}개`);
  });
  console.log();

  // 7. 태그에 과목명 있지만 분류가 안 되는 케이스 추정
  console.log('--- 7. 태그 기반 필터링 효과 예측 ---');
  const potentialMatches: Record<string, number> = {};

  subjectKeywords.forEach(subject => {
    const matchByTag = withTags.filter(job =>
      job.tags?.some(t => t.includes(subject))
    ).length;

    const matchByTitle = jobs.filter(job =>
      job.title?.includes(subject)
    ).length;

    if (matchByTag > matchByTitle) {
      potentialMatches[subject] = matchByTag - matchByTitle;
    }
  });

  Object.entries(potentialMatches)
    .sort((a, b) => b[1] - a[1])
    .forEach(([subject, diff]) => {
      console.log(`${subject}: 태그로 +${diff}건 추가 매칭 가능`);
    });

  console.log('\n=== 분석 완료 ===');
}

analyzeGyeonggiTags().catch(console.error);
