/**
 * 전체 DB 현황 분석
 * 지역별, 학교급별 공고 분포 파악
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeDBOverview() {
  console.log('=== 전체 DB 현황 분석 ===\n');

  // 1. 전체 공고 수
  const { count: totalCount } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true });

  console.log(`=== 1. 전체 공고 수: ${totalCount}건 ===\n`);

  // 2. 지역별 분포
  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('location, organization, school_level, title, tags, created_at')
    .order('created_at', { ascending: false });

  const regionCounts: Record<string, number> = {};
  const regions = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
                   '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

  allJobs?.forEach(job => {
    const loc = job.location || '';
    let found = false;
    for (const region of regions) {
      if (loc.includes(region)) {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      regionCounts['기타'] = (regionCounts['기타'] || 0) + 1;
    }
  });

  console.log(`=== 2. 지역별 분포 ===`);
  Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([region, count]) => {
      console.log(`  ${region}: ${count}건`);
    });

  // 3. 학교급별 분포
  console.log(`\n=== 3. 학교급별 분포 ===`);
  const schoolLevelCounts: Record<string, number> = {};
  allJobs?.forEach(job => {
    const sl = job.school_level || '없음';
    schoolLevelCounts[sl] = (schoolLevelCounts[sl] || 0) + 1;
  });

  Object.entries(schoolLevelCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([sl, count]) => {
      console.log(`  ${sl}: ${count}건`);
    });

  // 4. 초등학교 공고 전체 (지역 무관)
  console.log(`\n=== 4. 전국 초등학교 공고 ===`);
  const elementaryJobs = allJobs?.filter(job => {
    const org = (job.organization || '').toLowerCase();
    const sl = (job.school_level || '').toLowerCase();
    return org.includes('초등') || org.endsWith('초') || sl.includes('초등');
  }) || [];

  console.log(`전국 초등학교 공고: ${elementaryJobs.length}건`);

  // 5. 전국 초등담임 관련 공고
  const elementaryDamimJobs = elementaryJobs.filter(job => {
    const title = (job.title || '').toLowerCase();
    const tags = (job.tags || []).map(t => t.toLowerCase()).join(' ');
    const combined = title + ' ' + tags;

    return combined.includes('담임') ||
      ((combined.includes('기간제') || combined.includes('계약제')) &&
       (combined.includes('교사') || combined.includes('교원')));
  });

  console.log(`전국 초등담임 관련 공고: ${elementaryDamimJobs.length}건\n`);

  elementaryDamimJobs.slice(0, 30).forEach((job, i) => {
    console.log(`${i + 1}. [${job.location}] ${job.organization}`);
    console.log(`   제목: ${job.title}`);
    console.log(`   태그: ${job.tags?.join(', ') || '없음'}`);
    console.log(`   등록일: ${job.created_at?.slice(0, 10)}`);
    console.log();
  });

  // 6. 최근 등록된 공고 날짜 분포
  console.log(`\n=== 5. 최근 공고 등록 날짜 분포 (최근 30건) ===`);
  const recentJobs = allJobs?.slice(0, 30) || [];
  recentJobs.forEach((job, i) => {
    console.log(`${i + 1}. ${job.created_at?.slice(0, 10)} [${job.organization}] ${job.title?.slice(0, 30)}...`);
  });

  // 7. 크롤러 상태 확인
  console.log(`\n=== 6. crawl_boards 상태 확인 ===`);
  const { data: boards } = await supabase
    .from('crawl_boards')
    .select('board_name, region, last_crawled_at, error_count')
    .order('last_crawled_at', { ascending: false });

  boards?.forEach(board => {
    const lastCrawled = board.last_crawled_at ? new Date(board.last_crawled_at).toISOString().slice(0, 16) : '없음';
    console.log(`  ${board.region || board.board_name}: ${lastCrawled} (에러: ${board.error_count || 0})`);
  });

  console.log(`\n========================================`);
  console.log(`         결론`);
  console.log(`========================================`);
  console.log(`총 공고: ${totalCount}건`);
  console.log(`전국 초등학교: ${elementaryJobs.length}건`);
  console.log(`전국 초등담임 관련: ${elementaryDamimJobs.length}건`);
  console.log(`경기도 공고: ${regionCounts['경기'] || 0}건`);
}

analyzeDBOverview().catch(console.error);
