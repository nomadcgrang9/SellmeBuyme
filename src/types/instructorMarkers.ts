// 교원연수 강사 마커 타입 정의
// 작성일: 2026-01-29

// ============================================
// 전문분야 20개
// ============================================
export const INSTRUCTOR_SPECIALTIES = [
  '에듀테크/AI',
  '다문화/세계시민',
  '특수/통합교육',
  '생활지도/상담',
  '학교폭력예방',
  '마음챙김/인성',
  '진로/직업',
  '융합/STEAM',
  '예술교육',
  '독서/논술',
  '영재교육',
  '기초학력',
  '수업/평가혁신',
  '환경/탄소중립',
  '학교안전',
  '학부모교육',
  '유아/놀이',
  '인권/노동',
  '교양/자기계발',
  '전통문화',
] as const;

export type InstructorSpecialty = typeof INSTRUCTOR_SPECIALTIES[number];

// ============================================
// 전문분야별 세부분야 (참고용)
// ============================================
export const SPECIALTY_DETAILS: Record<InstructorSpecialty, string[]> = {
  '에듀테크/AI': ['하이러닝', 'AI활용수업', '디지털리터러시', '메타버스'],
  '다문화/세계시민': ['다문화감수성', 'KSL한국어', '국제이해', 'SDGs'],
  '특수/통합교육': ['장애이해', '통합학급운영', '개별화교육'],
  '생활지도/상담': ['학급경영', '학생상담', '위기학생지원', '또래상담'],
  '학교폭력예방': ['회복적생활교육', '갈등중재', '사이버폭력'],
  '마음챙김/인성': ['사회정서학습(SEL)', '회복탄력성', '명상', '감정코칭'],
  '진로/직업': ['진로상담', '고교학점제', '창업교육'],
  '융합/STEAM': ['PBL', '메이커교육', '실험탐구'],
  '예술교육': ['음악', '미술', '연극', '공예'],
  '독서/논술': ['독서토론', '글쓰기지도', '서논술형평가'],
  '영재교육': ['영재판별', '창의성개발', '발명교육'],
  '기초학력': ['학습코칭', '문해력', '수리력'],
  '수업/평가혁신': ['IB교육', '과정중심평가', '수업컨설팅'],
  '환경/탄소중립': ['기후변화교육', '생태전환', '지속가능발전'],
  '학교안전': ['응급처치', '심폐소생술', '재난대응'],
  '학부모교육': ['자녀소통', '학습지도법', '진로코칭'],
  '유아/놀이': ['놀이중심교육', '유아발달이해'],
  '인권/노동': ['교권보호', '학생인권', '노동인권', '양성평등'],
  '교양/자기계발': ['재테크', '외국어', '사진', '여행'],
  '전통문화': ['한국전통문화', '예절교육', '다도', '서예'],
};

// ============================================
// 연수 대상
// ============================================
export const TARGET_AUDIENCE_OPTIONS = ['교원', '학부모', '교직원', '기타'] as const;
export type TargetAudience = typeof TARGET_AUDIENCE_OPTIONS[number];

// ============================================
// 대표 분야 5개 (필터바 칩)
// ============================================
export const POPULAR_SPECIALTIES: InstructorSpecialty[] = [
  '에듀테크/AI',
  '생활지도/상담',
  '학부모교육',
  '수업/평가혁신',
  '학교폭력예방',
];

// ============================================
// 마커 색상
// ============================================
export const INSTRUCTOR_MARKER_COLORS = {
  base: '#F9A8D4',      // 소프트 핑크 (기본)
  light: '#FDF2F8',     // 밝은 핑크 (배경)
  text: '#BE185D',      // 진한 핑크 (텍스트)
  selected: '#EC4899',  // 핑크 (선택 시)
  border: '#FFFFFF',    // 흰색 (테두리)
} as const;

// ============================================
// 마커 타입
// ============================================
export interface InstructorMarker {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  display_name: string;
  email: string;
  specialties: InstructorSpecialty[];
  custom_specialty?: string | null;
  available_regions: string[];
  experience_years?: string | null;
  target_audience: TargetAudience[];
  activity_history?: string | null;
  profile_image_url?: string | null;
  privacy_agreed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// 입력 타입
// ============================================
export interface InstructorMarkerInput {
  user_id: string;
  latitude: number;
  longitude: number;
  display_name: string;
  email: string;
  specialties: InstructorSpecialty[];
  custom_specialty?: string;
  available_regions: string[];
  experience_years?: string;
  target_audience: TargetAudience[];
  activity_history?: string;
  profile_image_url?: string;
  privacy_agreed: boolean;
}

// ============================================
// 수정 타입
// ============================================
export interface InstructorMarkerUpdate {
  display_name?: string;
  email?: string;
  specialties?: InstructorSpecialty[];
  custom_specialty?: string | null;
  available_regions?: string[];
  experience_years?: string | null;
  target_audience?: TargetAudience[];
  activity_history?: string | null;
  profile_image_url?: string | null;
  is_active?: boolean;
}

// ============================================
// 필터 타입
// ============================================
export interface InstructorMarkerFilters {
  specialties?: InstructorSpecialty[];
  regions?: string[];
  targetAudience?: TargetAudience[];
  searchKeyword?: string;
}
