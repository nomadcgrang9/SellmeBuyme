/**
 * 클러스터 지역 인식 테스트 스크립트
 * 데이터베이스의 location 값들이 extractRegion에서 어떻게 처리되는지 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// extractRegion 함수 복사 (테스트용)
const PROVINCE_ALIASES: Record<string, string> = {
  // 서울
  '서울': '서울',
  '서울특별시': '서울',
  '서울시': '서울',
  // 경기
  '경기': '경기',
  '경기도': '경기',
  // 인천
  '인천': '인천',
  '인천광역시': '인천',
  '인천시': '인천',
  // 부산
  '부산': '부산',
  '부산광역시': '부산',
  '부산시': '부산',
  // 대구
  '대구': '대구',
  '대구광역시': '대구',
  '대구시': '대구',
  // 광주 (광역시)
  '광주': '광주',
  '광주광역시': '광주',
  '광주광역': '광주',
  '광주시': '광주',
  // 대전
  '대전': '대전',
  '대전광역시': '대전',
  '대전시': '대전',
  // 울산
  '울산': '울산',
  '울산광역시': '울산',
  '울산시': '울산',
  // 세종
  '세종': '세종',
  '세종특별자치시': '세종',
  '세종시': '세종',
  // 강원
  '강원': '강원',
  '강원도': '강원',
  '강원특별자치도': '강원',
  // 충북
  '충북': '충북',
  '충청북도': '충북',
  '충북도': '충북',
  // 충남
  '충남': '충남',
  '충청남도': '충남',
  '충남도': '충남',
  // 전북
  '전북': '전북',
  '전라북도': '전북',
  '전북특별자치도': '전북',
  '전북도': '전북',
  // 전남
  '전남': '전남',
  '전라남도': '전남',
  '전남도': '전남',
  // 경북
  '경북': '경북',
  '경상북도': '경북',
  '경북도': '경북',
  '경상북': '경북',
  // 경남
  '경남': '경남',
  '경상남도': '경남',
  '경남도': '경남',
  '경상남': '경남',
  // 제주
  '제주': '제주',
  '제주특별자치도': '제주',
  '제주도': '제주',
};

const METROPOLITAN_CITIES = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종'];

interface ExtractedRegion {
  key: string;
  name: string;
  province: string;
}

function extractRegion(location: string | null | undefined): ExtractedRegion | null {
  if (!location) return null;

  let normalized = location.trim();
  if (normalized.length === 0) return null;

  normalized = normalized.replace(/[,·]/g, ' ').replace(/\s+/g, ' ').trim();

  // 특수 복합 지역명
  const specialRegions: Record<string, { province: string; name: string }> = {
    '광주하남': { province: '경기', name: '광주하남' },
    '동두천양주': { province: '경기', name: '동두천양주' },
    '구리남양주': { province: '경기', name: '구리남양주' },
  };

  for (const [special, info] of Object.entries(specialRegions)) {
    if (normalized.includes(special)) {
      return {
        key: `${info.province}_${info.name}`,
        name: info.name,
        province: info.province,
      };
    }
  }

  // 정확히 일치
  const exactMatch = PROVINCE_ALIASES[normalized];
  if (exactMatch) {
    return {
      key: exactMatch,
      name: exactMatch,
      province: exactMatch,
    };
  }

  // 긴 것부터 매칭
  const sortedAliases = Object.entries(PROVINCE_ALIASES)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [alias, province] of sortedAliases) {
    if (normalized.startsWith(alias)) {
      const rest = normalized.slice(alias.length).trim();

      if (!rest || rest.length === 0) {
        return {
          key: province,
          name: province,
          province,
        };
      }

      const regionName = rest.replace(/(특별시|광역시|특별자치시|특별자치도|도|시|군|구)$/g, '').trim();
      const displayName = regionName || province;

      return {
        key: `${province}_${displayName}`,
        name: displayName,
        province,
      };
    }
  }

  // 공백으로 분리
  const parts = normalized.split(/\s+/);

  if (parts.length >= 2) {
    const firstPart = parts[0];
    const province = PROVINCE_ALIASES[firstPart];

    if (province) {
      const regionParts = parts.slice(1);
      let regionName = regionParts.join('');
      const displayName = regionName.replace(/(시|군|구)$/, '');

      return {
        key: `${province}_${displayName}`,
        name: displayName,
        province,
      };
    }
  }

  // 단일 단어
  const singleWord = parts[0].replace(/(특별시|광역시|특별자치시|특별자치도|도|시|군|구)$/g, '');

  if (METROPOLITAN_CITIES.includes(singleWord)) {
    return {
      key: singleWord,
      name: singleWord,
      province: singleWord,
    };
  }

  // 경기 도시
  const gyeonggiCityList = [
    '수원', '성남', '고양', '용인', '부천', '안산', '안양', '남양주', '화성', '평택',
    '의정부', '시흥', '파주', '광명', '김포', '군포', '광주', '이천', '양주', '오산',
    '구리', '안성', '포천', '의왕', '하남', '여주', '양평', '동두천', '과천', '가평',
    '연천', '구리남양주', '광주하남', '동두천양주'
  ];

  if (gyeonggiCityList.includes(singleWord)) {
    return { key: `경기_${singleWord}`, name: singleWord, province: '경기' };
  }

  return null;
}

async function main() {
  console.log('=== 클러스터 지역 인식 테스트 ===\n');

  // 1. 모든 고유 location 값 가져오기
  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('location')
    .not('location', 'is', null);

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
  }

  // 4. 인식되지 않은 location
  console.log(`\n=== 인식 실패 (${unrecognized.length}개) ===`);
  for (const loc of unrecognized.slice(0, 50)) {
    console.log(`  - "${loc}"`);
  }
  if (unrecognized.length > 50) {
    console.log(`  ... 외 ${unrecognized.length - 50}개`);
  }

  // 5. 각 location별 개수 확인
  console.log('\n=== location별 공고 수 (상위 30개) ===');
  const locationCounts: Record<string, number> = {};
  for (const job of jobs || []) {
    const loc = job.location;
    if (loc) {
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
  }

  const sortedLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  for (const [loc, count] of sortedLocations) {
    const result = extractRegion(loc);
    const status = result ? `✓ ${result.province}` : '✗ 인식실패';
    console.log(`  ${loc}: ${count}개 [${status}]`);
  }

  // 6. 총계
  const totalRecognized = Object.values(recognized).flat().length;
  console.log(`\n=== 총계 ===`);
  console.log(`인식 성공: ${totalRecognized}개 (${(totalRecognized / uniqueLocations.length * 100).toFixed(1)}%)`);
  console.log(`인식 실패: ${unrecognized.length}개 (${(unrecognized.length / uniqueLocations.length * 100).toFixed(1)}%)`);
}

main().catch(console.error);
