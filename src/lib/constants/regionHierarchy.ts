/**
 * 광역시도 → 기초자치단체 계층 매핑
 *
 * 목적: 광역시도 전체 검색 시 해당 광역시도 내 모든 기초자치단체 공고를 검색할 수 있도록 지원
 *
 * 사용 예시:
 * - "경기 전체" 검색 → 경기도 + 의정부 + 남양주 + 수원 + ... 모든 경기도 시/군 검색
 * - "서울 전체" 검색 → 서울 + 강남구 + 서초구 + ... 모든 서울 자치구 검색
 */

/**
 * 광역시도 → 기초자치단체 매핑
 * - 키: 광역시도 이름 (검색 패턴으로 사용)
 * - 값: 해당 광역시도 내 기초자치단체 목록 (DB location 필드에 저장된 다양한 형태 포함)
 */
export const PROVINCE_TO_CITIES: Record<string, string[]> = {
  서울: [
    '강남구',
    '강동구',
    '강북구',
    '강서구',
    '관악구',
    '광진구',
    '구로구',
    '금천구',
    '노원구',
    '도봉구',
    '동대문구',
    '동작구',
    '마포구',
    '서대문구',
    '서초구',
    '성동구',
    '성북구',
    '송파구',
    '양천구',
    '영등포구',
    '용산구',
    '은평구',
    '종로구',
    '중구',
    '중랑구',
  ],

  경기: [
    // 시 단위
    '수원',
    '수원시',
    '성남',
    '성남시',
    '고양',
    '고양시',
    '용인',
    '용인시',
    '부천',
    '부천시',
    '안산',
    '안산시',
    '안양',
    '안양시',
    '남양주',
    '남양주시',
    '화성',
    '화성시',
    '평택',
    '평택시',
    '의정부',
    '의정부시',
    '시흥',
    '시흥시',
    '파주',
    '파주시',
    '김포',
    '김포시',
    '광명',
    '광명시',
    '광주',
    '광주시',
    '군포',
    '군포시',
    '오산',
    '오산시',
    '이천',
    '이천시',
    '안성',
    '안성시',
    '구리',
    '구리시',
    '포천',
    '포천시',
    '의왕',
    '의왕시',
    '하남',
    '하남시',
    '여주',
    '여주시',
    '양주',
    '양주시',
    '동두천',
    '동두천시',
    '과천',
    '과천시',
    // 군 단위
    '가평',
    '가평군',
    '양평',
    '양평군',
    '연천',
    '연천군',
    // 복합 지역 (교육지원청 관할)
    '구리남양주',
    '광주하남',
    '동두천양주',
  ],

  인천: [
    '중구',
    '동구',
    '미추홀구',
    '연수구',
    '남동구',
    '부평구',
    '계양구',
    '서구',
    '강화군',
    '옹진군',
  ],

  강원: [
    // 시 단위
    '춘천',
    '춘천시',
    '원주',
    '원주시',
    '강릉',
    '강릉시',
    '동해',
    '동해시',
    '태백',
    '태백시',
    '속초',
    '속초시',
    '삼척',
    '삼척시',
    // 군 단위
    '홍천',
    '홍천군',
    '횡성',
    '횡성군',
    '영월',
    '영월군',
    '평창',
    '평창군',
    '정선',
    '정선군',
    '철원',
    '철원군',
    '화천',
    '화천군',
    '양구',
    '양구군',
    '인제',
    '인제군',
    '고성',
    '고성군',
    '양양',
    '양양군',
  ],

  부산: [
    '중구',
    '서구',
    '동구',
    '영도구',
    '부산진구',
    '동래구',
    '남구',
    '북구',
    '해운대구',
    '사하구',
    '금정구',
    '강서구',
    '연제구',
    '수영구',
    '사상구',
    '기장군',
  ],

  대구: [
    '중구',
    '동구',
    '서구',
    '남구',
    '북구',
    '수성구',
    '달서구',
    '달성군',
    '군위군',
  ],

  광주: ['동구', '서구', '남구', '북구', '광산구'],

  대전: ['동구', '중구', '서구', '유성구', '대덕구'],

  울산: ['중구', '남구', '동구', '북구', '울주군'],

  세종: ['세종시', '세종특별자치시'],

  충북: [
    '청주',
    '청주시',
    '충주',
    '충주시',
    '제천',
    '제천시',
    '보은',
    '보은군',
    '옥천',
    '옥천군',
    '영동',
    '영동군',
    '증평',
    '증평군',
    '진천',
    '진천군',
    '괴산',
    '괴산군',
    '음성',
    '음성군',
    '단양',
    '단양군',
  ],

  충남: [
    '천안',
    '천안시',
    '공주',
    '공주시',
    '보령',
    '보령시',
    '아산',
    '아산시',
    '서산',
    '서산시',
    '논산',
    '논산시',
    '계룡',
    '계룡시',
    '당진',
    '당진시',
    '금산',
    '금산군',
    '부여',
    '부여군',
    '서천',
    '서천군',
    '청양',
    '청양군',
    '홍성',
    '홍성군',
    '예산',
    '예산군',
    '태안',
    '태안군',
  ],

  전북: [
    '전주',
    '전주시',
    '군산',
    '군산시',
    '익산',
    '익산시',
    '정읍',
    '정읍시',
    '남원',
    '남원시',
    '김제',
    '김제시',
    '완주',
    '완주군',
    '진안',
    '진안군',
    '무주',
    '무주군',
    '장수',
    '장수군',
    '임실',
    '임실군',
    '순창',
    '순창군',
    '고창',
    '고창군',
    '부안',
    '부안군',
  ],

  전남: [
    '목포',
    '목포시',
    '여수',
    '여수시',
    '순천',
    '순천시',
    '나주',
    '나주시',
    '광양',
    '광양시',
    '담양',
    '담양군',
    '곡성',
    '곡성군',
    '구례',
    '구례군',
    '고흥',
    '고흥군',
    '보성',
    '보성군',
    '화순',
    '화순군',
    '장흥',
    '장흥군',
    '강진',
    '강진군',
    '해남',
    '해남군',
    '영암',
    '영암군',
    '무안',
    '무안군',
    '함평',
    '함평군',
    '영광',
    '영광군',
    '장성',
    '장성군',
    '완도',
    '완도군',
    '진도',
    '진도군',
    '신안',
    '신안군',
  ],

  경북: [
    '포항',
    '포항시',
    '경주',
    '경주시',
    '김천',
    '김천시',
    '안동',
    '안동시',
    '구미',
    '구미시',
    '영주',
    '영주시',
    '영천',
    '영천시',
    '상주',
    '상주시',
    '문경',
    '문경시',
    '경산',
    '경산시',
    '의성',
    '의성군',
    '청송',
    '청송군',
    '영양',
    '영양군',
    '영덕',
    '영덕군',
    '청도',
    '청도군',
    '고령',
    '고령군',
    '성주',
    '성주군',
    '칠곡',
    '칠곡군',
    '예천',
    '예천군',
    '봉화',
    '봉화군',
    '울진',
    '울진군',
    '울릉',
    '울릉군',
  ],

  경남: [
    '창원',
    '창원시',
    '진주',
    '진주시',
    '통영',
    '통영시',
    '사천',
    '사천시',
    '김해',
    '김해시',
    '밀양',
    '밀양시',
    '거제',
    '거제시',
    '양산',
    '양산시',
    '의령',
    '의령군',
    '함안',
    '함안군',
    '창녕',
    '창녕군',
    '고성',
    '고성군',
    '남해',
    '남해군',
    '하동',
    '하동군',
    '산청',
    '산청군',
    '함양',
    '함양군',
    '거창',
    '거창군',
    '합천',
    '합천군',
  ],

  제주: ['제주시', '서귀포', '서귀포시'],
};

