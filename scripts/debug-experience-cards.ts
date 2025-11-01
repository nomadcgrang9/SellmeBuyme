import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// queries.ts의 mapExperienceRowToCard 로직 복제
function normalizeStringArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  return [];
}

function buildExperienceLocationSummary(seoul: string[], gyeonggi: string[]): string {
  const parts: string[] = [];
  if (seoul.length > 0) parts.push(seoul.slice(0, 2).join(', '));
  if (gyeonggi.length > 0) parts.push(gyeonggi.slice(0, 2).join(', '));
  return parts.join(' / ') || '지역 미정';
}

function mapExperienceRowToCard(row: any) {
  const regionSeoul = normalizeStringArray(row?.region_seoul);
  const regionGyeonggi = normalizeStringArray(row?.region_gyeonggi);
  const categories = normalizeStringArray(row?.categories);
  const targetLevels = normalizeStringArray(row?.target_school_levels);
  const operationTypes = normalizeStringArray(row?.operation_types);

  return {
    id: row?.id,
    type: 'experience',
    user_id: row?.user_id ?? null,
    programTitle: row?.program_title ?? '',
    categories,
    targetSchoolLevels: targetLevels,
    regionSeoul,
    regionGyeonggi,
    locationSummary: buildExperienceLocationSummary(regionSeoul, regionGyeonggi),
    operationTypes,
    capacity: row?.capacity ?? null,
    introduction: row?.introduction ?? '',
    contactPhone: row?.contact_phone ?? '',
    contactEmail: row?.contact_email ?? '',
    status: row?.status ?? 'active',
    createdAt: row?.created_at ?? '',
    updatedAt: row?.updated_at ?? row?.created_at ?? '',
    form_payload: row?.form_payload ?? null,
  };
}

async function debugExperienceCards() {
  console.log('\n🔍 체험 카드 데이터 디버깅...\n');

  try {
    // DB에서 데이터 가져오기
    const { data: rawRows, error } = await supabase
      .from('experiences')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 조회 실패:', error);
      process.exit(1);
    }

    console.log(`✅ 총 ${rawRows.length}개의 체험 데이터 발견\n`);

    rawRows.forEach((row, idx) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 #${idx + 1} RAW DB ROW:`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ID:', row.id);
      console.log('program_title:', JSON.stringify(row.program_title));
      console.log('introduction:', JSON.stringify(row.introduction));
      console.log('categories:', JSON.stringify(row.categories));
      console.log('target_school_levels:', JSON.stringify(row.target_school_levels));
      console.log('region_seoul:', JSON.stringify(row.region_seoul));
      console.log('region_gyeonggi:', JSON.stringify(row.region_gyeonggi));
      console.log('operation_types:', JSON.stringify(row.operation_types));
      console.log('capacity:', JSON.stringify(row.capacity));

      const mapped = mapExperienceRowToCard(row);

      console.log('\n🔄 MAPPED CARD OBJECT:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('programTitle:', JSON.stringify(mapped.programTitle));
      console.log('  - type:', typeof mapped.programTitle);
      console.log('  - length:', mapped.programTitle.length);
      console.log('  - is empty string:', mapped.programTitle === '');
      console.log('  - has whitespace only:', mapped.programTitle.trim() === '');

      console.log('\nintroduction:', JSON.stringify(mapped.introduction));
      console.log('  - type:', typeof mapped.introduction);
      console.log('  - length:', mapped.introduction.length);
      console.log('  - is empty string:', mapped.introduction === '');
      console.log('  - has whitespace only:', mapped.introduction.trim() === '');

      console.log('\ncategories:', mapped.categories);
      console.log('locationSummary:', mapped.locationSummary);
      console.log('targetSchoolLevels:', mapped.targetSchoolLevels);
      console.log('operationTypes:', mapped.operationTypes);

      // 폴백 로직 테스트
      const displayTitle = mapped.programTitle || '[제목 없음 - 데이터 확인 필요]';
      const displayIntro = mapped.introduction || '[소개 없음 - 데이터 확인 필요]';

      console.log('\n🎯 DISPLAY VALUES (with fallback):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('displayTitle:', displayTitle);
      console.log('displayIntro:', displayIntro);
    });

    console.log('\n\n✅ 디버깅 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

debugExperienceCards().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});
