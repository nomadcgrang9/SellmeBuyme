/**
 * NEIS 학교 좌표 CSV를 geocache 테이블에 임포트
 * 실행: npx tsx scripts/import-school-locations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase 클라이언트 (service role key 필요)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qpwnvnxeqfihrjfdiwrt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  console.log('실행 방법: SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/import-school-locations.ts');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SchoolRow {
  학교명: string;
  위도: string;
  경도: string;
}

async function importSchoolLocations() {
  console.log('📖 CSV 파일 읽는 중...');

  const csvPath = path.join(__dirname, '..', 'school_locations.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  // 헤더 파싱
  const headers = lines[0].replace('\ufeff', '').split(',');
  const nameIdx = headers.indexOf('학교명');
  const latIdx = headers.indexOf('위도');
  const lngIdx = headers.indexOf('경도');

  console.log(`📊 컬럼 인덱스: 학교명=${nameIdx}, 위도=${latIdx}, 경도=${lngIdx}`);

  // 데이터 파싱
  const schools: { organization: string; latitude: number; longitude: number; source: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV 파싱 (쉼표가 주소에 포함될 수 있으므로 주의)
    const cols = line.split(',');

    const name = cols[nameIdx];
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);

    if (name && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      schools.push({
        organization: name,
        latitude: lat,
        longitude: lng,
        source: 'neis'
      });
    }
  }

  console.log(`✅ 파싱 완료: ${schools.length}개 학교`);

  // 배치로 삽입 (1000개씩)
  const BATCH_SIZE = 1000;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('geocache')
      .upsert(batch, {
        onConflict: 'organization',
        ignoreDuplicates: true
      });

    if (error) {
      console.error(`❌ 배치 ${i / BATCH_SIZE + 1} 실패:`, error.message);
      skipped += batch.length;
    } else {
      inserted += batch.length;
      console.log(`📦 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(schools.length / BATCH_SIZE)} 완료 (${inserted}/${schools.length})`);
    }
  }

  console.log(`\n🎉 임포트 완료!`);
  console.log(`   - 삽입: ${inserted}개`);
  console.log(`   - 스킵: ${skipped}개`);
}

importSchoolLocations().catch(console.error);