/**
 * 광역시도 → 크롤보드 ID 매핑
 * 광역시도 검색 시 해당 지역의 크롤보드 공고만 검색하기 위해 사용
 * (동일 이름의 하위 지역 중복 방지: 서울 중구 vs 인천 중구 등)
 */
export const PROVINCE_TO_CRAWL_BOARD_IDS: Record<string, string[]> = {
  서울: ['26ed4ae2-922f-42ef-ac38-176871668c0d'], // 서울교육일자리포털
  경기: [
    'f4c852f1-f49a-42c5-8823-0edd346f99bb', // 경기도 교육청 구인정보조회
    'de02eada-6569-45df-9f4d-45a4fcc51879', // 가평교육지원청
    'da3c6bc2-8b49-4f81-b0ed-556fa8001aab', // 고양교육지원청
    '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd', // 구리남양주 기간제교사
    'ce968fdd-6fe4-4fb7-8ec8-60d491932c6c', // 남양주교육지원청
    '5a94f47d-5feb-4821-99af-f8805cc3d619', // 성남교육지원청
    'd2845178-cbce-430d-b676-f07030562e2a', // 양평교육지원청
    '55d09cac-71aa-48d5-a8b8-bbd9181970bb', // 의정부교육지원청
  ],
  인천: [
    '0f46ad4f-3f43-45bf-b399-b1f4d05847a6', // 인천광역시교육청 채용공고
    'a54761b2-b9c6-4011-99f8-6f0ef8dd919a', // 인천교육청 채용공고
  ],
  강원: [
    '8b2fb1b5-bbb0-432a-9c84-d63b9e65b9e2', // 강원 교육청 구인게시판
    'cf81b8f5-0902-4cb7-8e2d-06b8f8b13a56', // 강원특별자치도교육청 학교인력채용
  ],
  부산: ['1657c5fd-6b82-40ef-b25d-eaa908e94ac5'], // 부산광역시교육청 학교인력채용
  대구: [
    'ef0e5e89-a4c8-452f-a29d-b782e774086c', // 대구광역시교육청 기간제교사·강사
    '7c6f1752-0893-4c10-8153-6f4f1430a5d3', // 대구광역시교육청 채용
  ],
  광주: [
    '0474051e-bb16-4804-b27c-f1dd5d5b5a9e', // 광주광역시 구인 게시판
    '5c08d727-5aea-4ed6-add4-83935ca2b74e', // 광주광역시교육청 채용공고
  ],
  대전: ['5c6f8c0a-25c0-4743-9490-cb2f5f1acb7d'], // 대전광역시교육청 학교인력채용
  울산: [
    '8ab2773a-75ca-43dd-957a-c1fb0fdff637', // 울산광역시교육청 일반채용공고
    'a35d2638-4f2f-44a7-baca-2a53badd7c43', // 울산광역시교육청 채용정보
    'a41f0928-7749-4bf3-bbd5-35c3fd883eaa', // 울산광역시교육청 인력풀
  ],
  세종: ['bd2df362-d71b-4431-8aac-f812dd232120'], // 세종특별자치시교육청 구인
  충북: [
    '903627e9-8bce-4e71-b8fe-ef343703615b', // 충청북도교육청 기간제교사 인력풀
    'd94286e3-098f-4cbd-b322-d09e31d1d03b', // 충청북도교육청 학교구인정보
  ],
  충청북: [
    '903627e9-8bce-4e71-b8fe-ef343703615b', // 충청북도교육청 기간제교사 인력풀
    'd94286e3-098f-4cbd-b322-d09e31d1d03b', // 충청북도교육청 학교구인정보 (별칭)
  ],
  충남: ['7e1f233d-b274-4b07-8a58-6abd3bcb3d9f'], // 충청남도교육청 채용공고
  충청남: ['7e1f233d-b274-4b07-8a58-6abd3bcb3d9f'], // 충청남도교육청 (별칭)
  충청: [
    '903627e9-8bce-4e71-b8fe-ef343703615b', // 충청북도 기간제교사 인력풀
    'd94286e3-098f-4cbd-b322-d09e31d1d03b', // 충청북도 학교구인정보
    '7e1f233d-b274-4b07-8a58-6abd3bcb3d9f', // 충청남도 채용공고
  ],
  전북: ['87aee3d0-b26a-424f-af84-6113d98920bc'], // 전북특별자치도교육청
  전라북: ['87aee3d0-b26a-424f-af84-6113d98920bc'], // 전북특별자치도교육청 (별칭)
  전남: ['f42a2e0c-7e4e-436a-bcd2-cd252b7843ae'], // 전라남도교육청
  전라남: ['f42a2e0c-7e4e-436a-bcd2-cd252b7843ae'], // 전라남도교육청 (별칭)
  전라: [
    '87aee3d0-b26a-424f-af84-6113d98920bc', // 전북
    'f42a2e0c-7e4e-436a-bcd2-cd252b7843ae', // 전남
  ],
  경북: ['f13bbaf3-a1ee-46d2-bacf-ac7868ce457e'], // 경상북도교육청 구인
  경상북: ['f13bbaf3-a1ee-46d2-bacf-ac7868ce457e'], // 경상북도교육청 구인 (별칭)
  경남: [
    '44297890-31b7-484f-929b-eeb3e83ab6e3', // 경남 교육청 구인구직 게시판
    '9b4832b3-4e10-4981-b937-2be135eb1e71', // 경상남도교육청 구인구직포털
  ],
  경상남: [
    '44297890-31b7-484f-929b-eeb3e83ab6e3', // 경남 교육청 구인구직 게시판 (별칭)
    '9b4832b3-4e10-4981-b937-2be135eb1e71', // 경상남도교육청 구인구직포털 (별칭)
  ],
  경상: [
    'f13bbaf3-a1ee-46d2-bacf-ac7868ce457e', // 경북
    '44297890-31b7-484f-929b-eeb3e83ab6e3', // 경남
    '9b4832b3-4e10-4981-b937-2be135eb1e71', // 경남 포털
  ],
  제주: [
    '38273acd-26ec-4a7d-8926-44310ca467e3', // 제주특별자치도교육청 채용공고
    'eab758d2-8815-44af-9f3c-f4cf1056788d', // 제주특별자치도교육청 채용정보
  ],
};

