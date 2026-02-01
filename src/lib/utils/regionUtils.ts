/**
 * 지역 필터링 유틸리티
 *
 * 목적: 동일 지역명 충돌 해결 및 지역 표시 최적화
 */

import {
  CONFLICTING_REGIONS,
  isConflictingRegion,
  getRegionTooltip,
  HIGH_SEVERITY_CONFLICTS,
  type ConflictingRegion,
} from '@/lib/constants/regionData';
import { PROVINCE_TO_CITIES, formatLocationDisplay } from '@/lib/constants/regionHierarchy';

/**
 * 지역 표시 정보 인터페이스
 */
export interface RegionDisplayInfo {
  /** 표시할 지역명 (예: '광주시' 또는 '경기 광주시') */
  displayName: string;
  /** 전체 지역명 (광역시도 포함) */
  fullName: string;
  /** 충돌 지역 여부 */
  isConflicting: boolean;
  /** 심각한 충돌 여부 (광주, 고성 등) */
  isHighSeverity: boolean;
  /** 툴팁 텍스트 */
  tooltip: string | null;
  /** 광역시도 */
  province: string;
  /** 기초자치단체 */
  city: string;
}

/**
 * 지역명을 표시 정보로 변환
 *
 * @param city - 기초자치단체명 (예: '광주시', '고성군', '중구')
 * @param province - 광역시도명 (예: '경기', '강원', '서울')
 */
export function getRegionDisplayInfo(city: string, province: string): RegionDisplayInfo {
  // 기본 지역명 정리 (시/군/구 접미사 처리)
  const cleanCity = city.replace(/(시|군)$/, '');
  const isConflicting = isConflictingRegion(cleanCity) || isConflictingRegion(city);
  const isHighSeverity = HIGH_SEVERITY_CONFLICTS.includes(cleanCity) || HIGH_SEVERITY_CONFLICTS.includes(city);

  // 충돌 지역인 경우 항상 광역시도 포함
  const displayName = isConflicting ? `${province} ${city}` : city;
  const fullName = `${province} ${city}`;

  // 툴팁 생성
  const tooltip = getRegionTooltip(cleanCity, province) || getRegionTooltip(city, province);

  return {
    displayName,
    fullName,
    isConflicting,
    isHighSeverity,
    tooltip,
    province,
    city,
  };
}

/**
 * 검색어에서 지역 disambiguation 처리
 *
 * @param searchQuery - 검색어 (예: '광주', '광주시')
 * @returns disambiguation이 필요하면 해당 정보, 아니면 null
 */
export interface DisambiguationResult {
  needsDisambiguation: boolean;
  query: string;
  options: ConflictingRegion[];
  message: string;
}

export function checkSearchDisambiguation(searchQuery: string): DisambiguationResult | null {
  const cleanQuery = searchQuery.trim().replace(/(시|군|구)$/, '');

  if (!isConflictingRegion(cleanQuery)) {
    return null;
  }

  const regions = CONFLICTING_REGIONS[cleanQuery];
  if (!regions || regions.length < 2) {
    return null;
  }

  // 심각한 충돌만 disambiguation 필요
  if (!HIGH_SEVERITY_CONFLICTS.includes(cleanQuery)) {
    return null;
  }

  let message = '';
  if (cleanQuery === '광주') {
    message = '어느 광주를 찾으시나요?';
  } else if (cleanQuery === '고성') {
    message = '어느 고성을 찾으시나요?';
  } else {
    message = `'${cleanQuery}'는 여러 지역에 있습니다. 선택해주세요.`;
  }

  return {
    needsDisambiguation: true,
    query: searchQuery,
    options: regions,
    message,
  };
}

/**
 * 필터 칩에 표시할 지역명 생성
 * 충돌 지역은 항상 광역시도 포함
 */
export function getFilterChipLabel(city: string, province: string): string {
  const cleanCity = city.replace(/(시|군)$/, '');

  // 충돌 지역이면 광역시도 포함
  if (isConflictingRegion(cleanCity) || isConflictingRegion(city)) {
    return `${province} ${city}`;
  }

  // 비충돌 지역은 기초자치단체만
  return city;
}

/**
 * 공고 카드에 표시할 위치 문자열 생성
 * 충돌 지역은 광역시도 포함, 아니면 기초자치단체만
 */
export function getJobCardLocation(location: string): string {
  // 이미 formatLocationDisplay로 정규화된 경우 그대로 사용
  const formatted = formatLocationDisplay(location);

  // 공백으로 분리 (예: "경기 광주" → ["경기", "광주"])
  const parts = formatted.split(' ');
  if (parts.length < 2) {
    return formatted;
  }

  const [province, city] = parts;

  // 충돌 지역인지 확인
  if (isConflictingRegion(city)) {
    return formatted; // 광역시도 포함
  }

  // 비충돌 지역은 기초자치단체만 (더 짧게)
  // 단, 광역시 직할구의 경우 광역시도 포함 필요할 수 있음
  const isMetropolitanDistrict = ['중구', '동구', '서구', '남구', '북구', '강서구'].includes(city);
  if (isMetropolitanDistrict) {
    return formatted; // 광역시 직할구는 광역시도 포함
  }

  return formatted; // 기본적으로 전체 표시
}

/**
 * 검색 자동완성 옵션 생성
 * 충돌 지역은 광역시도별로 분리하여 표시
 */
export interface AutocompleteOption {
  label: string;
  value: string;
  province: string;
  isConflicting: boolean;
  tooltip?: string;
}

export function getRegionAutocompleteOptions(query: string): AutocompleteOption[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const options: AutocompleteOption[] = [];

  // 모든 광역시도의 기초자치단체 검색
  for (const [province, cities] of Object.entries(PROVINCE_TO_CITIES)) {
    for (const city of cities) {
      const cityLower = city.toLowerCase();

      // 검색어 매칭
      if (cityLower.includes(cleanQuery) || cleanQuery.includes(cityLower)) {
        const cleanCity = city.replace(/(시|군)$/, '');
        const isConflicting = isConflictingRegion(cleanCity);
        const tooltip = getRegionTooltip(cleanCity, province);

        options.push({
          label: isConflicting ? `${province} ${city}` : city,
          value: `${province} ${city}`,
          province,
          isConflicting,
          tooltip: tooltip || undefined,
        });
      }
    }
  }

  // 중복 제거 (value 기준)
  const uniqueOptions = options.filter(
    (option, index, self) => index === self.findIndex(o => o.value === option.value)
  );

  // 충돌 지역 우선 정렬 (사용자 주의 필요)
  return uniqueOptions.sort((a, b) => {
    if (a.isConflicting && !b.isConflicting) return -1;
    if (!a.isConflicting && b.isConflicting) return 1;
    return a.label.localeCompare(b.label, 'ko');
  });
}

/**
 * 심각한 충돌 지역 경고 아이콘 표시 여부
 */
export function shouldShowConflictWarning(city: string): boolean {
  const cleanCity = city.replace(/(시|군|구)$/, '');
  return HIGH_SEVERITY_CONFLICTS.includes(cleanCity);
}
