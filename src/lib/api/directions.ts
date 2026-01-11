/**
 * 길찾기 API 서비스
 * Edge Function을 통해 카카오 모빌리티 / ODsay API 호출
 */

import { supabase } from '@/lib/supabase/client';
import type {
  TransportType,
  Coordinates,
  DirectionsResult,
  KakaoCarRoute,
  OdsayTransitRoute,
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
    return normalizeTransitRoute(data as OdsayTransitRoute);
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
 * ODsay 대중교통 응답 정규화
 */
function normalizeTransitRoute(data: OdsayTransitRoute): DirectionsResult {
  if (!data.result || !data.result.path || data.result.path.length === 0) {
    throw new Error('대중교통 경로를 찾을 수 없습니다');
  }

  // 첫 번째 경로 사용 (최적 경로)
  const route = data.result.path[0];
  const info = route.info;

  // 구간별 정보 추출
  const subPaths: TransitSubPath[] = [];
  const path: Coordinates[] = [];
  const guides: DirectionGuide[] = [];

  for (const sub of route.subPath) {
    // 시작/끝 좌표 추가
    if (sub.startX && sub.startY) {
      path.push({ lng: sub.startX, lat: sub.startY });
    }

    // 정거장 좌표 추가
    if (sub.passStopList?.stations) {
      for (const station of sub.passStopList.stations) {
        path.push({
          lng: parseFloat(station.x),
          lat: parseFloat(station.y),
        });
      }
    }

    if (sub.endX && sub.endY) {
      path.push({ lng: sub.endX, lat: sub.endY });
    }

    // 구간 타입 결정
    let subType: 'subway' | 'bus' | 'walk' = 'walk';
    let lineName = '';
    let lineColor = '';

    if (sub.trafficType === 1) {
      // 지하철
      subType = 'subway';
      if (sub.lane && sub.lane[0]) {
        lineName = sub.lane[0].name || '';
        const subwayCode = sub.lane[0].subwayCode;
        if (subwayCode) {
          lineColor = getSubwayColor(subwayCode);
        }
      }
    } else if (sub.trafficType === 2) {
      // 버스
      subType = 'bus';
      if (sub.lane && sub.lane[0]) {
        lineName = sub.lane[0].busNo || sub.lane[0].name || '';
        const busType = sub.lane[0].type;
        if (busType) {
          lineColor = getBusColor(busType);
        }
      }
    }

    subPaths.push({
      type: subType,
      lineName,
      lineColor,
      startName: sub.startName || '',
      endName: sub.endName || '',
      stationCount: sub.stationCount,
      sectionTime: sub.sectionTime,
      distance: sub.distance,
    });

    // 안내 정보 추가
    if (subType === 'walk') {
      guides.push({
        instruction: `도보 이동 ${sub.startName || ''} → ${sub.endName || ''}`,
        distance: sub.distance,
        duration: sub.sectionTime * 60, // 분 → 초
      });
    } else {
      guides.push({
        instruction: `${lineName} 탑승 (${sub.startName} → ${sub.endName}, ${sub.stationCount || 0}정거장)`,
        distance: sub.distance,
        duration: sub.sectionTime * 60,
      });
    }
  }

  return {
    type: 'transit',
    totalTime: info.totalTime,
    totalDistance: info.totalDistance,
    fare: {
      transit: info.payment,
    },
    path,
    guides,
    transitInfo: {
      transfers: info.busTransitCount + info.subwayTransitCount - 1,
      walkTime: Math.round(info.totalWalk / 80), // 80m/분 가정
      subPaths,
    },
  };
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
