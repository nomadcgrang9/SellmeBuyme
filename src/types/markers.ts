// 마커 관련 타입 정의
// 작성일: 2026-01-12

// 닉네임 생성용 캐릭터/형용사 풀
export const NICKNAME_ADJECTIVES = [
  '반짝이는', '졸린', '신나는', '수줍은', '용감한', '따뜻한',
  '시원한', '달콤한', '새콤한', '포근한', '활기찬', '차분한',
  '명랑한', '씩씩한', '귀여운', '똑똑한', '부지런한', '느긋한'
] as const;

export const NICKNAME_CHARACTERS = [
  '셀리', '코리', '타이디', '프롱', '하이', '라니아', '호크'
] as const;

// 과목 옵션
export const SUBJECT_OPTIONS = [
  '국어', '수학', '영어', '과학', '사회',
  '음악', '미술', '체육', '정보', '기타'
] as const;

// 학교급 옵션
export const SCHOOL_LEVEL_OPTIONS = [
  '유치원', '초등', '중등', '고등', '특수'
] as const;

// 경력 옵션
export const EXPERIENCE_OPTIONS = [
  '신입', '1~3년', '3~5년', '5~10년', '10년 이상'
] as const;

// 활동 가능 지역 옵션
export const REGION_OPTIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
] as const;
export const TARGET_GRADE_OPTIONS = [
  '유아', '초1-2', '초3-4', '초5-6', '중등', '고등', '전학년'
] as const;

// 프로그램 카테고리 (고정)
export const PROGRAM_CATEGORIES = [
  // 체험학습 분야
  '진로체험', '과학체험', '코딩교육', '공예체험',
  '요리체험', '생태환경', '역사문화',
  // 예체능 분야
  '음악', '미술', '체육/스포츠', '무용/댄스', '연극/공연',
  // 교육 분야
  '독서/논술', '외국어', '심리/상담', '안전교육', '미디어/영상'
] as const;

// 마커 레이어 타입
export type MarkerLayer = 'job' | 'teacher' | 'program';

// 마커 색상 정의
export const MARKER_COLORS = {
  job: '#3B82F6',      // Blue (학교공고)
  teacher: '#10B981',  // Emerald (구직교사)
  program: '#F59E0B'   // Amber (체험프로그램)
} as const;

// 구직 교사 마커 타입
export interface TeacherMarker {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  nickname: string;
  email: string;
  subjects?: string[];
  other_subject?: string;
  school_levels?: string[];
  experience_years?: string;
  available_regions?: string[];
  introduction?: string;
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 구직 교사 마커 생성 입력
export interface TeacherMarkerInput {
  latitude: number;
  longitude: number;
  nickname: string;
  email: string;
  subjects?: string[];
  other_subject?: string;
  school_levels?: string[];
  experience_years?: string;
  available_regions?: string[];
  introduction?: string;
  profile_image_url?: string;
}

// 프로그램 마커 타입
export interface ProgramMarker {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  program_title: string;
  target_grades: string[];
  contact_email: string;
  description: string;
  contact_phone?: string;
  categories?: string[];
  custom_tags?: string[];
  price_info?: string;
  portfolio_url?: string;
  image_urls?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 프로그램 마커 생성 입력
export interface ProgramMarkerInput {
  latitude: number;
  longitude: number;
  program_title: string;
  target_grades: string[];
  contact_email: string;
  description: string;
  contact_phone?: string;
  categories?: string[];
  custom_tags?: string[];
  price_info?: string;
  portfolio_url?: string;
  image_urls?: string[];
}

// 마커 코멘트 타입
export interface MarkerComment {
  id: string;
  marker_type: 'teacher' | 'program';
  marker_id: string;
  user_id?: string;
  author_name: string;
  content: string;
  is_visible: boolean;
  created_at: string;
}

// 마커 코멘트 생성 입력
export interface MarkerCommentInput {
  marker_type: 'teacher' | 'program';
  marker_id: string;
  author_name?: string;
  content: string;
}

// 마커 필터 타입
export interface MarkerFilters {
  layers: MarkerLayer[];
  subjects?: string[];
  schoolLevels?: string[];
  categories?: string[];
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// 닉네임 생성 함수
export function generateRandomNickname(): string {
  const adjective = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const character = NICKNAME_CHARACTERS[Math.floor(Math.random() * NICKNAME_CHARACTERS.length)];
  return `${adjective} ${character}`;
}