/**
 * 광역시도에 해당하는 크롤보드 ID 목록 반환
 */
export function getCrawlBoardIdsForProvince(province: string): string[] | null {
  return PROVINCE_TO_CRAWL_BOARD_IDS[province] || null;
}

/**
 * 광역시도 이름 목록 (검색 옵션용)
 */
export const PROVINCE_NAMES = Object.keys(PROVINCE_TO_CITIES);

/**
 * 광역시도 전체 검색 옵션 (UI 드롭다운용)
 */
export const PROVINCE_FULL_OPTIONS = PROVINCE_NAMES.map(
  (name) => `${name} 전체`
);

/**
 * 여러 광역시에 동일하게 존재하는 구 이름 (서구, 중구, 동구, 남구, 북구, 강서구)
 * 이 구 이름들은 CITY_TO_PROVINCE 역매핑에서 제외하여 잘못된 매핑 방지
 */
export const AMBIGUOUS_DISTRICTS = new Set([
  '서구', '중구', '동구', '남구', '북구', '강서구',
]);

/**
 * 역매핑: 기초자치단체 → 광역시도
 * 특정 기초자치단체가 어느 광역시도에 속하는지 찾을 때 사용
 * 주의: 여러 도시에 존재하는 동명 구(AMBIGUOUS_DISTRICTS)는 제외됨
 */
