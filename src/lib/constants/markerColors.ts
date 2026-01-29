/**
 * 학교급별 마커 색상 상수 및 유틸리티 함수
 * SchoolLevelFilterBar와 동일한 색상 팔레트 사용
 *
 * 색상환 분산 원칙: 각 학교급이 명확히 구분되도록 균등 배치
 * - 유치원: Warm Brown (30°) - 따뜻함, 유아
 * - 초등학교: Green (120°) - 성장, 자연
 * - 중학교: Blue (210°) - 신뢰, 안정
 * - 고등학교: Deep Purple (270°) - 성숙, 학문
 * - 특수학교: Amber (45°) - 따뜻함, 포용
 * - 기타: Blue Grey (중립)
 */

export const SCHOOL_LEVEL_MARKER_COLORS = {
  '유치원':   { fill: '#8D6E63', stroke: '#6D4C41', text: '#3E2723' },
  '초등학교': { fill: '#4CAF50', stroke: '#388E3C', text: '#1B5E20' },
  '중학교':   { fill: '#2196F3', stroke: '#1976D2', text: '#0D47A1' },
  '고등학교': { fill: '#7C4DFF', stroke: '#651FFF', text: '#4A148C' },
  '특수학교': { fill: '#FF9800', stroke: '#F57C00', text: '#E65100' },
  '기타':     { fill: '#607D8B', stroke: '#455A64', text: '#263238' },
} as const;

export type SchoolLevel = keyof typeof SCHOOL_LEVEL_MARKER_COLORS;

// 마커 크기 상수 (원래 크기: 36x48)
export const MARKER_SIZE = {
  width: 36,
  height: 48,
  innerCircleRadius: 11,
  centerX: 18,
  centerY: 18,
} as const;

// 긴급 마커 크기 (펄스 링 여유 공간 포함)
export const URGENT_MARKER_SIZE = {
  width: 48,   // 36 + 12 (양쪽 6px 여유)
  height: 54,  // 48 + 6 (상단 여유)
  padding: 6,  // 좌우 패딩
  topPadding: 6, // 상단 패딩
} as const;

export const CLUSTER_MARKER_SIZE = {
  width: 44,
  height: 52,
  innerCircleRadius: 13,
  centerX: 22,
  centerY: 20,
} as const;

/**
 * 공고 정보에서 학교급 추출
 */
