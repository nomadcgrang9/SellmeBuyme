/**
 * 전국 방과후/돌봄 공고 태그 분석
 * 가장 많이 등장하는 태그 TOP 10 추출
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { classifyJob } from '../src/lib/utils/jobClassifier';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeNationwide() {
  console.log('==============================================');
  console.log('   전국 방과후/돌봄 태그 분석');
  console.log('==============================================\n');

  // 전국 공고 전체 가져오기 (페이지네이션으로 전체 조회)
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

  const count = allJobs.length;

  if (!allJobs) {
    console.log('데이터 없음');
    return;
  }

  console.log(`전체 공고 수: ${count}건`);
  console.log(`조회된 공고: ${allJobs.length}건\n`);

  // 태그 배열 정리 (null 값 제거)
  allJobs.forEach(job => {
    if (job.tags) {
      job.tags = job.tags.filter((t: string | null) => t !== null && t !== undefined);
    }
  });

  // 방과후/돌봄으로 분류된 공고 필터
  const afterSchoolJobs = allJobs.filter(job => classifyJob(job) === '방과후/돌봄');
  console.log(`방과후/돌봄 분류: ${afterSchoolJobs.length}건\n`);

  // 태그 빈도 분석
  const tagCounts: Record<string, number> = {};

  afterSchoolJobs.forEach(job => {
    (job.tags || []).forEach(tag => {
      // 태그 정규화 (소문자, 공백 제거)
      const normalizedTag = tag.toLowerCase().trim();
      // 의미 없는 태그 제외
      if (normalizedTag &&
          normalizedTag !== '초등' &&
          normalizedTag !== '중등' &&
          normalizedTag !== '고등학교' &&
          normalizedTag !== '강사' &&
          normalizedTag !== '방과후' &&
          normalizedTag.length >= 2) {
        tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
      }
    });
  });

  // 빈도순 정렬
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]);

  console.log('=== 방과후/돌봄 태그 빈도 TOP 30 ===\n');
  sortedTags.slice(0, 30).forEach(([tag, count], i) => {
    const percent = ((count / afterSchoolJobs.length) * 100).toFixed(1);
    console.log(`${String(i + 1).padStart(2)}. "${tag}": ${count}건 (${percent}%)`);
  });

  // 타이틀에서 키워드 추출
  console.log('\n\n=== 타이틀 키워드 빈도 TOP 20 ===\n');
  const titleKeywords: Record<string, number> = {};

  afterSchoolJobs.forEach(job => {
    const title = job.title || '';
    // 의미 있는 키워드만 추출
    const keywords = title.match(/[가-힣a-zA-Z]{2,}/g) || [];
    keywords.forEach(kw => {
      const normalized = kw.toLowerCase();
      // 불용어 제외
      if (!['기간제', '계약제', '교원', '교사', '채용', '공고', '초등', '학교',
            '외부강사', '강사', '개인위탁', '프로그램', '맞춤형', '위탁'].includes(normalized)) {
        titleKeywords[normalized] = (titleKeywords[normalized] || 0) + 1;
      }
    });
  });

  const sortedTitleKws = Object.entries(titleKeywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  sortedTitleKws.forEach(([kw, count], i) => {
    console.log(`${String(i + 1).padStart(2)}. "${kw}": ${count}건`);
  });

  // 태그 + 타이틀 종합
  console.log('\n\n=== 종합 (태그 + 타이틀 키워드) TOP 15 ===\n');
  const combined: Record<string, number> = { ...tagCounts };

  // 타이틀 키워드 중 태그에 없는 것만 추가
  sortedTitleKws.forEach(([kw, count]) => {
    if (!combined[kw]) {
      combined[kw] = count;
    } else {
      combined[kw] += count;
    }
  });

  const sortedCombined = Object.entries(combined)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  sortedCombined.forEach(([kw, count], i) => {
    console.log(`${String(i + 1).padStart(2)}. "${kw}": ${count}건`);
  });

  // 고유 태그 수
  console.log('\n\n=== 태그 다양성 ===');
  console.log(`총 고유 태그 수: ${Object.keys(tagCounts).length}개`);
  console.log(`1회만 등장: ${Object.values(tagCounts).filter(c => c === 1).length}개`);
  console.log(`2~5회 등장: ${Object.values(tagCounts).filter(c => c >= 2 && c <= 5).length}개`);
  console.log(`6회 이상 등장: ${Object.values(tagCounts).filter(c => c >= 6).length}개`);

  console.log('\n==============================================');
  console.log('   분석 완료');
  console.log('==============================================');
}

analyzeNationwide().catch(console.error);