export const CITY_TO_PROVINCE: Record<string, string> = {};
for (const [province, cities] of Object.entries(PROVINCE_TO_CITIES)) {
  for (const city of cities) {
    if (AMBIGUOUS_DISTRICTS.has(city)) continue;
    CITY_TO_PROVINCE[city] = province;
  }
}

/**
 * 복합 교육지원청 매핑
 * - 2개 이상의 시/군을 하나의 교육지원청이 관할하는 경우
 * - 공고의 location에 "광주하남"처럼 합쳐진 형태로 저장됨
 */
export const COMPOSITE_REGIONS: Record<string, {
  province: string;
  cities: string[];
}> = {
  '광주하남': {
    province: '경기',
    cities: ['광주', '하남', '광주시', '하남시'],
  },
  '동두천양주': {
    province: '경기',
    cities: ['동두천', '양주', '동두천시', '양주시'],
  },
  '구리남양주': {
    province: '경기',
    cities: ['구리', '남양주', '구리시', '남양주시'],
  },
};

/**
 * 역매핑: 개별 도시 → 해당 도시를 포함하는 복합 교육지원청 목록
 * 향후 시/군/구 필터 확장 시 사용
 */
export const CITY_TO_COMPOSITE: Record<string, string[]> = {};
for (const [composite, data] of Object.entries(COMPOSITE_REGIONS)) {
  for (const city of data.cities) {
    if (!CITY_TO_COMPOSITE[city]) {
      CITY_TO_COMPOSITE[city] = [];
    }
    CITY_TO_COMPOSITE[city].push(composite);
  }
}

