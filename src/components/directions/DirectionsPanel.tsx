/**
 * DirectionsPanel - 길찾기 사이드 패널 컴포넌트
 * 사이트 테마(보라/파랑)에 맞춘 디자인
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { JobPostingCard } from '@/types';
import type { TransportType, DirectionsResult, Coordinates } from '@/types/directions';
import { getDirections, formatDistance, formatDuration, formatFare } from '@/lib/api/directions';

interface DirectionsPanelProps {
  job: JobPostingCard;
  destinationCoords: Coordinates | null;
  onClose: () => void;
  onRouteFound?: (result: DirectionsResult) => void;
}

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  job,
  destinationCoords,
  onClose,
  onRouteFound,
}) => {
  const [transportType, setTransportType] = useState<TransportType>('car');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DirectionsResult | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // 도보 시간 계산 (거리 기반, 분당 80m 기준)
  const calculateWalkTime = useCallback((distanceMeters: number): number => {
    return Math.round(distanceMeters / 80);
  }, []);

  // 사용자 위치 가져오기
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (err) => {
        console.error('[DirectionsPanel] 위치 가져오기 실패:', err);
        setError('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 컴포넌트 마운트 시 위치 가져오기
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  // 경로 검색
  const searchRoute = useCallback(async () => {
    if (!userLocation || !destinationCoords) {
      setError('출발지 또는 도착지 좌표가 없습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const directionsResult = await getDirections(transportType, userLocation, destinationCoords);
      setResult(directionsResult);
      onRouteFound?.(directionsResult);
    } catch (err: any) {
      console.error('[DirectionsPanel] 경로 검색 실패:', err);
      setError(err.message || '경로를 찾을 수 없습니다.');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, destinationCoords, transportType, onRouteFound]);

  // 교통수단 변경 시 자동 검색
  useEffect(() => {
    if (userLocation && destinationCoords) {
      searchRoute();
    }
  }, [transportType, userLocation, destinationCoords]);

  // 카카오맵 연결 (출발지 + 도착지 좌표 포함)
  const openKakaoNavi = () => {
    if (!destinationCoords) return;
    // 출발지와 도착지 모두 포함하는 경로 URL
    let url: string;
    if (userLocation) {
      // 출발지 있으면 경로 검색 URL
      url = `https://map.kakao.com/link/from/현재위치,${userLocation.lat},${userLocation.lng}/to/${encodeURIComponent(job.organization)},${destinationCoords.lat},${destinationCoords.lng}`;
    } else {
      // 출발지 없으면 도착지만
      url = `https://map.kakao.com/link/to/${encodeURIComponent(job.organization)},${destinationCoords.lat},${destinationCoords.lng}`;
    }
    window.open(url, '_blank');
  };

  // 표시할 소요 시간 계산 (도보는 거리 기반)
  const getDisplayTime = useCallback((): number => {
    if (!result) return 0;
    if (transportType === 'walk' && result.totalDistance) {
      return calculateWalkTime(result.totalDistance);
    }
    return result.totalTime;
  }, [result, transportType, calculateWalkTime]);

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col w-[280px] max-h-[calc(100vh-32px)]">
      {/* 헤더 - 카카오맵 스타일 (밝은 하늘색 그라데이션) */}
      <div className="bg-gradient-to-r from-[#7EC8E3] to-[#5DADE2] text-white p-3.5">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">길찾기</h3>
            <p className="text-xs text-white/80 truncate">{job.organization}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 ml-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 출발/도착 정보 */}
      <div className="p-3 border-b border-gray-100">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#5DADE2] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400">출발</p>
              <p className="text-xs font-medium text-gray-800 truncate">
                {userLocation ? '현재 위치' : '위치 확인 중...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400">도착</p>
              <p className="text-xs font-medium text-gray-800 truncate">{job.organization}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 교통수단 탭 - 테마 색상 */}
      <div className="flex border-b border-gray-200">
        {(['car', 'transit', 'walk'] as TransportType[]).map((type) => {
          const isActive = transportType === type;
          const icons = {
            car: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            ),
            transit: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-9.12c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V6.375" />
              </svg>
            ),
            walk: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            ),
          };
          const labels = { car: '자동차', transit: '대중교통', walk: '도보' };

          return (
            <button
              key={type}
              onClick={() => setTransportType(type)}
              className={`flex-1 py-2.5 px-2 flex flex-col items-center gap-0.5 transition-colors ${
                isActive
                  ? 'bg-[#5DADE2]/10 text-[#5DADE2] border-b-2 border-[#5DADE2]'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {icons[type]}
              <span className="text-[10px] font-medium">{labels[type]}</span>
            </button>
          );
        })}
      </div>

      {/* 결과 영역 */}
      <div className="flex-1 overflow-y-auto p-3">
        {isGettingLocation && (
          <div className="flex flex-col items-center justify-center py-6 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#5DADE2] mb-2" />
            <p className="text-xs">위치를 확인하는 중...</p>
          </div>
        )}

        {isLoading && !isGettingLocation && (
          <div className="flex flex-col items-center justify-center py-6 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#5DADE2] mb-2" />
            <p className="text-xs">경로를 검색하는 중...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs">
            <p className="font-medium mb-1">오류</p>
            <p>{error}</p>
            <button
              onClick={searchRoute}
              className="mt-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors text-xs"
            >
              다시 시도
            </button>
          </div>
        )}

        {result && !isLoading && !error && (
          <div className="space-y-3">
            {/* 요약 정보 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{formatDuration(getDisplayTime())}</p>
                  <p className="text-[10px] text-gray-500">소요시간</p>
                </div>
                <div className="w-px h-8 bg-gray-300" />
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{formatDistance(result.totalDistance)}</p>
                  <p className="text-[10px] text-gray-500">거리</p>
                </div>
              </div>

              {/* 요금 정보 */}
              {result.fare && (
                <div className="flex flex-wrap justify-center gap-2 text-[10px] text-gray-600 border-t border-gray-200 pt-2">
                  {result.fare.toll !== undefined && result.fare.toll > 0 && (
                    <span>통행료 {formatFare(result.fare.toll)}</span>
                  )}
                  {result.fare.taxi !== undefined && (
                    <span>택시비 {formatFare(result.fare.taxi)}</span>
                  )}
                  {result.fare.fuel !== undefined && (
                    <span>주유비 {formatFare(result.fare.fuel)}</span>
                  )}
                  {result.fare.transit !== undefined && (
                    <span>요금 {formatFare(result.fare.transit)}</span>
                  )}
                </div>
              )}
            </div>

            {/* 대중교통 구간 정보 */}
            {result.transitInfo && (
              <div className="space-y-1.5">
                {/* 예상치인 경우 안내 메시지 */}
                {result.transitInfo.isEstimate ? (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-700 mb-2">
                      예상 소요시간입니다
                    </p>
                    <p className="text-[10px] text-blue-600">
                      상세 경로는 카카오맵에서 확인하세요
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-700">
                      환승 {result.transitInfo.transfers}회 · 도보 {result.transitInfo.walkTime}분
                    </p>
                    <div className="space-y-1.5">
                      {result.transitInfo.subPaths.map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {sub.type === 'walk' ? (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                              </svg>
                            </div>
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: sub.lineColor || '#666' }}
                            >
                              {sub.type === 'subway' ? '호' : '버'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {sub.type === 'walk' ? '도보' : sub.lineName}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              {sub.startName} → {sub.endName}
                              {sub.stationCount && ` (${sub.stationCount}정거장)`}
                            </p>
                          </div>
                          <span className="text-xs text-gray-600">{sub.sectionTime}분</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 자동차/도보 상세 경로 */}
            {!result.transitInfo && result.guides.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-700">상세 경로</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.guides.slice(0, 8).map((guide, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs">
                      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-gray-700 line-clamp-2">{guide.instruction}</span>
                    </div>
                  ))}
                  {result.guides.length > 8 && (
                    <p className="text-[10px] text-gray-500 pl-5">... 외 {result.guides.length - 8}개 안내</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 버튼 - amber 계열 (카카오 느낌은 유지하되 살짝 톤다운) */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <button
          onClick={openKakaoNavi}
          className="w-full py-2.5 bg-amber-300 hover:bg-amber-400 text-gray-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          카카오맵에서 길찾기
        </button>
      </div>
    </div>
  );
};

export default DirectionsPanel;
