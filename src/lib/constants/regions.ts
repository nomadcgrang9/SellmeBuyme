export interface AdminRegionOption {
  code: string;
  name: string;
  shortName: string;
}

export const ADMIN_REGION_OPTIONS: AdminRegionOption[] = [
  { code: 'KR-11', name: '서울특별시', shortName: '서울' },
  { code: 'KR-26', name: '부산광역시', shortName: '부산' },
  { code: 'KR-27', name: '대구광역시', shortName: '대구' },
  { code: 'KR-28', name: '인천광역시', shortName: '인천' },
  { code: 'KR-29', name: '광주광역시', shortName: '광주' },
  { code: 'KR-30', name: '대전광역시', shortName: '대전' },
  { code: 'KR-31', name: '울산광역시', shortName: '울산' },
  { code: 'KR-50', name: '세종특별자치시', shortName: '세종' },
  { code: 'KR-41', name: '경기도', shortName: '경기' },
  { code: 'KR-42', name: '강원특별자치도', shortName: '강원' },
  { code: 'KR-43', name: '충청북도', shortName: '충북' },
  { code: 'KR-44', name: '충청남도', shortName: '충남' },
  { code: 'KR-45', name: '전북특별자치도', shortName: '전북' },
  { code: 'KR-46', name: '전라남도', shortName: '전남' },
  { code: 'KR-47', name: '경상북도', shortName: '경북' },
  { code: 'KR-48', name: '경상남도', shortName: '경남' },
  { code: 'KR-49', name: '제주특별자치도', shortName: '제주' }
];

export const ADMIN_REGION_LOOKUP: Record<string, AdminRegionOption> = ADMIN_REGION_OPTIONS.reduce(
  (acc, region) => {
    acc[region.code] = region;
    return acc;
  },
  {} as Record<string, AdminRegionOption>
);

export function getAdminRegionDisplayName(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const region = ADMIN_REGION_LOOKUP[code];
  return region ? region.name : null;
}
