/**
 * 카드 이미지 매핑 유틸리티
 *
 * 인력/체험 카드의 specialty/category에 따라
 * 적절한 이미지 경로를 반환합니다.
 */

/**
 * 인력 전문분야에 따른 이미지 경로 반환
 *
 * @param specialty - 전문분야 문자열 또는 specialty 객체
 * @returns 이미지 경로
 */
export function getTalentImage(specialty: string | any): string {
  // specialty가 문자열인 경우 (기존 DB 데이터)
  if (typeof specialty === 'string') {
    const normalized = specialty.toLowerCase().replace(/\s+/g, '');

    // 키워드 기반 매칭
    if (normalized.includes('기간제') || normalized.includes('교사')) {
      return '/picture/talents/teacher.png';
    }
    if (normalized.includes('방과후')) {
      return '/picture/talents/afterschool.png';
    }
    if (normalized.includes('늘봄')) {
      return '/picture/talents/neulbom.png';
    }
    if (normalized.includes('상담')) {
      return '/picture/talents/counseling.png';
    }
    if (normalized.includes('진로')) {
      return '/picture/talents/career.png';
    }
    if (normalized.includes('협력')) {
      return '/picture/talents/partner.png';
    }
    if (normalized.includes('연수') || normalized.includes('강의')) {
      return '/picture/talents/training.png';
    }
  }

  // specialty가 객체인 경우 (폼 데이터 구조)
  // 우선순위: 첫 번째로 true인 specialty 사용
  if (typeof specialty === 'object' && specialty !== null) {
    if (specialty.contractTeacher?.enabled) {
      return '/picture/talents/teacher.png';
    }
    if (specialty.afterSchool) {
      return '/picture/talents/afterschool.png';
    }
    if (specialty.neulbom) {
      return '/picture/talents/neulbom.png';
    }
    if (specialty.counseling) {
      return '/picture/talents/counseling.png';
    }
    if (specialty.careerEducation) {
      return '/picture/talents/career.png';
    }
    if (specialty.cooperativeInstructor) {
      return '/picture/talents/partner.png';
    }
    if (specialty.adultTraining) {
      return '/picture/talents/training.png';
    }
  }

  // 매칭되지 않으면 기본 이미지
  return '/picture/talents/default.png';
}

/**
 * 체험 카테고리에 따른 이미지 경로 반환
 *
 * @param categories - 카테고리 배열
 * @returns 이미지 경로
 */
export function getExperienceImage(categories: string[]): string {
  if (!categories || categories.length === 0) {
    return '/picture/experiences/default.png';
  }

  // 카테고리 → 이미지 파일명 매핑
  const categoryMap: Record<string, string> = {
    '진로체험': '/picture/experiences/career.png',
    '문화예술': '/picture/experiences/culture.png',
    '과학기술': '/picture/experiences/science.png',
    '스포츠/건강': '/picture/experiences/sports.webp',
    '창의융합': '/picture/experiences/creative.png',
    '환경/생태': '/picture/experiences/environment.png',
    '안전/보건': '/picture/experiences/safety.png',
    '인문/역사': '/picture/experiences/humanities.png',
    '사회/경제': '/picture/experiences/social.png',
    '인성교육': '/picture/experiences/humanities.png', // 인문/역사로 매핑
    '체험활동': '/picture/experiences/creative.png',   // 창의융합으로 매핑
  };

  // 첫 번째 카테고리로 매칭
  const firstCategory = categories[0];
  const imagePath = categoryMap[firstCategory];

  if (imagePath) {
    return imagePath;
  }

  // 매칭되지 않으면 키워드로 재시도
  const normalized = firstCategory.toLowerCase().replace(/\s+/g, '');
  if (normalized.includes('진로')) return '/picture/experiences/career.png';
  if (normalized.includes('문화') || normalized.includes('예술')) return '/picture/experiences/culture.png';
  if (normalized.includes('과학') || normalized.includes('기술')) return '/picture/experiences/science.png';
  if (normalized.includes('스포츠') || normalized.includes('건강') || normalized.includes('체육')) return '/picture/experiences/sports.webp';
  if (normalized.includes('창의') || normalized.includes('융합')) return '/picture/experiences/creative.png';
  if (normalized.includes('환경') || normalized.includes('생태')) return '/picture/experiences/environment.png';
  if (normalized.includes('안전') || normalized.includes('보건')) return '/picture/experiences/safety.png';
  if (normalized.includes('인문') || normalized.includes('역사') || normalized.includes('인성')) return '/picture/experiences/humanities.png';
  if (normalized.includes('사회') || normalized.includes('경제')) return '/picture/experiences/social.png';

  return '/picture/experiences/default.png';
}

/**
 * 이미지 로드 실패 시 기본 이미지로 폴백
 *
 * @param e - 이미지 에러 이벤트
 * @param type - 카드 타입 ('talent' | 'experience')
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  type: 'talent' | 'experience'
) {
  const defaultImage = type === 'talent'
    ? '/picture/talents/default.png'
    : '/picture/experiences/default.png';

  e.currentTarget.src = defaultImage;
  console.warn(`[cardImages] 이미지 로드 실패, 기본 이미지로 대체: ${defaultImage}`);
}