/**
 * 광역시도 풀네임 → 약칭 매핑
 * 크롤러 소스에서 "대구광역시", "충청북도" 등으로 저장된 경우 변환
 */
export const PROVINCE_FULL_NAMES: Record<string, string> = {
  // 풀네임 형태
  '서울특별시': '서울',
  '부산광역시': '부산',
  '대구광역시': '대구',
  '인천광역시': '인천',
  '광주광역시': '광주',
  '대전광역시': '대전',
  '울산광역시': '울산',
  '세종특별자치시': '세종',
  '경기도': '경기',
  '강원특별자치도': '강원',
  '강원도': '강원',
  '충청북도': '충북',
  '충청남도': '충남',
  '전북특별자치도': '전북',
  '전라북도': '전북',
  '전라남도': '전남',
  '경상북도': '경북',
  '경상남도': '경남',
  '제주특별자치도': '제주',
  // "도" 누락 형태 (DB에 잘못 저장된 경우)
  '충청북': '충북',
  '충청남': '충남',
  '전라북': '전북',
  '전라남': '전남',
  '경상북': '경북',
  '경상남': '경남',
};

/**
 * 위치 문자열에서 광역자치단체 추출
 * @param location - 공고의 location 필드 값
 * @returns 광역자치단체 약칭 (예: "서울", "경기") 또는 null
 */
export function getProvinceFromLocation(location: string): string | null {
  if (!location) return null;

  // 1단계: 풀네임 → 약칭 변환 (예: "대구광역시" → "대구")
  for (const [fullName, shortName] of Object.entries(PROVINCE_FULL_NAMES)) {
    if (location.includes(fullName)) {
      return shortName;
    }
  }

  // 2단계: 광역자치단체명 직접 포함 확인 (예: "서울 종로구", "경기 파주시")
  const provinces = Object.keys(PROVINCE_TO_CITIES);
  for (const province of provinces) {
    if (location.includes(province)) {
      return province;
    }
  }

  // 3단계: 복합 교육지원청 처리 (예: "광주하남" → "경기")
  for (const [composite, data] of Object.entries(COMPOSITE_REGIONS)) {
    if (location.includes(composite)) {
      return data.province;
    }
  }

  // 4단계: 기초자치단체명으로 광역자치단체 매핑 (예: "의정부" → "경기")
  const locationParts = location.split(/[\s,·]/);
  for (const part of locationParts) {
    // 정확한 매칭 시도
    if (CITY_TO_PROVINCE[part]) {
      return CITY_TO_PROVINCE[part];
    }

    // 접미사 제거 후 매칭 ("의정부시" → "의정부")
    const cleanPart = part.replace(/(시|군|구)$/, '');
    if (CITY_TO_PROVINCE[cleanPart]) {
      return CITY_TO_PROVINCE[cleanPart];
    }
  }

  return null;
}

/**
 * 광역시도명에서 검색 키워드 추출
 * 예: "경기도 전체" → "경기", "서울특별시 전체" → "서울"
 */
export function extractProvinceKey(regionFilter: string): string | null {
  // "전체" 제거
  let cleaned = regionFilter.replace(' 전체', '').replace('전체', '');

  // 광역시도 접미사 제거
  cleaned = cleaned
    .replace('특별시', '')
    .replace('광역시', '')
    .replace('특별자치시', '')
    .replace('특별자치도', '')
    .replace('도', '');

  // PROVINCE_TO_CITIES에 키가 있는지 확인
  if (PROVINCE_TO_CITIES[cleaned]) {
    return cleaned;
  }

  // 원본 값으로도 확인
  if (PROVINCE_TO_CITIES[regionFilter.replace(' 전체', '')]) {
    return regionFilter.replace(' 전체', '');
  }

  return null;
}

/**
 * 광역시도 전체 검색인지 확인
 * "서울", "경기" 등 광역시도명만 입력해도 전체 검색으로 처리
 */
export function isProvinceWideSearch(regionFilter: string): boolean {
  // "전체" 포함된 경우
  if (regionFilter.includes('전체') && extractProvinceKey(regionFilter) !== null) {
    return true;
  }

  // 광역시도명만 입력된 경우 (예: "서울", "경기", "부산")
  // PROVINCE_TO_CITIES의 키와 정확히 일치하면 전체 검색으로 처리
  if (PROVINCE_TO_CITIES[regionFilter]) {
    return true;
  }

  return false;
}

