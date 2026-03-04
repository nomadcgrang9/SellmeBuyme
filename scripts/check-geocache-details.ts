/**
 * geocache 테이블 상세 확인
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGeocache() {
  console.log('=== Geocache 테이블 상세 확인 ===\n');

  // 1. 전체 레코드 수 (count만)
  const { count } = await supabase
    .from('geocache')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 geocache 전체 레코드 수: ${count}개\n`);

  // 2. source별 분포
  const { data: sourceData } = await supabase
    .from('geocache')
    .select('source')
    .limit(10000);

  const sourceCounts: Record<string, number> = {};
  sourceData?.forEach(r => {
    const src = r.source || 'null';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  console.log('📊 source별 분포:', sourceCounts);

  // 3. 샘플 데이터
  const { data: samples } = await supabase
    .from('geocache')
    .select('organization, latitude, longitude, source')
    .limit(20);

  console.log('\n--- 샘플 데이터 (20개) ---');
  samples?.forEach(s => {
    console.log(`  ${s.organization} (${s.latitude}, ${s.longitude}) [${s.source}]`);
  });

  // 4. 특정 학교명 검색 테스트
  const testSchools = [
    '위례한빛고등학교',
    '가좌고등학교',
    '상촌중학교',
    '현일초등학교',
    '성남초등학교'
  ];

  console.log('\n--- 테스트 학교 검색 ---');
  for (const school of testSchools) {
    const { data } = await supabase
      .from('geocache')
      .select('organization')
      .eq('organization', school)
      .single();

    console.log(`  ${school}: ${data ? '✅ 있음' : '❌ 없음'}`);

    // LIKE 검색도 시도
    if (!data) {
      const { data: likeData } = await supabase
        .from('geocache')
        .select('organization')
        .ilike('organization', `%${school.slice(0, 4)}%`)
        .limit(3);

      if (likeData?.length) {
        console.log(`    → 유사: ${likeData.map(d => d.organization).join(', ')}`);
      }
    }
  }

  // 5. 초등학교/중학교/고등학교 키워드 포함 검색
  console.log('\n--- 학교급별 검색 테스트 ---');
  for (const keyword of ['초등학교', '중학교', '고등학교', '유치원']) {
    const { count } = await supabase
      .from('geocache')
      .select('*', { count: 'exact', head: true })
      .ilike('organization', `%${keyword}%`);

    console.log(`  ${keyword} 포함: ${count}개`);
  }
}

checkGeocache().catch(console.error);
