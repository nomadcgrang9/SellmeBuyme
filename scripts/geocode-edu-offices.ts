/**
 * 교육청/교육지원청 지오코딩 (이름 정제 후 검색)
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const naverClientId = process.env.NAVER_CLIENT_ID!;
const naverClientSecret = process.env.NAVER_CLIENT_SECRET!;

// 교육청 이름 정제
function normalizeEduOfficeName(name: string): string {
  // 불필요한 부분 제거
  let normalized = name
    .replace(/\s*구인구직.*$/, '')
    .replace(/\s*채용공고.*$/, '')
    .replace(/\s*학교지원.*$/, '')
    .replace(/\s*학교업무지원센터.*$/, '')
    .replace(/\s*스포츠교육센터.*$/, '')
    .replace(/\s*조직복지과.*$/, '')
    .replace(/\s*중등특수교육과.*$/, '')
    .replace(/\s*교수학습지원과.*$/, '')
    .replace(/\s*민주생활교육과.*$/, '')
    .replace(/\s*중등교육과.*$/, '')
    .replace(/\s*유아특수교육과.*$/, '')
    .replace(/\s*학교인력채용.*$/, '')
    .replace(/\s*관내학교.*$/, '')
    .replace(/\s*거점형늘봄센터.*$/, '')
    .replace(/^2026학년도\s*/, '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();

  // 시도교육청 소속 기관 처리 (도서관, 진흥원 등)
  if (normalized.includes('도서관') ||
      normalized.includes('진흥원') ||
      normalized.includes('교육원') ||
      normalized.includes('문화회관') ||
      normalized.includes('평생학습관') ||
      normalized.includes('기념회관') ||
      normalized.includes('Wee센터')) {
    // 그대로 검색
    return normalized;
  }

  // "전라남도교육청여수교육지원청" 같은 경우 → "여수교육지원청"
  const match = normalized.match(/([\w가-힣]+교육지원청)$/);
  if (match) {
    normalized = match[1];
  }

  // "경기도" 같은 접두어 제거 (교육지원청인 경우)
  if (normalized.includes('교육지원청')) {
    normalized = normalized
      .replace(/^전북특별자치도/, '')
      .replace(/^전라남도/, '')
      .replace(/^경기도/, '')
      .replace(/^강원특별자치도/, '')
      .replace(/^경상남도/, '')
      .replace(/^충청남도/, '')
      .replace(/^인천광역시/, '')
      .replace(/^서울특별시/, '')
      .replace(/^부산광역시/, '')
      .replace(/^대전광역시/, '')
      .replace(/^광주광역시/, '')
      .replace(/^울산광역시/, '')
      .trim();
  }

  return normalized;
}

async function naverLocalSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`;
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': naverClientId,
        'X-Naver-Client-Secret': naverClientSecret
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const lng = parseInt(item.mapx) / 10000000;
      const lat = parseInt(item.mapy) / 10000000;

      if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
        return { lat, lng };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== 교육청/교육지원청 지오코딩 (이름 정제) ===\n');

  // 1. 교육청 관련 미매칭 organization 조회
  const { data: eduOrgs } = await supabase
    .from('job_postings')
    .select('organization')
    .or('organization.ilike.%교육지원청%,organization.ilike.%교육청%');

  const uniqueEdu = [...new Set(eduOrgs?.map(o => o.organization) || [])];
  console.log(`📊 교육청/지원청 관련: ${uniqueEdu.length}개\n`);

  // 2. 이미 매칭된 것 제외
  const missing: string[] = [];
  for (const org of uniqueEdu) {
    const { data } = await supabase
      .from('geocache')
      .select('organization')
      .eq('organization', org)
      .single();

    if (!data) missing.push(org);
  }

  console.log(`❌ 미매칭: ${missing.length}개\n`);

  if (missing.length === 0) {
    console.log('✅ 모든 교육청이 매칭됨!');
    return;
  }

  // 3. 이름 정제 후 검색
  const results: Array<{ organization: string; lat: number; lng: number }> = [];
  const failed: string[] = [];

  console.log('🔍 지오코딩 시작...\n');

  for (let i = 0; i < missing.length; i++) {
    const org = missing[i];
    const normalized = normalizeEduOfficeName(org);

    process.stdout.write(`\r  ${i + 1}/${missing.length} - ${normalized.substring(0, 25).padEnd(25)}...`);

    // 정제된 이름으로 검색
    let coords = await naverLocalSearch(normalized);

    // 실패하면 원본으로 한번 더 시도
    if (!coords && normalized !== org) {
      coords = await naverLocalSearch(org);
    }

    if (coords) {
      results.push({ organization: org, lat: coords.lat, lng: coords.lng });
    } else {
      failed.push(`${org} → (${normalized})`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n\n✅ 성공: ${results.length}개`);
  console.log(`❌ 실패: ${failed.length}개`);

  if (failed.length > 0 && failed.length <= 30) {
    console.log('\n--- 실패 목록 ---');
    failed.forEach(f => console.log(`  - ${f}`));
  }

  // 4. 저장
  if (results.length > 0) {
    console.log(`\n📤 geocache에 ${results.length}개 저장 중...`);

    const { error } = await supabase
      .from('geocache')
      .upsert(
        results.map(r => ({
          organization: r.organization,
          latitude: r.lat,
          longitude: r.lng,
          source: 'naver',
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

  // 5. 특수학교 추가 처리
  console.log('\n\n=== 특수학교 추가 처리 ===');

  const specialMissing = [
    '희망학교(유아특수학교)',
    '한별학교(에코특수학교)',
    '국립공주대학교사범대학부설특수학교'
  ];

  const specialResults: Array<{ organization: string; lat: number; lng: number }> = [];

  for (const org of specialMissing) {
    // 괄호 제거해서 검색
    const simplified = org.replace(/\(.*\)/, '').trim();
    console.log(`  검색: ${simplified}`);

    const coords = await naverLocalSearch(simplified);
    if (coords) {
      specialResults.push({ organization: org, lat: coords.lat, lng: coords.lng });
      console.log(`    ✅ 찾음: ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`    ❌ 못 찾음`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  if (specialResults.length > 0) {
    await supabase.from('geocache').upsert(
      specialResults.map(r => ({
        organization: r.organization,
        latitude: r.lat,
        longitude: r.lng,
        source: 'naver',
        updated_at: new Date().toISOString()
      })),
      { onConflict: 'organization', ignoreDuplicates: true }
    );
    console.log(`\n📤 특수학교 ${specialResults.length}개 저장 완료`);
  }
}

main().catch(console.error);
