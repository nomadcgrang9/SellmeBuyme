/**
 * 남은 미매칭 organization 수동 처리
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

async function naverLocalSearch(query: string): Promise<{ lat: number; lng: number; title: string } | null> {
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
      const title = item.title.replace(/<[^>]*>/g, ''); // HTML 태그 제거

      if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132) {
        return { lat, lng, title };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('=== 남은 미매칭 organization 수동 처리 ===\n');

  // 남은 5개와 검색어 매핑
  const remaining = [
    { org: '성남제일유치원', searchTerms: ['성남제일유치원', '성남 제일유치원'] },
    { org: '구리남양주 기간제교사', searchTerms: ['구리남양주교육지원청'] },
    { org: '나이스플러스고등학교', searchTerms: ['나이스플러스고등학교', '나이스플러스 고등학교'] },
    { org: '성남장안초등학', searchTerms: ['성남장안초등학교', '장안초등학교 성남'] },
    { org: '제주미래산업고등학교', searchTerms: ['제주미래산업고등학교', '제주 미래산업고등학교'] }
  ];

  const results: Array<{ organization: string; lat: number; lng: number }> = [];

  for (const { org, searchTerms } of remaining) {
    console.log(`\n🔍 ${org}`);

    let found = false;
    for (const term of searchTerms) {
      console.log(`  → 검색: "${term}"`);
      const coords = await naverLocalSearch(term);

      if (coords) {
        console.log(`    ✅ 찾음: ${coords.title} (${coords.lat}, ${coords.lng})`);
        results.push({ organization: org, lat: coords.lat, lng: coords.lng });
        found = true;
        break;
      } else {
        console.log(`    ❌ 못 찾음`);
      }
      await new Promise(r => setTimeout(r, 100));
    }

    if (!found) {
      console.log(`  ⚠️ 모든 검색어로 실패`);
    }
  }

  console.log(`\n\n=== 결과 ===`);
  console.log(`✅ 성공: ${results.length}개`);
  console.log(`❌ 실패: ${remaining.length - results.length}개`);

  if (results.length > 0) {
    console.log(`\n📤 저장 중...`);

    const { error } = await supabase.from('geocache').upsert(
      results.map(r => ({
        organization: r.organization,
        latitude: r.lat,
        longitude: r.lng,
        source: 'naver_manual',
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
}

main().catch(console.error);