/**
 * 광역시도 전체 검색 시 해당 광역시도 내 모든 지역 목록 반환
 * @param regionFilter - 검색 필터 값 (예: "경기 전체", "서울 전체", "서울", "경기")
 * @returns 광역시도명 + 모든 기초자치단체명 배열
 */
export function expandProvinceToAllCities(regionFilter: string): string[] {
  // 먼저 PROVINCE_TO_CITIES의 키와 직접 매칭 시도 (예: "서울", "경기")
  if (PROVINCE_TO_CITIES[regionFilter]) {
    const cities = PROVINCE_TO_CITIES[regionFilter];
    return [regionFilter, ...cities];
  }

  // "전체" 포함된 경우 extractProvinceKey 사용
  const provinceKey = extractProvinceKey(regionFilter);

  if (!provinceKey) {
    // 광역시도 전체 검색이 아닌 경우 원본 반환
    return [regionFilter];
  }

  const cities = PROVINCE_TO_CITIES[provinceKey] || [];

  // 광역시도명 자체도 포함 (DB에 "경기", "서울" 등으로 저장된 경우 대응)
  return [provinceKey, ...cities];
}

/**
 * 위치에서 기초자치단체 추출 및 정규화
 * @param location - 원본 위치 문자열
 * @returns 정규화된 기초자치단체명
 */
function extractCityFromLocation(location: string): string {
  if (!location) return '';

  let city = location.trim();

  // 1. 광역시도 풀네임 제거 (예: "대구광역시 수성구" → "수성구")
  for (const fullName of Object.keys(PROVINCE_FULL_NAMES)) {
    city = city.replace(fullName, '').trim();
  }

  // 2. 광역시도 약칭 제거 (예: "경기 의정부시" → "의정부시")
  for (const shortName of Object.keys(PROVINCE_TO_CITIES)) {
    if (city.startsWith(shortName + ' ')) {
      city = city.replace(shortName + ' ', '').trim();
      break;
    }
    // 정확히 광역시도명만 있는 경우
    if (city === shortName) {
      return '';
    }
  }

  // 3. "시" 접미사 제거 (구, 군은 유지)
  // 예: "의정부시" → "의정부", "중랑구" → "중랑구", "가평군" → "가평군"
  if (city.endsWith('시') && city.length > 1) {
    city = city.slice(0, -1);
  }

  return city.trim();
}

/**
 * 위치 문자열을 "광역 기초" 형식으로 변환
 *
 * @param location - 원본 위치 (예: "의정부", "중랑구", "경기 의정부시")
 * @param metropolitanRegion - DB에서 가져온 광역자치단체 (예: "인천", "서울")
 *   동명 구(서구, 중구, 동구 등)가 여러 도시에 존재하므로 이 값이 있으면 우선 사용
 * @returns 포맷된 위치 (예: "경기 의정부", "서울 중랑구", "인천 서구")
 *
 * @example
 * formatLocationDisplay("의정부") // "경기 의정부"
 * formatLocationDisplay("중랑구") // "서울 중랑구"
 * formatLocationDisplay("서구", "인천") // "인천 서구"
 * formatLocationDisplay("서구") // "서구" (province 판별 불가 시 원본)
 */
export function formatLocationDisplay(location: string, metropolitanRegion?: string | null): string {
  if (!location) return '';

  // 1. 광역자치단체 추출 (metropolitanRegion 우선, 없으면 location에서 추론)
  let province: string | null = null;

  if (metropolitanRegion) {
    // DB에 저장된 metropolitan_region 정규화 (풀네임→약칭)
    province = PROVINCE_FULL_NAMES[metropolitanRegion] || metropolitanRegion;
  }

  if (!province) {
    province = getProvinceFromLocation(location);
  }

  // 2. 기초자치단체 추출 및 정리
  const city = extractCityFromLocation(location);

  // 3. 결합
  if (province && city) {
    return `${province} ${city}`;
  }

  // 광역만 있는 경우 (예: "서울", "경기")
  if (province && !city) {
    return province;
  }

  // 파싱 실패 시 원본 반환
  return location;
}
