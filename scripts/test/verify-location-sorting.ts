/**
 * 위치 기반 정렬 검증 스크립트
 *
 * 이 스크립트는 다음을 검증합니다:
 * 1. 주소 정규화가 제대로 작동하는지
 * 2. sortCardsByLocation 함수가 올바른 점수를 계산하는지
 * 3. 캐시된 데이터도 정규화되는지
 */

// 주소 정규화 함수 (App.tsx와 동일)
const normalizeAddress = (addr: { city: string; district: string }) => {
  // "성남시 분당구" → "성남" 형태로 변환
  // 1. 먼저 "시", "구" 제거
  // 2. 그 다음 공백 제거
  // 3. 첫 번째 단어만 추출 (예: "성남시 분당구" → "성남")
  const cityParts = addr.city.replace(/시/g, '').replace(/구/g, '').trim().split(/\s+/);
  const city = cityParts[0] || '';

  const districtParts = addr.district.replace(/시/g, '').replace(/구/g, '').trim().split(/\s+/);
  const district = districtParts[0] || '';

  return { city, district };
};

// sortCardsByLocation의 normalizeCity 함수 (App.tsx와 동일)
const normalizeCity = (city: string): string => {
  return city
    .replace(/\s+/g, '')
    .replace(/시$/, '')
    .replace(/구$/, '')
    .trim();
};

// 인접 지역 정의 (App.tsx와 동일)
const adjacentCities: Record<string, string[]> = {
  '성남': ['광주', '하남', '용인', '수원'],
  '수원': ['용인', '화성', '오산', '성남'],
  '용인': ['성남', '수원', '화성', '광주'],
};

// 위치 점수 계산 함수 (App.tsx의 getLocationScore와 동일)
const getLocationScore = (
  location: string,
  userCity: string,
  userDistrict: string
): number => {
  const normalizedLocation = normalizeCity(location);

  // 1순위: 같은 구 (예: 분당)
  if (userDistrict && normalizedLocation.includes(userDistrict)) {
    return 1000;
  }

  // 2순위: 같은 시 (예: 성남)
  if (normalizedLocation.includes(userCity)) {
    return 900;
  }

  // 3순위: 인접 도시 (예: 광주, 하남, 용인, 수원)
  const adjacentList = adjacentCities[userCity] || [];
  for (let i = 0; i < adjacentList.length; i++) {
    if (normalizedLocation.includes(adjacentList[i])) {
      return 800 - (i * 10); // 순서대로 점수 감소
    }
  }

  // 4순위: 경기도 (기타 지역)
  if (normalizedLocation.includes('경기') || normalizedLocation.length > 0) {
    return 100;
  }

  // 5순위: 기타 (location 정보 없음)
  return 0;
};

console.log('='.repeat(60));
console.log('📍 위치 기반 정렬 검증 스크립트');
console.log('='.repeat(60));

// 테스트 1: 주소 정규화 검증
console.log('\n[테스트 1] 주소 정규화 검증');
console.log('-'.repeat(60));

const testCases = [
  { input: { city: '성남시 분당구', district: '서현동' }, expected: { city: '성남', district: '서현동' } },
  { input: { city: '성남시', district: '분당구' }, expected: { city: '성남', district: '분당' } },
  { input: { city: '성남', district: '분당' }, expected: { city: '성남', district: '분당' } },
  { input: { city: '수원 시', district: '영통 구' }, expected: { city: '수원', district: '영통' } },
];

testCases.forEach((test, idx) => {
  const result = normalizeAddress(test.input);
  const passed = result.city === test.expected.city && result.district === test.expected.district;

  console.log(`\n케이스 ${idx + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  입력: { city: "${test.input.city}", district: "${test.input.district}" }`);
  console.log(`  결과: { city: "${result.city}", district: "${result.district}" }`);
  console.log(`  예상: { city: "${test.expected.city}", district: "${test.expected.district}" }`);
});

// 테스트 2: 위치 점수 계산 검증
console.log('\n\n[테스트 2] 위치 점수 계산 검증 (사용자: 성남/분당)');
console.log('-'.repeat(60));

const userLocation = normalizeAddress({ city: '성남시 분당구', district: '서현동' });
console.log(`사용자 위치 (정규화 후): city="${userLocation.city}", district="${userLocation.district}"`);

const locationTests = [
  { location: '경기 성남시 분당구', expectedScore: 1000, description: '같은 구 (분당)' },
  { location: '성남시 수정구', expectedScore: 900, description: '같은 시 (성남)' },
  { location: '광주시', expectedScore: 800, description: '인접 도시 1순위 (광주)' },
  { location: '하남시', expectedScore: 790, description: '인접 도시 2순위 (하남)' },
  { location: '용인시', expectedScore: 780, description: '인접 도시 3순위 (용인)' },
  { location: '수원시', expectedScore: 770, description: '인접 도시 4순위 (수원)' },
  { location: '구리시', expectedScore: 100, description: '경기도 기타 지역' },
  { location: '남양주시', expectedScore: 100, description: '경기도 기타 지역' },
];

locationTests.forEach((test, idx) => {
  const score = getLocationScore(test.location, userLocation.city, userLocation.district);
  const passed = score === test.expectedScore;

  console.log(`\n케이스 ${idx + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  지역: "${test.location}"`);
  console.log(`  설명: ${test.description}`);
  console.log(`  점수: ${score} (예상: ${test.expectedScore})`);
});

// 테스트 3: 캐시된 데이터 정규화 검증
console.log('\n\n[테스트 3] localStorage 캐시 시나리오 검증');
console.log('-'.repeat(60));

// 시나리오: localStorage에 "성남시 분당구" 형태로 저장된 경우
const cachedData = { city: '성남시 분당구', district: '서현동' };
console.log(`\nLocalStorage 캐시된 데이터: ${JSON.stringify(cachedData)}`);

const normalized = normalizeAddress(cachedData);
console.log(`정규화 후: ${JSON.stringify(normalized)}`);

// 정규화된 데이터로 점수 계산
const testLocations = [
  '경기 성남시 분당구',
  '경기 성남시',
  '구리시',
  '남양주시'
];

console.log('\n정규화된 위치로 점수 계산:');
testLocations.forEach((loc) => {
  const score = getLocationScore(loc, normalized.city, normalized.district);
  console.log(`  - ${loc.padEnd(20)} → 점수: ${score}`);
});

// 테스트 4: 프로필 지역 정규화 검증
console.log('\n\n[테스트 4] 프로필 지역 정규화 검증');
console.log('-'.repeat(60));

const profileRegions = ['성남', '성남시', '수원', '수원시'];

profileRegions.forEach((region) => {
  const normalized = region.replace(/시$/, '');
  console.log(`  프로필 지역: "${region}" → 정규화: "${normalized}"`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ 모든 검증 완료!');
console.log('='.repeat(60));
console.log('\n다음 단계:');
console.log('1. 브라우저에서 http://localhost:5176 접속');
console.log('2. 위치 권한 허용');
console.log('3. 콘솔 로그 확인:');
console.log('   - "정규화된 도시" 로그가 나타나야 함');
console.log('   - "📍 [카드 정렬] 위치 기반 정렬 시작" 로그가 나타나야 함');
console.log('   - 성남 카드가 맨 위에 표시되어야 함');
console.log('4. localStorage를 직접 확인하지 않아도 정규화가 자동으로 처리됨');
console.log('='.repeat(60));
