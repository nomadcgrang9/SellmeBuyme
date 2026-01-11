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
    return normalizeTransitRoute(data as TmapTransitRoute);
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
 * TMAP 대중교통 응답 정규화
 */
function normalizeTransitRoute(data: TmapTransitRoute): DirectionsResult {
  if (!data.metaData?.plan?.itineraries || data.metaData.plan.itineraries.length === 0) {
    throw new Error('대중교통 경로를 찾을 수 없습니다');
  }

  // 첫 번째 경로 사용 (최적 경로)
  const itinerary = data.metaData.plan.itineraries[0];

  // 구간별 정보 추출
  const subPaths: TransitSubPath[] = [];
  const path: Coordinates[] = [];
  const guides: DirectionGuide[] = [];

  for (const leg of itinerary.legs) {
    // 시작 좌표 추가
    path.push({ lng: leg.start.lon, lat: leg.start.lat });

    // 경유 정거장 좌표 추가
    if (leg.passStopList?.stationList) {
      for (const station of leg.passStopList.stationList) {
        path.push({
          lng: parseFloat(station.lon),
          lat: parseFloat(station.lat),
        });
      }
    }

    // 도보 구간 상세 좌표 (linestring 파싱)
    if (leg.mode === 'WALK' && leg.steps) {
      for (const step of leg.steps) {
        if (step.linestring) {
          const coords = parseLinestring(step.linestring);
          path.push(...coords);
        }
      }
    }

    // 끝 좌표 추가
    path.push({ lng: leg.end.lon, lat: leg.end.lat });

    // 구간 타입 결정
    let subType: 'subway' | 'bus' | 'walk' = 'walk';
    let lineName = '';
    let lineColor = '';
    let stationCount = 0;

    if (leg.mode === 'SUBWAY') {
      subType = 'subway';
      lineName = leg.route || '';
      lineColor = leg.routeColor || getSubwayColorByName(lineName);
      stationCount = leg.passStopList?.stationList?.length || 0;
    } else if (leg.mode === 'BUS') {
      subType = 'bus';
      lineName = leg.route || '';
      lineColor = leg.routeColor || getBusColorByType(leg.service || 1);
      stationCount = leg.passStopList?.stationList?.length || 0;
    }

    const sectionTime = Math.round(leg.sectionTime / 60); // 초 → 분

    subPaths.push({
      type: subType,
      lineName,
      lineColor,
      startName: leg.start.name,
      endName: leg.end.name,
      stationCount,
      sectionTime,
      distance: leg.distance,
    });

    // 안내 정보 추가
    if (subType === 'walk') {
      guides.push({
        instruction: `도보 이동 ${leg.start.name} → ${leg.end.name}`,
        distance: leg.distance,
        duration: leg.sectionTime,
      });
    } else {
      guides.push({
        instruction: `${lineName} 탑승 (${leg.start.name} → ${leg.end.name}, ${stationCount}정거장)`,
        distance: leg.distance,
        duration: leg.sectionTime,
      });
    }
  }

  return {
    type: 'transit',
    totalTime: itinerary.totalTime,
    totalDistance: itinerary.totalDistance,
    fare: {
      transit: itinerary.fare.regular.totalFare,
    },
    path,
    guides,
    transitInfo: {
      transfers: itinerary.transferCount,
      walkTime: itinerary.totalWalkTime,
      subPaths,
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
