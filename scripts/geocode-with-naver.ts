/**
 * 네이버 지도 API로 미매칭 organization 지오코딩
 *
 * 환경변수:
 * - NAVER_CLIENT_ID: 네이버 클라이언트 ID
 * - NAVER_CLIENT_SECRET: 네이버 클라이언트 시크릿
 *
 * 실행: npx tsx scripts/geocode-with-naver.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const naverClientId = process.env.NAVER_CLIENT_ID;
const naverClientSecret = process.env.NAVER_CLIENT_SECRET;

const supabase = createClient(supabaseUrl, supabaseKey);

interface NaverSearchResult {
  title: string;
  mapx: string;
  mapy: string;
  address: string;
  roadAddress: string;
}

interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchResult[];
}

// 네이버 지역 검색 API (좌표 포함)
async function naverLocalSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!naverClientId || !naverClientSecret) {
    console.error('❌ NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 필요');
    return null;
  }

  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1`;
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': naverClientId,
        'X-Naver-Client-Secret': naverClientSecret
      }
    });

    if (!response.ok) {
      console.warn(`  ⚠️ API 오류 (${response.status}): ${query}`);
      return null;
    }

    const data: NaverSearchResponse = await response.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      // 네이버 좌표는 KATECH 좌표계 (TM128) → WGS84로 변환 필요
      // mapx, mapy는 10000000으로 나누면 대략적인 위경도
      // 실제로는 TM128 → WGS84 변환이 필요하지만, 네이버 API는 이미 변환된 값을 줌
      const lng = parseInt(item.mapx) / 10000000;
      const lat = parseInt(item.mapy) / 10000000;

      // 유효한 좌표인지 확인 (대한민국 범위)
      if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
        return { lat, lng };
      }
    }
    return null;
  } catch (e) {
    console.warn(`  ⚠️ 오류: ${query}`, (e as Error).message);
    return null;
  }
}

async function main() {
  console.log('=== 네이버 지도 API로 미매칭 Organization 지오코딩 ===\n');

  if (!naverClientId || !naverClientSecret) {
    console.error('❌ NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수가 필요합니다.');
    console.log('\n.env 파일에 추가:');
    console.log('NAVER_CLIENT_ID=your_client_id');
    console.log('NAVER_CLIENT_SECRET=your_client_secret');
    console.log('\n네이버 개발자센터: https://developers.naver.com/apps');
    process.exit(1);
  }

  // 1. job_postings에서 고유 organization 가져오기
  const { data: orgs } = await supabase
    .from('job_postings')
    .select('organization')
    .not('organization', 'is', null);

  const uniqueOrgs = [...new Set(orgs?.map(o => o.organization) || [])];
  console.log(`📊 고유 organization: ${uniqueOrgs.length}개\n`);

  // 2. geocache에 없는 것들 찾기
  const BATCH_SIZE = 50;
  const missing: string[] = [];

  for (let i = 0; i < uniqueOrgs.length; i += BATCH_SIZE) {
    const batch = uniqueOrgs.slice(i, i + BATCH_SIZE);
    const { data } = await supabase
      .from('geocache')
      .select('organization')
      .in('organization', batch);

    const foundSet = new Set(data?.map(d => d.organization) || []);
    batch.forEach(org => {
      if (!foundSet.has(org)) missing.push(org);
    });
  }

  console.log(`❌ 미매칭: ${missing.length}개\n`);

  if (missing.length === 0) {
    console.log('✅ 모든 organization이 geocache에 있습니다!');
    return;
  }

  // 3. 카테고리별 분류
  const categories = {
    kindergarten: missing.filter(o => o.includes('유치원')),
    specialSchool: missing.filter(o => o.includes('특수학교') || o.includes('학교') && (o.includes('혜') || o.includes('성은') || o.includes('나래'))),
    eduOffice: missing.filter(o => o.includes('교육청') || o.includes('교육지원청')),
    other: missing.filter(o =>
      !o.includes('유치원') &&
      !o.includes('교육청') &&
      !o.includes('교육지원청') &&
      !(o.includes('특수학교') || (o.includes('학교') && (o.includes('혜') || o.includes('성은') || o.includes('나래'))))
    )
  };

  console.log(`🏫 유치원: ${categories.kindergarten.length}개`);
  console.log(`🎓 특수학교: ${categories.specialSchool.length}개`);
  console.log(`🏛️ 교육청: ${categories.eduOffice.length}개`);
  console.log(`❓ 기타: ${categories.other.length}개\n`);

  // 4. 지오코딩 실행 (유치원 + 특수학교 + 교육청 우선)
  const results: Array<{ organization: string; lat: number; lng: number }> = [];
  const failed: string[] = [];

  // 우선순위: 유치원 > 특수학교 > 교육청 > 기타
  const allToGeocode = [
    ...categories.kindergarten,
    ...categories.specialSchool,
    ...categories.eduOffice,
    ...categories.other
  ];

  console.log(`🔍 ${allToGeocode.length}개 organization 지오코딩 시작...\n`);

  for (let i = 0; i < allToGeocode.length; i++) {
    const org = allToGeocode[i];
    process.stdout.write(`\r  진행: ${i + 1}/${allToGeocode.length} - ${org.substring(0, 25).padEnd(25)}...`);

    const coords = await naverLocalSearch(org);
    if (coords) {
      results.push({ organization: org, lat: coords.lat, lng: coords.lng });
    } else {
      failed.push(org);
    }

    // API rate limit 방지 (100ms 대기)
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n\n✅ 성공: ${results.length}개`);
  console.log(`❌ 실패: ${failed.length}개`);

  if (failed.length > 0 && failed.length <= 20) {
    console.log('\n--- 실패 목록 ---');
    failed.forEach(f => console.log(`  - ${f}`));
  } else if (failed.length > 20) {
    console.log('\n--- 실패 목록 (상위 20개) ---');
    failed.slice(0, 20).forEach(f => console.log(`  - ${f}`));
    console.log(`  ... 외 ${failed.length - 20}개`);
  }

  // 5. Supabase에 저장
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

  // 6. 최종 커버율 계산
  const { count: matchedCount } = await supabase
    .from('geocache')
    .select('*', { count: 'exact', head: true })
    .in('organization', uniqueOrgs);

  console.log(`\n=== 최종 결과 ===`);
  console.log(`📊 job_postings 매칭: ${matchedCount}/${uniqueOrgs.length} (${((matchedCount! / uniqueOrgs.length) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
