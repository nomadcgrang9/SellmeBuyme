/**
 * 길찾기 API 서비스
 * Edge Function을 통해 카카오 모빌리티 / TMAP API 호출
 */

import { supabase } from '@/lib/supabase/client';
import type {
  TransportType,
  Coordinates,
  DirectionsResult,
  KakaoCarRoute,
  TmapTransitRoute,
  DirectionGuide,
  TransitSubPath,
  SUBWAY_LINE_COLORS,
  BUS_TYPE_COLORS,
} from '@/types/directions';

/**
 * 길찾기 API 호출
 */
export async function getDirections(
  type: TransportType,
  origin: Coordinates,
  destination: Coordinates
): Promise<DirectionsResult> {
  console.log('[Directions API] 요청:', { type, origin, destination });

  const { data, error } = await supabase.functions.invoke('get-directions', {
    body: { type, origin, destination },
  });

  if (error) {
    console.error('[Directions API] Edge Function 오류:', error);
    throw new Error(`길찾기 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error('길찾기 결과가 없습니다');
  }

  console.log('[Directions API] 응답:', data);

  // 응답 타입에 따라 정규화
  if (type === 'car' || type === 'walk') {
    return normalizeCarRoute(data as KakaoCarRoute, type);
  } else {
    // 대중교통: 예상치 반환 (상세 경로는 카카오맵에서 확인)
    return normalizeTransitEstimate(data);
  }
}

/**
 * 카카오 모빌리티 자동차/도보 응답 정규화
 */
function normalizeCarRoute(data: KakaoCarRoute, type: TransportType): DirectionsResult {
  if (!data.routes || data.routes.length === 0) {
    throw new Error('경로를 찾을 수 없습니다');
  }

  const route = data.routes[0];
  if (route.result_code !== 0) {
    throw new Error(route.result_msg || '경로 탐색 실패');
  }

  const summary = route.summary;
  const section = route.sections[0];

  // 경로 좌표 추출 (vertexes는 [lng, lat, lng, lat, ...] 순서)
  const path: Coordinates[] = [];
  for (const road of section.roads) {
    for (let i = 0; i < road.vertexes.length; i += 2) {
      path.push({
        lng: road.vertexes[i],
        lat: road.vertexes[i + 1],
      });
    }
  }

  // 안내 정보 추출
  const guides: DirectionGuide[] = section.guides.map((guide) => ({
    instruction: guide.guidance || guide.name,
    distance: guide.distance,
    duration: guide.duration,
  }));

  // 주유비 계산 (대략적 - 리터당 1600원, 연비 12km/l 가정)
  const fuelCost = Math.round((summary.distance / 1000 / 12) * 1600);

  return {
    type,
    totalTime: Math.round(summary.duration / 60), // 초 → 분
    totalDistance: summary.distance,
    fare: {
      taxi: summary.fare.taxi,
      toll: summary.fare.toll,
      fuel: fuelCost,
    },
    path,
    guides,
  };
}

/**
 * 대중교통 예상치 응답 정규화 (카카오맵 연결용)
 */
interface TransitEstimateResponse {
  type: 'transit_estimate';
  distance: number;
  estimatedTime: number;
  message: string;
  kakaoMapUrl: string;
}

function normalizeTransitEstimate(data: TransitEstimateResponse): DirectionsResult {
  return {
    type: 'transit',
    totalTime: data.estimatedTime,
    totalDistance: data.distance,
    path: [], // 경로 좌표 없음 (카카오맵에서 확인)
    guides: [{
      instruction: data.message,
      distance: data.distance,
      duration: data.estimatedTime * 60,
    }],
    transitInfo: {
      transfers: 0,
      walkTime: 0,
      subPaths: [],
      isEstimate: true, // 예상치임을 표시
      kakaoMapUrl: data.kakaoMapUrl,
    },
  };
}

/**
 * TMAP linestring 파싱 (좌표 문자열 → Coordinates[])
 * 예: "126.977 37.566,126.978 37.567" → [{lng: 126.977, lat: 37.566}, ...]
 */
function parseLinestring(linestring: string): Coordinates[] {
  const coords: Coordinates[] = [];
  const pairs = linestring.split(',');
  for (const pair of pairs) {
    const [lng, lat] = pair.trim().split(' ').map(parseFloat);
    if (!isNaN(lng) && !isNaN(lat)) {
      coords.push({ lng, lat });
    }
  }
  return coords;
}

/**
 * 지하철 노선명으로 색상 추론
 */
function getSubwayColorByName(name: string): string {
  const lineNumbers: Record<string, number> = {
    '1호선': 1,
    '2호선': 2,
    '3호선': 3,
    '4호선': 4,
    '5호선': 5,
    '6호선': 6,
    '7호선': 7,
    '8호선': 8,
    '9호선': 9,
  };

  for (const [key, value] of Object.entries(lineNumbers)) {
    if (name.includes(key)) {
      return getSubwayColor(value);
    }
  }
  return '#666666';
}

/**
 * 버스 타입으로 색상 반환
 */
function getBusColorByType(type: number): string {
  return getBusColor(type);
}

/**
 * 지하철 노선 색상 반환
 */
function getSubwayColor(code: number): string {
  const colors: Record<number, string> = {
    1: '#0052A4',
    2: '#00A84D',
    3: '#EF7C1C',
    4: '#00A5DE',
    5: '#996CAC',
    6: '#CD7C2F',
    7: '#747F00',
    8: '#E6186C',
    9: '#BDB092',
  };
  return colors[code] || '#666666';
}

/**
 * 버스 타입 색상 반환
 */
function getBusColor(type: number): string {
  const colors: Record<number, string> = {
    1: '#33CC99',
    2: '#E60012',
    3: '#3C9',
    4: '#F99D1C',
    5: '#0068B7',
    6: '#8B50A4',
    11: '#0068B7',
    12: '#3CB44A',
    13: '#F2B70A',
    14: '#E60012',
  };
  return colors[type] || '#33CC99';
}

/**
 * 거리 포맷팅
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
}

/**
 * 시간 포맷팅
 */
export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}

/**
 * 요금 포맷팅
 */
export function formatFare(won: number): string {
  return won.toLocaleString('ko-KR') + '원';
}
