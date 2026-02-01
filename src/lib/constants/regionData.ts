/**
 * 동일 지역명 충돌 레지스트리
 *
 * 목적: 경기 광주시 vs 광주광역시, 강원 고성 vs 경남 고성 등
 *       동일한 이름을 가진 지역들을 구분하기 위한 데이터
 */

export interface ConflictingRegion {
  province: string;       // 광역시도 (예: '경기', '광주')
  fullName: string;       // 전체 표시명 (예: '경기 광주시', '광주광역시')
  type: 'si' | 'gun' | 'gu' | 'metropolitan' | 'special';  // 지역 유형
  description?: string;   // 추가 설명
}

/**
 * 충돌 지역 레지스트리
 * 키: 공통 이름 (예: '광주', '고성', '중구')
 * 값: 해당 이름을 사용하는 모든 지역 목록
 */
export const CONFLICTING_REGIONS: Record<string, ConflictingRegion[]> = {
  // === 심각한 충돌: 완전히 다른 광역시/도의 지역 ===

  '광주': [
    { province: '경기', fullName: '경기 광주시', type: 'si', description: '경기도 광주시' },
    { province: '광주', fullName: '광주광역시', type: 'metropolitan', description: '광주광역시 (전라도)' },
  ],

  '고성': [
    { province: '강원', fullName: '강원 고성군', type: 'gun', description: '강원특별자치도 고성군' },
    { province: '경남', fullName: '경남 고성군', type: 'gun', description: '경상남도 고성군' },
  ],

  // === 동 vs 군 충돌 ===

  '양평': [
    { province: '서울', fullName: '서울 양평동', type: 'gu', description: '서울특별시 영등포구 양평동' },
    { province: '경기', fullName: '경기 양평군', type: 'gun', description: '경기도 양평군' },
  ],

  // === 방위명 중복: 6개 광역시 공통 ===

  '중구': [
    { province: '서울', fullName: '서울 중구', type: 'gu' },
    { province: '부산', fullName: '부산 중구', type: 'gu' },
    { province: '대구', fullName: '대구 중구', type: 'gu' },
    { province: '인천', fullName: '인천 중구', type: 'gu' },
    { province: '대전', fullName: '대전 중구', type: 'gu' },
    { province: '울산', fullName: '울산 중구', type: 'gu' },
  ],

  '동구': [
    { province: '부산', fullName: '부산 동구', type: 'gu' },
    { province: '대구', fullName: '대구 동구', type: 'gu' },
    { province: '인천', fullName: '인천 동구', type: 'gu' },
    { province: '광주', fullName: '광주 동구', type: 'gu' },
    { province: '대전', fullName: '대전 동구', type: 'gu' },
    { province: '울산', fullName: '울산 동구', type: 'gu' },
  ],

  '서구': [
    { province: '부산', fullName: '부산 서구', type: 'gu' },
    { province: '대구', fullName: '대구 서구', type: 'gu' },
    { province: '인천', fullName: '인천 서구', type: 'gu' },
    { province: '광주', fullName: '광주 서구', type: 'gu' },
    { province: '대전', fullName: '대전 서구', type: 'gu' },
  ],

  '남구': [
    { province: '부산', fullName: '부산 남구', type: 'gu' },
    { province: '대구', fullName: '대구 남구', type: 'gu' },
    { province: '인천', fullName: '인천 남구', type: 'gu' }, // 현재는 미추홀구로 개칭
    { province: '광주', fullName: '광주 남구', type: 'gu' },
    { province: '울산', fullName: '울산 남구', type: 'gu' },
  ],

  '북구': [
    { province: '부산', fullName: '부산 북구', type: 'gu' },
    { province: '대구', fullName: '대구 북구', type: 'gu' },
    { province: '광주', fullName: '광주 북구', type: 'gu' },
    { province: '울산', fullName: '울산 북구', type: 'gu' },
  ],

  '강서구': [
    { province: '서울', fullName: '서울 강서구', type: 'gu' },
    { province: '부산', fullName: '부산 강서구', type: 'gu' },
  ],
};

/**
 * 충돌 지역인지 확인
 */
export function isConflictingRegion(regionName: string): boolean {
  return regionName in CONFLICTING_REGIONS;
}

/**
 * 충돌 지역 정보 가져오기
 */
export function getConflictingRegions(regionName: string): ConflictingRegion[] | null {
  return CONFLICTING_REGIONS[regionName] || null;
}

/**
 * 특정 광역시도의 충돌 지역 찾기
 */
export function getConflictingRegionForProvince(
  regionName: string,
  province: string
): ConflictingRegion | null {
  const regions = CONFLICTING_REGIONS[regionName];
  if (!regions) return null;

  return regions.find(r => r.province === province) || null;
}

/**
 * 지역 이름에 광역시도 포함이 필요한지 확인
 * - 충돌 지역이면 true
 * - 비충돌 지역이면 false
 */
export function needsProvincePrefix(regionName: string): boolean {
  return isConflictingRegion(regionName);
}

/**
 * 충돌 지역의 disambiguation 텍스트 생성
 */
export function getDisambiguationText(regionName: string): string | null {
  const regions = CONFLICTING_REGIONS[regionName];
  if (!regions || regions.length < 2) return null;

  // 심각한 충돌 (다른 광역시도)
  if (regionName === '광주') {
    return '경기도 광주시 또는 광주광역시를 선택하세요';
  }
  if (regionName === '고성') {
    return '강원도 고성군 또는 경남 고성군을 선택하세요';
  }

  // 방위명 중복
  const provinces = regions.map(r => r.province).join(', ');
  return `${regionName}는 ${provinces}에 모두 존재합니다. 광역시도를 함께 선택하세요.`;
}

/**
 * 심각도가 높은 충돌 지역 목록
 * (완전히 다른 지역으로 혼동될 수 있는 경우)
 */
export const HIGH_SEVERITY_CONFLICTS = ['광주', '고성', '양평'];

/**
 * 툴팁에 표시할 경고 메시지 생성
 */
export function getRegionTooltip(regionName: string, currentProvince?: string): string | null {
  if (!isConflictingRegion(regionName)) return null;

  const regions = CONFLICTING_REGIONS[regionName];
  if (!regions) return null;

  // 심각한 충돌인 경우
  if (HIGH_SEVERITY_CONFLICTS.includes(regionName)) {
    if (regionName === '광주' && currentProvince === '경기') {
      return '경기도 광주시입니다 (광주광역시와 다름)';
    }
    if (regionName === '광주' && currentProvince === '광주') {
      return '광주광역시입니다 (경기도 광주시와 다름)';
    }
    if (regionName === '고성' && currentProvince === '강원') {
      return '강원도 고성군입니다 (경남 고성군과 다름)';
    }
    if (regionName === '고성' && currentProvince === '경남') {
      return '경남 고성군입니다 (강원도 고성군과 다름)';
    }
  }

  // 일반 방위명 중복
  const otherProvinces = regions
    .filter(r => r.province !== currentProvince)
    .map(r => r.province)
    .join(', ');

  if (otherProvinces) {
    return `${currentProvince} ${regionName}입니다 (${otherProvinces}에도 동일 지역명 존재)`;
  }

  return null;
}
