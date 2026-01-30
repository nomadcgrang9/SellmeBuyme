/**
 * location 필드 분석
 * 왜 경기도 공고가 5건밖에 없는지 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeLocationField() {
  console.log('=== location 필드 분석 ===\n');

  // 1. location 값 샘플 확인
  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('location, organization, title')
    .order('created_at', { ascending: false })
    .limit(1000);

  // 2. 고유 location 값들 수집
  const locationCounts: Record<string, number> = {};
  allJobs?.forEach(job => {
    const loc = job.location || '(없음)';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });

  console.log(`=== 1. 고유 location 값 분포 (상위 50개) ===`);
  Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .forEach(([loc, count]) => {
      console.log(`  "${loc}": ${count}건`);
    });

  // 3. "경기" 포함된 location 샘플
  console.log(`\n=== 2. "경기" 포함된 location 샘플 ===`);
  const gyeonggiJobs = allJobs?.filter(job => job.location?.includes('경기')) || [];
  console.log(`"경기" 포함: ${gyeonggiJobs.length}건`);
  gyeonggiJobs.slice(0, 10).forEach(job => {
    console.log(`  location: "${job.location}" / org: ${job.organization}`);
  });

  // 4. organization에 경기도 지역명 포함된 공고
  console.log(`\n=== 3. organization에 경기도 지역명 포함 (location과 비교) ===`);
  const gyeonggiCities = ['성남', '용인', '수원', '화성', '안양', '평택', '고양', '의정부', '부천', '시흥', '광명', '안산', '군포', '파주', '양주', '구리', '남양주', '하남', '김포', '광주', '이천', '양평', '오산', '동두천', '여주', '포천', '가평', '연천'];

  const orgGyeonggiJobs = allJobs?.filter(job => {
    const org = job.organization || '';
    return gyeonggiCities.some(city => org.includes(city));
  }) || [];

  console.log(`organization에 경기도 지역명 포함: ${orgGyeonggiJobs.length}건`);
  orgGyeonggiJobs.slice(0, 20).forEach(job => {
    console.log(`  org: ${job.organization}`);
    console.log(`  location: "${job.location}"`);
    console.log();
  });

  // 5. "성남" 포함된 공고 상세
  console.log(`\n=== 4. "성남" 관련 공고 상세 ===`);
  const seongnamJobs = allJobs?.filter(job => {
    const org = job.organization || '';
    const loc = job.location || '';
    return org.includes('성남') || loc.includes('성남');
  }) || [];

  console.log(`"성남" 관련: ${seongnamJobs.length}건`);
  seongnamJobs.forEach(job => {
    console.log(`  org: ${job.organization}`);
    console.log(`  location: "${job.location}"`);
    console.log(`  title: ${job.title}`);
    console.log();
  });

  // 6. location이 "경기" 형식인지 확인
  console.log(`\n=== 5. location 포맷 분석 ===`);
  const formatCounts: Record<string, number> = {
    '시군구 형식 (예: 성남시)': 0,
    '도+시군구 (예: 경기 성남)': 0,
    '구 단독 (예: 분당구)': 0,
    '기타': 0,
  };

  allJobs?.forEach(job => {
    const loc = job.location || '';
    if (loc.includes('시') || loc.includes('군')) {
      if (loc.includes('경기') || loc.includes('서울') || loc.includes('부산')) {
        formatCounts['도+시군구 (예: 경기 성남)']++;
      } else {
        formatCounts['시군구 형식 (예: 성남시)']++;
      }
    } else if (loc.includes('구') || loc.includes('동')) {
      formatCounts['구 단독 (예: 분당구)']++;
    } else {
      formatCounts['기타']++;
    }
  });

  Object.entries(formatCounts).forEach(([format, count]) => {
    console.log(`  ${format}: ${count}건`);
  });

  console.log(`\n========================================`);
  console.log(`         핵심 발견`);
  console.log(`========================================`);
  console.log(`1. location에 "경기" 포함: ${gyeonggiJobs.length}건`);
  console.log(`2. organization에 경기도 지역명 포함: ${orgGyeonggiJobs.length}건`);
  console.log(`\n→ location 필드에 "경기"가 아닌 시군구명만 저장되어 있을 가능성!`);
}

analyzeLocationField().catch(console.error);
