// 서울 하위 지역 (25개 구)
export const SEOUL_SUBREGIONS = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구',
  '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구',
  '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구',
  '은평구', '종로구', '중구', '중랑구'
];

// 부산 하위 지역 (16개 구군)
export const BUSAN_SUBREGIONS = [
  '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구',
  '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'
];

// 대구 하위 지역 (8개 구군)
export const DAEGU_SUBREGIONS = [
  '중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군'
];

// 인천 하위 지역 (10개 구군)
export const INCHEON_SUBREGIONS = [
  '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구',
  '강화군', '옹진군'
];

// 광주 하위 지역 (5개 구)
export const GWANGJU_SUBREGIONS = [
  '동구', '서구', '남구', '북구', '광산구'
];

// 대전 하위 지역 (5개 구)
export const DAEJEON_SUBREGIONS = [
  '동구', '중구', '서구', '유성구', '대덕구'
];

// 울산 하위 지역 (5개 구군)
export const ULSAN_SUBREGIONS = [
  '중구', '남구', '동구', '북구', '울주군'
];

// 경기도 하위 지역 (31개 시군)
export const GYEONGGI_SUBREGIONS = [
  '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시',
  '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시',
  '김포시', '군포시', '광주시', '이천시', '양주시', '오산시', '구리시',
  '안성시', '포천시', '의왕시', '하남시', '여주시', '양평군', '동두천시',
  '과천시', '가평군', '연천군'
];

// 강원도 하위 지역 (18개 시군)
export const GANGWON_SUBREGIONS = [
  '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시',
  '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군',
  '양구군', '인제군', '고성군', '양양군'
];

// 충북 하위 지역 (11개 시군)
export const CHUNGBUK_SUBREGIONS = [
  '청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군',
  '진천군', '괴산군', '음성군', '단양군'
];

// 충남 하위 지역 (15개 시군)
export const CHUNGNAM_SUBREGIONS = [
  '천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시',
  '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'
];

// 전북 하위 지역 (14개 시군)
export const JEONBUK_SUBREGIONS = [
  '전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군',
  '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'
];

// 전남 하위 지역 (22개 시군)
export const JEONNAM_SUBREGIONS = [
  '목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군',
  '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군',
  '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'
];

// 경북 하위 지역 (23개 시군)
export const GYEONGBUK_SUBREGIONS = [
  '포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시',
  '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군',
  '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'
];

// 경남 하위 지역 (18개 시군)
export const GYEONGNAM_SUBREGIONS = [
  '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시',
  '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군',
  '산청군', '함양군', '거창군', '합천군'
];

// 제주 하위 지역 (2개 시)
export const JEJU_SUBREGIONS = [
  '제주시', '서귀포시'
];

// 계층적 지역 옵션 인터페이스
export interface RegionWithSubregions {
  name: string;
  subregions?: string[];
}

// 계층적 지역 옵션 (하위 지역 포함)
export const REGION_OPTIONS_HIERARCHICAL: RegionWithSubregions[] = [
  { name: '서울', subregions: SEOUL_SUBREGIONS },
  { name: '부산', subregions: BUSAN_SUBREGIONS },
  { name: '대구', subregions: DAEGU_SUBREGIONS },
  { name: '인천', subregions: INCHEON_SUBREGIONS },
  { name: '광주', subregions: GWANGJU_SUBREGIONS },
  { name: '대전', subregions: DAEJEON_SUBREGIONS },
  { name: '울산', subregions: ULSAN_SUBREGIONS },
  { name: '세종' }, // 세종은 단일 행정구역
  { name: '경기', subregions: GYEONGGI_SUBREGIONS },
  { name: '강원', subregions: GANGWON_SUBREGIONS },
  { name: '충북', subregions: CHUNGBUK_SUBREGIONS },
  { name: '충남', subregions: CHUNGNAM_SUBREGIONS },
  { name: '전북', subregions: JEONBUK_SUBREGIONS },
  { name: '전남', subregions: JEONNAM_SUBREGIONS },
  { name: '경북', subregions: GYEONGBUK_SUBREGIONS },
  { name: '경남', subregions: GYEONGNAM_SUBREGIONS },
  { name: '제주', subregions: JEJU_SUBREGIONS }
];

// 기존 호환성을 위한 플랫 지역 옵션
export const REGION_OPTIONS = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주'
];

export const CATEGORY_OPTIONS = [
  '전분야',
  '코딩',
  '영어',
  '수학',
  '과학',
  '예체능',
  '음악',
  '미술',
  '방과후',
  '돌봄',
  '특수교육',
  '상담',
  '행정',
  '기타'
];

export const SORT_OPTIONS = [
  { value: '추천순', label: '추천순' },
  { value: '최신순', label: '최신순' },
  { value: '마감임박순', label: '마감임박순' },
  { value: '평점높은순', label: '평점높은순' },
  { value: '급여높은순', label: '급여높은순' },
  { value: '경력무관', label: '경력무관' }
] as const;

export const DEFAULT_REGION = REGION_OPTIONS[0];
export const DEFAULT_CATEGORY = CATEGORY_OPTIONS[0];
export const DEFAULT_SORT = SORT_OPTIONS[0].value;
