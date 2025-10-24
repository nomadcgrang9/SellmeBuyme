export const REGION_OPTIONS = [
  '서울 전체',
  '경기도 전체',
  '수원',
  '고양',
  '용인',
  '성남',
  '부천',
  '안산',
  '안양',
  '화성',
  '평택',
  '시흥',
  '의정부',
  '파주',
  '김포',
  '광명',
  '광주',
  '군포',
  '오산',
  '이천',
  '안성',
  '구리',
  '남양주',
  '의왕',
  '하남',
  '포천',
  '여주',
  '동두천',
  '과천',
  '가평',
  '양주',
  '양평',
  '연천'
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
