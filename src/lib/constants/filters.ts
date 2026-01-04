// 경기도 하위 지역 (31개 시군)
export const GYEONGGI_SUBREGIONS = [
  '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시',
  '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시',
  '김포시', '군포시', '광주시', '이천시', '양주시', '오산시', '구리시',
  '안성시', '포천시', '의왕시', '하남시', '여주시', '양평군', '동두천시',
  '과천시', '가평군', '연천군'
];

// 계층적 지역 옵션 인터페이스
export interface RegionWithSubregions {
  name: string;
  subregions?: string[];
}

// 계층적 지역 옵션 (하위 지역 포함)
export const REGION_OPTIONS_HIERARCHICAL: RegionWithSubregions[] = [
  { name: '서울' },
  { name: '부산' },
  { name: '대구' },
  { name: '인천' },
  { name: '광주' },
  { name: '대전' },
  { name: '울산' },
  { name: '세종' },
  { name: '경기', subregions: GYEONGGI_SUBREGIONS },
  { name: '강원' },
  { name: '충북' },
  { name: '충남' },
  { name: '전북' },
  { name: '전남' },
  { name: '경북' },
  { name: '경남' },
  { name: '제주' }
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
