/**
 * 매칭 안 되는 organization들을 Kakao API로 지오코딩
 * 실행: KAKAO_REST_API_KEY=xxx npx tsx scripts/geocode-missing-orgs.ts
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const kakaoKey = process.env.KAKAO_REST_API_KEY || process.env.VITE_KAKAO_REST_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function kakaoGeocode(keyword: string): Promise<{ lat: number; lng: number } | null> {
  if (!kakaoKey) {
    console.error('❌ KAKAO_REST_API_KEY 필요');
    return null;
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `KakaoAK ${kakaoKey}` }
    });

    if (!response.ok) {
      console.warn(`  ⚠️ API 오류 (${response.status}): ${keyword}`);
      return null;
    }

    const data = await response.json();
    if (data.documents && data.documents.length > 0) {
      return {
        lat: parseFloat(data.documents[0].y),
        lng: parseFloat(data.documents[0].x)
      };
    }
    return null;
  } catch (e) {
    console.warn(`  ⚠️ 오류: ${keyword}`, (e as Error).message);
    return null;
  }
}

async function main() {
  console.log('=== 미매칭 Organization 지오코딩 ===\n');

  if (!kakaoKey) {
    console.error('❌ KAKAO_REST_API_KEY 환경변수가 필요합니다.');
    console.log('실행: KAKAO_REST_API_KEY=your_key npx tsx scripts/geocode-missing-orgs.ts');
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
    eduOffice: missing.filter(o => o.includes('교육청') || o.includes('교육지원청')),
    other: missing.filter(o => !o.includes('유치원') && !o.includes('교육청') && !o.includes('교육지원청'))
  };

  console.log(`🏫 유치원: ${categories.kindergarten.length}개`);
  console.log(`🏛️ 교육청: ${categories.eduOffice.length}개`);
  console.log(`❓ 기타: ${categories.other.length}개\n`);

  // 4. 지오코딩 실행
  const results: Array<{ organization: string; lat: number; lng: number }> = [];
  const failed: string[] = [];

  const allToGeocode = [...categories.kindergarten, ...categories.eduOffice, ...categories.other];

  console.log(`🔍 ${allToGeocode.length}개 organization 지오코딩 시작...\n`);

  for (let i = 0; i < allToGeocode.length; i++) {
    const org = allToGeocode[i];
    process.stdout.write(`\r  진행: ${i + 1}/${allToGeocode.length} - ${org.substring(0, 20)}...`);

    const coords = await kakaoGeocode(org);
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

  if (failed.length > 0) {
    console.log('\n--- 실패 목록 ---');
    failed.forEach(f => console.log(`  - ${f}`));
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
          source: 'kakao',
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
  const { count: totalGeocache } = await supabase
    .from('geocache')
    .select('*', { count: 'exact', head: true });

  const { count: matchedCount } = await supabase
    .from('geocache')
    .select('*', { count: 'exact', head: true })
    .in('organization', uniqueOrgs);

  console.log(`\n=== 최종 결과 ===`);
  console.log(`📊 geocache 전체: ${totalGeocache}개`);
  console.log(`📊 job_postings 매칭: ${matchedCount}/${uniqueOrgs.length} (${((matchedCount! / uniqueOrgs.length) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
