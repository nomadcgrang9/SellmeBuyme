/**
 * 클러스터 지역 인식 테스트 - 실제 clusterUtils 사용
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { extractRegion } from '../../src/lib/utils/clusterUtils';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 클러스터 지역 인식 테스트 (실제 코드 사용) ===\n');

  // 1. 모든 고유 location 값 가져오기 (전체 데이터)
  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('location')
    .not('location', 'is', null)
    .limit(10000);

  if (error) {
    console.error('데이터 조회 실패:', error);
    return;
  }

  // 고유 location 값 추출
  const uniqueLocations = [...new Set(jobs?.map(j => j.location).filter(Boolean))];
  console.log(`총 고유 location 값: ${uniqueLocations.length}개\n`);

  // 2. 각 location을 extractRegion으로 테스트
  const recognized: Record<string, string[]> = {};
  const unrecognized: string[] = [];

  for (const loc of uniqueLocations) {
    const result = extractRegion(loc);
    if (result) {
      if (!recognized[result.province]) {
        recognized[result.province] = [];
      }
      recognized[result.province].push(loc);
    } else {
      unrecognized.push(loc);
    }
  }

  // 3. 인식된 지역별 통계
  console.log('=== 인식된 지역별 통계 ===');
  const sortedProvinces = Object.entries(recognized).sort((a, b) => b[1].length - a[1].length);
  for (const [province, locations] of sortedProvinces) {
    console.log(`${province}: ${locations.length}개`);
    // 상세 출력
    for (const loc of locations.slice(0, 5)) {
      console.log(`  - "${loc}"`);
    }
    if (locations.length > 5) {
      console.log(`  ... 외 ${locations.length - 5}개`);
    }
  }

  // 4. 인식되지 않은 location
  console.log(`\n=== 인식 실패 (${unrecognized.length}개) ===`);
  for (const loc of unrecognized) {
    console.log(`  - "${loc}"`);
  }

  // 5. 각 location별 개수 확인 (인식 실패한 것만)
  console.log('\n=== 인식 실패 location별 공고 수 ===');
  const locationCounts: Record<string, number> = {};
  for (const job of jobs || []) {
    const loc = job.location;
    if (loc && !extractRegion(loc)) {
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
  }

  const sortedFailedLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1]);

  for (const [loc, count] of sortedFailedLocations) {
    console.log(`  "${loc}": ${count}개`);
  }

  // 6. 총계
  const totalRecognized = Object.values(recognized).flat().length;
  const totalRecognizedJobs = jobs?.filter(j => extractRegion(j.location)).length || 0;
  const totalUnrecognizedJobs = jobs?.filter(j => !extractRegion(j.location)).length || 0;

  console.log(`\n=== 총계 ===`);
  console.log(`고유 location 인식 성공: ${totalRecognized}개 (${(totalRecognized / uniqueLocations.length * 100).toFixed(1)}%)`);
  console.log(`고유 location 인식 실패: ${unrecognized.length}개 (${(unrecognized.length / uniqueLocations.length * 100).toFixed(1)}%)`);
  console.log(`공고 기준 인식 성공: ${totalRecognizedJobs}개`);
  console.log(`공고 기준 인식 실패: ${totalUnrecognizedJobs}개`);
}

main().catch(console.error);
