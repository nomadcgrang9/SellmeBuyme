/**
 * 병설유치원을 부모 초등학교 좌표로 매핑
 * "XXX초등학교병설유치원" → "XXX초등학교" 좌표 사용
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 유치원명에서 부모 학교명 추출
function extractParentSchool(kindergartenName: string): string | null {
  // 패턴 1: "XXX초등학교병설유치원" → "XXX초등학교"
  let match = kindergartenName.match(/^(.+초등학교)\s*병설유치원$/);
  if (match) return match[1];

  // 패턴 2: "XXX초등학교 병설유치원" (공백 있음)
  match = kindergartenName.match(/^(.+초등학교)\s+병설유치원$/);
  if (match) return match[1];

  // 패턴 3: "XXX초병설유치원" → "XXX초등학교"
  match = kindergartenName.match(/^(.+)초병설유치원$/);
  if (match) return match[1] + '초등학교';

  return null;
}

async function main() {
  console.log('=== 병설유치원 → 부모학교 좌표 매핑 ===\n');

  // 1. 미매칭 유치원 목록 가져오기
  const { data: orgs } = await supabase
    .from('job_postings')
    .select('organization')
    .not('organization', 'is', null)
    .ilike('organization', '%유치원%');

  const uniqueKinders = [...new Set(orgs?.map(o => o.organization) || [])];
  console.log(`📊 유치원 관련 organization: ${uniqueKinders.length}개\n`);

  // 2. 이미 geocache에 있는지 확인
  const { data: existingData } = await supabase
    .from('geocache')
    .select('organization')
    .in('organization', uniqueKinders);

  const existingSet = new Set(existingData?.map(d => d.organization) || []);
  const missingKinders = uniqueKinders.filter(k => !existingSet.has(k));

  console.log(`✅ 이미 매칭됨: ${existingSet.size}개`);
  console.log(`❌ 미매칭: ${missingKinders.length}개\n`);

  if (missingKinders.length === 0) {
    console.log('모든 유치원이 이미 geocache에 있습니다!');
    return;
  }

  // 3. 병설유치원 → 부모학교 매핑
  const mappings: Array<{ kinder: string; parent: string }> = [];
  const unmappable: string[] = [];

  for (const kinder of missingKinders) {
    const parent = extractParentSchool(kinder);
    if (parent) {
      mappings.push({ kinder, parent });
    } else {
      unmappable.push(kinder);
    }
  }

  console.log(`🔗 병설유치원 (매핑 가능): ${mappings.length}개`);
  console.log(`❓ 단독 유치원 (매핑 불가): ${unmappable.length}개\n`);

  // 4. 부모 학교 좌표 조회
  const parentSchools = [...new Set(mappings.map(m => m.parent))];
  console.log(`🔍 부모 학교 ${parentSchools.length}개 좌표 조회 중...`);

  // 배치로 조회
  const parentCoords = new Map<string, { lat: number; lng: number }>();
  const BATCH_SIZE = 50;

  for (let i = 0; i < parentSchools.length; i += BATCH_SIZE) {
    const batch = parentSchools.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from('geocache')
      .select('organization, latitude, longitude')
      .in('organization', batch);

    data?.forEach(d => {
      parentCoords.set(d.organization, {
        lat: parseFloat(d.latitude),
        lng: parseFloat(d.longitude)
      });
    });
  }

  console.log(`  → 좌표 찾음: ${parentCoords.size}개\n`);

  // 5. 유치원 좌표 생성
  const results: Array<{ organization: string; lat: number; lng: number }> = [];
  const notFound: string[] = [];

  for (const { kinder, parent } of mappings) {
    const coords = parentCoords.get(parent);
    if (coords) {
      results.push({
        organization: kinder,
        lat: coords.lat,
        lng: coords.lng
      });
    } else {
      notFound.push(`${kinder} (부모: ${parent})`);
    }
  }

  console.log(`✅ 좌표 매핑 성공: ${results.length}개`);
  console.log(`❌ 부모 학교 좌표 없음: ${notFound.length}개`);
  console.log(`❓ 단독 유치원 (별도 처리 필요): ${unmappable.length}개\n`);

  // 실패 목록 출력
  if (notFound.length > 0) {
    console.log('--- 부모 학교 좌표 없음 ---');
    notFound.slice(0, 10).forEach(n => console.log(`  - ${n}`));
    if (notFound.length > 10) console.log(`  ... 외 ${notFound.length - 10}개`);
  }

  if (unmappable.length > 0) {
    console.log('\n--- 단독 유치원 (병설 아님) ---');
    unmappable.forEach(u => console.log(`  - ${u}`));
  }

  // 6. Supabase에 저장
  if (results.length > 0) {
    console.log(`\n📤 geocache에 ${results.length}개 저장 중...`);

    const { error } = await supabase
      .from('geocache')
      .upsert(
        results.map(r => ({
          organization: r.organization,
          latitude: r.lat,
          longitude: r.lng,
          source: 'school_mapping',
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'organization', ignoreDuplicates: true }
      );

    if (error) {
      console.error('❌ 저장 실패:', error.message);
    } else {
      console.log('✅ 저장 완료!');
    }
  }

  // 7. 최종 요약
  console.log('\n=== 최종 요약 ===');
  console.log(`📊 병설유치원 매핑 성공: ${results.length}개`);
  console.log(`📊 부모학교 좌표 없음: ${notFound.length}개`);
  console.log(`📊 단독 유치원 (Kakao API 필요): ${unmappable.length}개`);
  console.log(`\n💡 남은 ${notFound.length + unmappable.length}개는 Kakao API 한도 리셋 후 처리`);
}

main().catch(console.error);