export function getSchoolLevelFromJob(job: {
  school_level?: string | null;
  organization?: string | null;
  title?: string | null;
}): SchoolLevel {
  const sl = (job.school_level || '').toLowerCase();
  const org = (job.organization || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  const combined = `${sl} ${org} ${title}`;

  if (combined.includes('유치')) return '유치원';
  if (combined.includes('초등') || org.endsWith('초')) return '초등학교';
  if (combined.includes('중학') || combined.includes('중등')) return '중학교';
  if (combined.includes('고등') || combined.includes('고교')) return '고등학교';
  if (combined.includes('특수')) return '특수학교';
  return '기타';
}

/**
 * 카카오맵 스타일 핀(물방울) 형태 SVG 마커 생성
 * - 일반: 36x48px
 * - 긴급: 48x54px (펄스 링 여유 공간 포함)
 * - D-day 표시 또는 학교급 첫글자
 * - 긴급 공고: 학교급 색상 유지 + 펄스 링 + 느낌표 배지
 */
export function generateSchoolLevelMarker(
  schoolLevel: SchoolLevel,
  daysLeft?: number,
  isUrgent = false
): string {
  const colors = SCHOOL_LEVEL_MARKER_COLORS[schoolLevel] || SCHOOL_LEVEL_MARKER_COLORS['기타'];
  const baseSize = MARKER_SIZE;

  // 학교급 색상 유지
  const fill = colors.fill;
  const stroke = colors.stroke;
  const textColor = colors.text;

  // D-day 텍스트 또는 학교급 첫글자 (기존 방식)
  let text: string;
  if (daysLeft !== undefined && daysLeft >= 0) {
    text = daysLeft === 0 ? 'D-0' : `D-${daysLeft}`;
  } else {
    // 학교급 첫 글자
    text = schoolLevel.charAt(0);
  }

  // 텍스트 길이에 따른 폰트 크기 조정
  const fontSize = text.length > 2 ? 9 : 11;

  if (isUrgent) {
    // 긴급 마커: 확장된 viewBox로 펄스 링이 잘리지 않도록
    const { width: urgentWidth, height: urgentHeight, padding, topPadding } = URGENT_MARKER_SIZE;
    const offsetX = padding;
    const offsetY = topPadding;
    const centerX = baseSize.centerX + offsetX;
    const centerY = baseSize.centerY + offsetY;
    const markerHeight = baseSize.height + offsetY;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${urgentWidth}" height="${urgentHeight}" viewBox="0 0 ${urgentWidth} ${urgentHeight}">
  <defs>
    <filter id="urgentGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="#EF4444" flood-opacity="0.5"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- 긴급: 펄스 링 (확장된 공간에서 잘리지 않음) -->
  <circle cx="${centerX}" cy="${centerY}" r="${baseSize.innerCircleRadius + 4}"
          fill="none" stroke="#EF4444" stroke-width="2.5" opacity="0.8">
    <animate attributeName="r" values="${baseSize.innerCircleRadius + 3};${baseSize.innerCircleRadius + 7};${baseSize.innerCircleRadius + 3}" dur="2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite"/>
  </circle>
  <!-- 긴급: 느낌표 배지 (오른쪽으로 약간 이동) -->
  <circle cx="${offsetX + baseSize.width}" cy="${offsetY + 5}" r="6" fill="#EF4444" stroke="white" stroke-width="1.5">
    <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="${offsetX + baseSize.width}" y="${offsetY + 9}" text-anchor="middle" font-size="9" font-weight="bold" fill="white" font-family="system-ui">!</text>
  <!-- 핀 바디 (물방울 형태) -->
  <path d="M${centerX} ${markerHeight - 2} C${centerX} ${markerHeight - 2} ${offsetX + 4} ${offsetY + 28} ${offsetX + 4} ${centerY} C${offsetX + 4} ${offsetY + 9} ${offsetX + 10} ${offsetY + 2} ${centerX} ${offsetY + 2} C${offsetX + baseSize.width - 10} ${offsetY + 2} ${offsetX + baseSize.width - 4} ${offsetY + 9} ${offsetX + baseSize.width - 4} ${centerY} C${offsetX + baseSize.width - 4} ${offsetY + 28} ${centerX} ${markerHeight - 2} ${centerX} ${markerHeight - 2} Z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
        filter="url(#urgentGlow)"/>
  <!-- 내부 원형 배경 -->
  <circle cx="${centerX}" cy="${centerY}" r="${baseSize.innerCircleRadius}" fill="white" opacity="0.92"/>
  <!-- D-day 텍스트 -->
  <text x="${centerX}" y="${centerY + 4}" text-anchor="middle"
        font-size="${fontSize}" font-weight="bold"
        fill="${textColor}"
        font-family="system-ui, -apple-system, sans-serif">${text}</text>
</svg>`;
  }

  // 일반 마커
  const { width, height, centerX, centerY, innerCircleRadius } = baseSize;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- 핀 바디 (물방울 형태) -->
  <path d="M${centerX} ${height - 2} C${centerX} ${height - 2} 4 28 4 ${centerY} C4 9 10 2 ${centerX} 2 C${width - 10} 2 ${width - 4} 9 ${width - 4} ${centerY} C${width - 4} 28 ${centerX} ${height - 2} ${centerX} ${height - 2} Z"
        fill="${fill}"
        stroke="${stroke}"
        stroke-width="2"
        filter="url(#shadow)"/>
  <!-- 내부 원형 배경 -->
  <circle cx="${centerX}" cy="${centerY}" r="${innerCircleRadius}" fill="white" opacity="0.92"/>
  <!-- D-day 텍스트 -->
  <text x="${centerX}" y="${centerY + 4}" text-anchor="middle"
        font-size="${fontSize}" font-weight="bold"
        fill="${textColor}"
        font-family="system-ui, -apple-system, sans-serif">${text}</text>
</svg>`;
}

/**
 * 클러스터 마커 생성 (여러 공고가 같은 위치일 때)
 */
export function generateClusterMarker(count: number, dominantLevel?: SchoolLevel): string {
  const colors = dominantLevel
    ? SCHOOL_LEVEL_MARKER_COLORS[dominantLevel]
    : { fill: '#3B82F6', stroke: '#1D4ED8', text: '#FFFFFF' };

  const { width, height, centerX, centerY, innerCircleRadius } = CLUSTER_MARKER_SIZE;
  const displayCount = count > 99 ? '99+' : String(count);
  const fontSize = displayCount.length > 2 ? 10 : 12;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- 클러스터 핀 바디 -->
  <path d="M${centerX} ${height - 2} C${centerX} ${height - 2} 4 32 4 ${centerY} C4 9 11 2 ${centerX} 2 C${width - 11} 2 ${width - 4} 9 ${width - 4} ${centerY} C${width - 4} 32 ${centerX} ${height - 2} ${centerX} ${height - 2} Z"
        fill="${colors.fill}"
        stroke="${colors.stroke}"
        stroke-width="2.5"
        filter="url(#shadow)"/>
  <!-- 내부 원형 배경 -->
  <circle cx="${centerX}" cy="${centerY}" r="${innerCircleRadius}" fill="white" opacity="0.92"/>
  <!-- 공고 개수 텍스트 -->
  <text x="${centerX}" y="${centerY + 4}" text-anchor="middle"
        font-size="${fontSize}" font-weight="bold"
        fill="${colors.text}"
        font-family="system-ui, -apple-system, sans-serif">${displayCount}</text>
</svg>`;
}

/**
 * 구직자 마커 크기 상수
 */
export const TEACHER_MARKER_SIZE = {
  width: 28,
  height: 28,
  radius: 12,
  centerX: 14,
  centerY: 14,
} as const;

/**
 * 구직자(교사) 마커 생성 - 원형 + 사람 아이콘
 * Solar Icons UserRounded 스타일 참고
 * 사이트 primary color: #68B2FF (스카이블루)
 */
export function generateTeacherMarkerSVG(color: string = '#68B2FF'): string {
  const { width, height, radius, centerX, centerY } = TEACHER_MARKER_SIZE;

  // 사람 아이콘 path (Solar Icons UserRounded Bold 스타일 기반)
  // 얼굴 원 + 몸통 경로
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="teacherShadow" x="-30%" y="-20%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- 외부 원형 배경 -->
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${color}" stroke="white" stroke-width="2" filter="url(#teacherShadow)"/>
  <!-- 사람 아이콘 (흰색) -->
  <g transform="translate(${centerX - 6}, ${centerY - 7})">
    <!-- 머리 -->
    <circle cx="6" cy="4" r="3" fill="white"/>
    <!-- 몸통 -->
    <path d="M6 8c-3.5 0-6 1.5-6 3v1.5c0 0.3 0.2 0.5 0.5 0.5h11c0.3 0 0.5-0.2 0.5-0.5V11c0-1.5-2.5-3-6-3z" fill="white"/>
  </g>
</svg>`;
}

/**
 * 교원연수 강사 마커 크기 상수
 */
export const INSTRUCTOR_MARKER_SIZE = {
  width: 28,
  height: 28,
  radius: 12,
  centerX: 14,
  centerY: 14,
} as const;

/**
 * 교원연수 강사 마커 생성 - 원형 + 사람 아이콘 (핑크)
 * 구직자 마커와 동일한 디자인, 색상만 핑크
 */
export function generateInstructorMarkerSVG(color: string = '#F9A8D4'): string {
  const { width, height, radius, centerX, centerY } = INSTRUCTOR_MARKER_SIZE;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="instructorShadow" x="-30%" y="-20%" width="160%" height="160%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- 외부 원형 배경 -->
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${color}" stroke="white" stroke-width="2" filter="url(#instructorShadow)"/>
  <!-- 사람 아이콘 (흰색) -->
  <g transform="translate(${centerX - 6}, ${centerY - 7})">
    <!-- 머리 -->
    <circle cx="6" cy="4" r="3" fill="white"/>
    <!-- 몸통 -->
    <path d="M6 8c-3.5 0-6 1.5-6 3v1.5c0 0.3 0.2 0.5 0.5 0.5h11c0.3 0 0.5-0.2 0.5-0.5V11c0-1.5-2.5-3-6-3z" fill="white"/>
  </g>
</svg>`;
}
