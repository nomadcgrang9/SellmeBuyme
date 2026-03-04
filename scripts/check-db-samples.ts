import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // 1. geocache 샘플 확인 (특수학교, 교육지원청, 유치원)
  console.log('=== DB 샘플 데이터 확인 ===\n');

  const samples = [
    '성남혜은학교',
    '성은학교',
    '경기도교육청',
    '성남교육지원청',
    '한별초등학교병설유치원',
    '녹양유치원',
    '성남장안초등학',
    '구리남양주 기간제교사'
  ];

  for (const org of samples) {
    const { data } = await supabase
      .from('geocache')
      .select('organization, latitude, longitude, source')
      .eq('organization', org)
      .single();

    if (data) {
      console.log('V ' + org);
      console.log('   -> lat: ' + data.latitude + ', lng: ' + data.longitude + ' (source: ' + data.source + ')');
    } else {
      console.log('X ' + org + ' - 미매칭');
    }
  }

  // 2. source별 통계
  console.log('\n=== source별 통계 ===');
  const { data: all } = await supabase.from('geocache').select('source');
  const counts: Record<string, number> = {};
  all?.forEach(r => {
    const src = r.source || 'null';
    counts[src] = (counts[src] || 0) + 1;
  });
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, c]) => console.log('  ' + s + ': ' + c + '개'));

  // 3. 좌표 유효성 확인 (대한민국 범위 내)
  console.log('\n=== 좌표 유효성 확인 ===');
  const { data: coordCheck } = await supabase
    .from('geocache')
    .select('organization, latitude, longitude')
    .or('latitude.lt.33,latitude.gt.39,longitude.lt.124,longitude.gt.132')
    .limit(10);

  if (coordCheck && coordCheck.length > 0) {
    console.log('Warning: 범위 벗어난 좌표:');
    coordCheck.forEach(r => console.log('  - ' + r.organization + ': ' + r.latitude + ', ' + r.longitude));
  } else {
    console.log('OK: 모든 좌표가 대한민국 범위 내');
  }
}

check().catch(console.error);
