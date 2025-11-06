/**
 * 계층형 관심분야 카테고리
 * 1단계: 대분류 (6개)
 * 2단계: 소분류 (각 대분류별 3-8개)
 */

export interface FieldCategory {
  id: string;
  label: string;
  icon?: string;
  subcategories: FieldSubcategory[];
}

export interface FieldSubcategory {
  id: string;
  label: string;
  description?: string;
}

export const HIERARCHICAL_FIELDS: FieldCategory[] = [
  {
    id: 'teaching',
    label: '교과 수업',
    icon: 'book',
    subcategories: [
      { id: 'elementary', label: '초등교과', description: '초등학교 교과 (직접 입력)' },
      { id: 'middle', label: '중등교과', description: '중학교 교과 (직접 입력)' },
      { id: 'early_childhood', label: '유아교육', description: '유아 대상 교육' },
      { id: 'literacy', label: '기초학력', description: '기초학력 지원' },
    ],
  },
  {
    id: 'creative',
    label: '미래·체험·예술',
    icon: 'palette',
    subcategories: [
      { id: 'coding', label: '코딩', description: '프로그래밍 교육' },
      { id: 'ai', label: 'AI교육', description: '인공지능 관련 교육' },
      { id: 'steam', label: 'STEAM 교육', description: '융합 과학 교육' },
      { id: 'maker', label: '메이커 교육', description: '만들기 체험' },
      { id: 'creative_fusion', label: '창의융합교육', description: '창의적 융합 학습' },
      { id: 'music', label: '음악', description: '음악 교육' },
      { id: 'art', label: '미술교육', description: '미술 교육' },
      { id: 'cooking', label: '요리', description: '요리 체험' },
      { id: 'drama', label: '연극·뮤지컬', description: '공연 예술' },
      { id: 'dance', label: '무용교육', description: '춤 교육' },
      { id: 'video', label: '영상제작', description: '영상 제작' },
    ],
  },
  {
    id: 'counseling',
    label: '상담·진로·인성',
    icon: 'headphones',
    subcategories: [
      { id: 'career', label: '진로교육', description: '진로 상담 및 교육' },
      { id: 'counseling', label: '심리상담', description: '심리 상담' },
      { id: 'character', label: '인성교육', description: '인성 교육' },
      { id: 'human_rights', label: '인권교육', description: '인권 교육' },
      { id: 'gifted', label: '영재교육', description: '영재 교육' },
    ],
  },
  {
    id: 'support',
    label: '행정·지원·방과후',
    icon: 'briefcase',
    subcategories: [
      { id: 'admin', label: '행정업무 보조', description: '학교 행정 지원' },
      { id: 'afterschool', label: '방과후·돌봄', description: '방과후 활동 및 돌봄' },
      { id: 'mentoring', label: '멘토링', description: '개인 멘토링' },
      { id: 'parent_education', label: '학부모 교육', description: '학부모 대상 교육' },
      { id: 'staff_training', label: '교직원 연수', description: '교직원 대상 연수' },
      { id: 'teacher_rights', label: '교권보호', description: '교권 보호' },
    ],
  },
  {
    id: 'environment',
    label: '사회·환경·안전',
    icon: 'globe',
    subcategories: [
      { id: 'esd', label: '지속가능발전교육(ESD)', description: '지속가능 발전 교육' },
      { id: 'ecology', label: '생태환경', description: '환경 교육' },
      { id: 'safety', label: '안전교육', description: '안전 교육' },
      { id: 'first_aid', label: '응급처치', description: '응급처치 교육' },
      { id: 'health', label: '보건교육', description: '보건 교육' },
      { id: 'sex_education', label: '성교육', description: '성 교육' },
      { id: 'multicultural', label: '다문화 교육', description: '다문화 교육' },
      { id: 'korean', label: '한국어 교육', description: '한국어 교육' },
    ],
  },
  {
    id: 'special',
    label: '특수·기타',
    icon: 'star',
    subcategories: [
      { id: 'special_education', label: '특수교육', description: '특수 교육' },
      { id: 'disabled_support', label: '장애학생 지원', description: '장애학생 지원' },
      { id: 'inclusive_education', label: '통합교육', description: '통합 교육' },
      { id: 'early_childhood', label: '유아놀이', description: '유아 놀이 교육' },
      { id: 'reading_coaching', label: '독서코칭', description: '독서 코칭' },
      { id: 'edutech', label: '에듀테크', description: '교육 기술' },
      { id: 'programming', label: '프로그래밍 교육', description: '프로그래밍 교육' },
      { id: 'materials', label: '교육자료 제작', description: '교육 자료 제작' },
      { id: 'job_posting', label: '공고 등록', description: '채용 공고 등록' },
      { id: 'recruitment', label: '대체인력 구함', description: '대체 인력 모집' },
      { id: 'experience_program', label: '성인대상 각종 체험프로그램 운영', description: '성인 대상 체험 프로그램' },
      { id: 'other', label: '기타', description: '기타' },
    ],
  },
];

/**
 * 평탄화된 필드 목록 (기존 코드와의 호환성)
 */
export function getFlattenedFields(): string[] {
  return HIERARCHICAL_FIELDS.flatMap(category =>
    category.subcategories.map(sub => sub.label)
  );
}

/**
 * 필드 ID로 라벨 찾기
 */
export function getFieldLabelById(categoryId: string, subcategoryId: string): string | null {
  const category = HIERARCHICAL_FIELDS.find(c => c.id === categoryId);
  if (!category) return null;
  const subcategory = category.subcategories.find(s => s.id === subcategoryId);
  return subcategory?.label ?? null;
}

/**
 * 라벨로 필드 ID 찾기
 */
export function getFieldIdByLabel(label: string): { categoryId: string; subcategoryId: string } | null {
  for (const category of HIERARCHICAL_FIELDS) {
    const subcategory = category.subcategories.find(s => s.label === label);
    if (subcategory) {
      return { categoryId: category.id, subcategoryId: subcategory.id };
    }
  }
  return null;
}
