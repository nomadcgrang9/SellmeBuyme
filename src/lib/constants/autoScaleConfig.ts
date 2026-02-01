/**
 * 자동 스케일업 설정
 *
 * 목적: 필터 결과가 부족할 때 자동으로 검색 범위를 확장하여
 *       사용자에게 충분한 검색 결과를 제공
 */

/**
 * 자동 스케일업 설정 상수
 */
/**
 * Kakao Maps Level 체계:
 * - Level 1: ~20m (가장 상세)
 * - Level 5: ~500m (동네 수준)
 * - Level 8: ~4km (구/군 수준)
 * - Level 10: ~16km (시/도 수준)
 * - Level 13: ~128km (전국 수준)
 * - Level 14: ~256km (최대 줌아웃)
 */
export const AUTO_SCALE_CONFIG = {
  /** 최소 결과 임계값 - 이 수보다 적으면 범위 확장 */
  MIN_RESULTS_THRESHOLD: 3,

  /** 줌 레벨 확장 단계 (현재 줌에서 얼마나 줌아웃할지) */
  ZOOM_EXPANSION_STEPS: [2, 3, 4] as const,

  /** 최대 확장 시도 횟수 */
  MAX_EXPANSION_ATTEMPTS: 3,

  /** 전국 검색으로 바로 이동하는 최소 줌 레벨 (이미 충분히 넓으면 전국 검색) */
  NATIONAL_SEARCH_ZOOM: 10,

  /** 기본 줌 레벨 (지역 검색 시) */
  DEFAULT_ZOOM: 5,

  /** 전국 줌 레벨 (Kakao Maps level 12 = 약 64km 반경, 한반도 전체 보기) */
  NATIONAL_ZOOM: 12,

  /** 범위 확장 애니메이션 지속 시간 (ms) */
  EXPANSION_ANIMATION_DURATION: 500,
};

/**
 * 희귀 카테고리 목록
 * 이 카테고리들은 공고가 매우 적어서 즉시 전국 검색으로 확장
 */
export const RARE_CATEGORIES = [
  // 교과과목 중 희귀
  '지구과학',
  '제2외국어',
  '일본어',
  '중국어',
  '프랑스어',
  '독일어',
  '스페인어',
  '한문',

  // 비교과 중 희귀
  '사서',
  '영양교사',

  // 특수
  '특수',

  // 교원연수 중 희귀
  '영재교육',
  '전통문화',
  '인권/노동',
];

/**
 * 희귀 카테고리인지 확인
 */
export function isRareCategory(category: string | null): boolean {
  if (!category) return false;
  return RARE_CATEGORIES.includes(category);
}

/**
 * 희귀 카테고리 또는 그 하위 카테고리인지 확인
 */
export function shouldExpandToNational(
  primaryCategory: string | null,
  secondaryCategory: string | null
): boolean {
  // 1차 카테고리가 희귀한 경우
  if (primaryCategory && RARE_CATEGORIES.includes(primaryCategory)) {
    return true;
  }

  // 2차 카테고리가 희귀한 경우
  if (secondaryCategory && RARE_CATEGORIES.includes(secondaryCategory)) {
    return true;
  }

  return false;
}

/**
 * 자동 스케일업 결과 타입
 */
export interface AutoScaleResult {
  /** 확장이 발생했는지 */
  expanded: boolean;
  /** 새로운 줌 레벨 */
  newZoom: number | null;
  /** 새로운 중심 좌표 (전국 검색 시) */
  newCenter: { lat: number; lng: number } | null;
  /** 확장 사유 메시지 */
  message: string | null;
  /** 원래 위치로 돌아가는 데이터 */
  originalState: {
    zoom: number;
    center: { lat: number; lng: number };
  } | null;
}

/**
 * 전국 중심 좌표 (대한민국 중부)
 */
export const KOREA_CENTER = {
  lat: 36.5,
  lng: 127.8,
};

/**
 * 줌 레벨에 따른 검색 반경 (대략적 km)
 */
export const ZOOM_TO_RADIUS: Record<number, number> = {
  7: 300,   // 전국
  8: 150,   // 광역
  9: 75,    // 도 단위
  10: 40,   // 시/군 광역
  11: 20,   // 시/군
  12: 10,   // 구 단위
  13: 5,    // 동 단위
  14: 2.5,  // 상세
  15: 1,    // 최상세
};

/**
 * 다음 확장 줌 레벨 계산
 * Kakao Maps: level이 높을수록 넓은 영역 (level 1 = 가장 좁음, level 14 = 가장 넓음)
 */
export function getNextExpansionZoom(currentZoom: number, attemptIndex: number): number {
  const step = AUTO_SCALE_CONFIG.ZOOM_EXPANSION_STEPS[attemptIndex];
  if (!step) {
    // 모든 단계를 초과한 경우 전국 줌
    return AUTO_SCALE_CONFIG.NATIONAL_ZOOM;
  }

  // Kakao Maps: 줌 아웃 = level 증가
  const newZoom = currentZoom + step;
  return Math.min(newZoom, AUTO_SCALE_CONFIG.NATIONAL_ZOOM);
}

/**
 * 확장 메시지 생성
 */
export function getExpansionMessage(
  category: string | null,
  resultCount: number,
  isNational: boolean
): string {
  if (isNational) {
    return `'${category || '선택한 조건'}' 공고를 찾기 위해 전국으로 검색 범위를 확장했습니다`;
  }

  if (resultCount === 0) {
    return `현재 지역에 '${category || '선택한 조건'}' 공고가 없어 검색 범위를 확장했습니다`;
  }

  return `더 많은 '${category || '선택한 조건'}' 공고를 보여드리기 위해 검색 범위를 확장했습니다`;
}
