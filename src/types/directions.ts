/**
 * 길찾기 기능 관련 타입 정의
 */

// 좌표
export interface Coordinates {
  lat: number;
  lng: number;
}

// 교통수단 타입
export type TransportType = 'car' | 'transit' | 'walk';

// 길찾기 요청
export interface DirectionsRequest {
  type: TransportType;
  origin: Coordinates;
  destination: Coordinates;
}

// 카카오 모빌리티 자동차 경로 응답
export interface KakaoCarRoute {
  result_code: number;
  result_msg: string;
  routes: Array<{
    result_code: number;
    result_msg: string;
    summary: {
      origin: { name: string; x: number; y: number };
      destination: { name: string; x: number; y: number };
      waypoints: Array<{ name: string; x: number; y: number }>;
      priority: string;
      bound: { min_x: number; min_y: number; max_x: number; max_y: number };
      fare: { taxi: number; toll: number };
      distance: number; // 미터
      duration: number; // 초
    };
    sections: Array<{
      distance: number;
      duration: number;
      bound: { min_x: number; min_y: number; max_x: number; max_y: number };
      roads: Array<{
        name: string;
        distance: number;
        duration: number;
        traffic_speed: number;
        traffic_state: number;
        vertexes: number[]; // [lng, lat, lng, lat, ...]
      }>;
      guides: Array<{
        name: string;
        x: number;
        y: number;
        distance: number;
        duration: number;
        type: number;
        guidance: string;
        road_index: number;
      }>;
    }>;
  }>;
}

// TMAP 대중교통 경로 응답
export interface TmapTransitRoute {
  resultCode: string;
  resultMessage: string;
  metaData: {
    plan: {
      itineraries: Array<{
        totalTime: number; // 분
        totalDistance: number; // 미터
        totalWalkTime: number; // 분
        totalWalkDistance: number; // 미터
        transferCount: number;
        pathType: number;
        fare: {
          regular: {
            totalFare: number;
            currency: {
              symbol: string;
              currency: string;
              currencyCode: string;
            };
          };
        };
        legs: Array<{
          mode: string; // WALK, SUBWAY, BUS
          sectionTime: number; // 초
          distance: number; // 미터
          start: {
            name: string;
            lon: number;
            lat: number;
          };
          end: {
            name: string;
            lon: number;
            lat: number;
          };
          steps?: Array<{
            streetName: string;
            distance: number;
            description: string;
            linestring: string; // 좌표 문자열
          }>;
          route?: string; // 노선명 (버스/지하철)
          routeColor?: string; // 노선색
          service?: number; // 버스 타입
          passStopList?: {
            stationList: Array<{
              stationName: string;
              lon: string;
              lat: string;
            }>;
          };
        }>;
      }>;
    };
  };
}

// ODsay 대중교통 경로 응답 (deprecated - TMAP으로 교체)
export interface OdsayTransitRoute {
  result: {
    searchType: number;
    outTrafficCheck: number;
    busCount: number;
    subwayCount: number;
    subwayBusCount: number;
    pointDistance: number;
    startRadius: number;
    endRadius: number;
    path: Array<{
      pathType: number; // 1: 지하철, 2: 버스, 3: 버스+지하철
      info: {
        trafficDistance: number; // 총 거리 (m)
        totalWalk: number; // 총 도보 (m)
        totalTime: number; // 총 소요시간 (분)
        payment: number; // 요금
        busTransitCount: number;
        subwayTransitCount: number;
        mapObj: string;
        firstStartStation: string;
        lastEndStation: string;
        totalStationCount: number;
        busStationCount: number;
        subwayStationCount: number;
        totalDistance: number;
        totalWalkTime: number;
        checkIntervalTime: number;
        checkIntervalTimeOver498: number;
        totalIntervalTime: number;
      };
      subPath: Array<{
        trafficType: number; // 1: 지하철, 2: 버스, 3: 도보
        distance: number;
        sectionTime: number;
        stationCount?: number;
        lane?: Array<{
          name: string;
          subwayCode?: number;
          subwayCityCode?: number;
          busNo?: string;
          type?: number;
          busID?: number;
        }>;
        startName?: string;
        startX?: number;
        startY?: number;
        endName?: string;
        endX?: number;
        endY?: number;
        way?: string;
        wayCode?: number;
        door?: string;
        startID?: number;
        endID?: number;
        startExitNo?: string;
        endExitNo?: string;
        passStopList?: {
          stations: Array<{
            index: number;
            stationID: number;
            stationName: string;
            x: string;
            y: string;
            isNonStop?: string;
          }>;
        };
      }>;
    }>;
  };
}

// 정규화된 경로 결과 (UI용)
export interface DirectionsResult {
  type: TransportType;
  totalTime: number; // 분
  totalDistance: number; // 미터
  fare?: {
    taxi?: number;
    toll?: number;
    transit?: number;
    fuel?: number;
  };
  // 경로 좌표 (Polyline용)
  path: Coordinates[];
  // 상세 안내
  guides: DirectionGuide[];
  // 대중교통 전용
  transitInfo?: {
    transfers: number; // 환승 횟수
    walkTime: number; // 도보 시간 (분)
    subPaths: TransitSubPath[];
    isEstimate?: boolean; // 예상치 여부 (true면 상세 경로 없음)
    kakaoMapUrl?: string; // 카카오맵 연결 URL
  };
}

// 경로 안내 단계
export interface DirectionGuide {
  instruction: string;
  distance: number; // 미터
  duration: number; // 초
}

// 대중교통 구간
export interface TransitSubPath {
  type: 'subway' | 'bus' | 'walk';
  lineName?: string;
  lineColor?: string;
  startName: string;
  endName: string;
  stationCount?: number;
  sectionTime: number; // 분
  distance: number; // 미터
  // 좌표 (경로 표시용)
  coordinates?: Coordinates[];
}

// 지하철 노선 색상 맵
export const SUBWAY_LINE_COLORS: Record<number, string> = {
  1: '#0052A4', // 1호선
  2: '#00A84D', // 2호선
  3: '#EF7C1C', // 3호선
  4: '#00A5DE', // 4호선
  5: '#996CAC', // 5호선
  6: '#CD7C2F', // 6호선
  7: '#747F00', // 7호선
  8: '#E6186C', // 8호선
  9: '#BDB092', // 9호선
};

// 버스 타입별 색상
export const BUS_TYPE_COLORS: Record<number, string> = {
  1: '#33CC99', // 일반
  2: '#E60012', // 좌석
  3: '#3C9', // 마을
  4: '#F99D1C', // 직행좌석
  5: '#0068B7', // 공항
  6: '#8B50A4', // 급행
  10: '#33CC99', // 외곽
  11: '#0068B7', // 간선
  12: '#3CB44A', // 지선
  13: '#F2B70A', // 순환
  14: '#E60012', // 광역
  15: '#8B50A4', // 급행
  20: '#F99D1C', // 농어촌
  26: '#0068B7', // 급행간선
};
