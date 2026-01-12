/**
 * DirectionsPanel - 길찾기 사이드 패널 컴포넌트
 * 사이트 테마에 맞춘 디자인
 * 
 * 출발지 선택 3가지 모드:
 * 1. 현재 위치 - GPS 기반 자동 설정
 * 2. 장소 검색 - 카카오 Places API 자동완성
 * 3. 지도에서 선택 - 지도 클릭으로 좌표 설정
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { JobPostingCard } from '@/types';
import type { TransportType, DirectionsResult, Coordinates } from '@/types/directions';
import { getDirections, formatDistance, formatDuration, formatFare } from '@/lib/api/directions';

// 출발지 선택 모드 타입
type DepartureMode = 'current' | 'search' | 'map';

interface DirectionsPanelProps {
  job: JobPostingCard;
  destinationCoords: Coordinates | null;
  onClose: () => void;
  onRouteFound?: (result: DirectionsResult) => void;
  onRequestMapClick?: (callback: (coords: Coordinates) => void) => void;
}

export const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  job,
  destinationCoords,
  onClose,
  onRouteFound,
  onRequestMapClick,
}) => {
  const [transportType, setTransportType] = useState<TransportType>('car');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DirectionsResult | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // 출발지 선택 관련 상태
  const [departureMode, setDepartureMode] = useState<DepartureMode>('search');
  const [departureName, setDepartureName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isWaitingMapClick, setIsWaitingMapClick] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 도보 시간 계산 (거리 기반, 분당 80m 기준)
  const calculateWalkTime = useCallback((distanceMeters: number): number => {
    return Math.round(distanceMeters / 80);
  }, []);

  // 현재 모드를 ref로 추적 (비동기 GPS 콜백에서 최신 모드 확인용)
  const departureModeRef = useRef<DepartureMode>(departureMode);
  useEffect(() => {
    departureModeRef.current = departureMode;
  }, [departureMode]);

  // 사용자 위치 가져오기 (forceApply: true면 모드 무관하게 적용)
  const getUserLocation = useCallback((forceApply: boolean = false) => {
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      return;
    }

    setIsGettingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setIsGettingLocation(false);

        // forceApply가 true이고, 현재 모드가 여전히 'current'일 때만 적용
        // 사용자가 검색/지도 모드로 전환했다면 GPS 결과 무시
        if (forceApply && departureModeRef.current === 'current') {
          setUserLocation(coords);
          setDepartureName('현재 위치');
        }
      },
      (err) => {
        console.error('[DirectionsPanel] 위치 가져오기 실패:', err);
        setIsGettingLocation(false);
        // 에러는 current 모드일 때만 표시
        if (forceApply && departureModeRef.current === 'current') {
          setError('위치를 가져올 수 없습니다. 다른 방법으로 출발지를 설정해주세요.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 컴포넌트 마운트 시 - 검색 모드가 기본이므로 GPS 자동 호출하지 않음
  // 사용자가 "현재위치" 버튼을 클릭할 때만 GPS 요청
  useEffect(() => {
    // 검색 모드 기본이므로 마운트 시 GPS 호출 안 함
    if (departureMode === 'search') {
      // 검색 입력창에 포커스
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, []);

  // 장소 검색 (카카오 Places API)
  const searchPlaces = useCallback((query: string) => {
    if (!query.trim() || !window.kakao?.maps?.services) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const places = new window.kakao.maps.services.Places();

    places.keywordSearch(query, (result: any[], status: any) => {
      setIsSearching(false);
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        setSearchResults(result.slice(0, 5)); // 최대 5개
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
      }
    });
  }, []);

  // 검색 디바운스
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        searchPlaces(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, searchPlaces]);

  // 검색 결과 선택
  const handleSelectPlace = (place: any) => {
    const coords = {
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
    };
    setUserLocation(coords);
    setDepartureName(place.place_name);
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    setDepartureMode('search');
  };

  // 지도 클릭 모드 활성화
  const handleMapClickMode = () => {
    if (onRequestMapClick) {
      setIsWaitingMapClick(true);
      setDepartureMode('map');
      onRequestMapClick((coords: Coordinates) => {
        setUserLocation(coords);
        setDepartureName('지도에서 선택한 위치');
        setIsWaitingMapClick(false);

        // 역지오코딩으로 주소 가져오기
        if (window.kakao?.maps?.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(coords.lng, coords.lat, (result: any[], status: any) => {
            if (status === window.kakao.maps.services.Status.OK && result[0]) {
              const address = result[0].address?.address_name || '지도에서 선택한 위치';
              setDepartureName(address);
            }
          });
        }
      });
    } else {
      setError('지도 선택 기능을 사용할 수 없습니다.');
    }
  };

  // 출발지 모드 변경
  const handleModeChange = (mode: DepartureMode) => {
    setDepartureMode(mode);
    setError(null);
    setShowSearchResults(false);
    setSearchQuery('');

    if (mode === 'current') {
      getUserLocation(true); // 명시적으로 현재위치 버튼 누르면 forceApply
    } else if (mode === 'search') {
      // 검색 모드: 입력창에 포커스
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else if (mode === 'map') {
      handleMapClickMode();
    }
  };

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
      url = `https://map.kakao.com/link/from/${encodeURIComponent(departureName || '출발지')},${userLocation.lat},${userLocation.lng}/to/${encodeURIComponent(job.organization)},${destinationCoords.lat},${destinationCoords.lng}`;
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

  // 출발지 표시 텍스트
  const getDepartureDisplayText = () => {
    if (isWaitingMapClick) return '지도를 클릭하세요...';
    if (isGettingLocation) return '위치 확인 중...';
    if (departureName) return departureName;
    if (userLocation) return '현재 위치';
    return '출발지를 선택하세요';
  };

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

      {/* 출발/도착 정보 + 출발지 선택 모드 */}
      <div className="p-3 border-b border-gray-100">
        <div className="space-y-2">
          {/* 출발지 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#5DADE2] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400">출발</p>
                <p className="text-xs font-medium text-gray-800 truncate">
                  {getDepartureDisplayText()}
                </p>
              </div>
              {/* 초기화 버튼 */}
              {userLocation && !isWaitingMapClick && (
                <button
                  onClick={() => {
                    setUserLocation(null);
                    setDepartureName('');
                    setDepartureMode('current');
                    getUserLocation(true);
                  }}
                  className="text-[10px] text-gray-400 hover:text-gray-600"
                  title="출발지 초기화"
                >
                  ↺
                </button>
              )}
            </div>

            {/* 출발지 선택 모드 버튼 */}
            <div className="flex gap-1 ml-4">
              <button
                onClick={() => handleModeChange('current')}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors ${departureMode === 'current'
                  ? 'bg-[#5DADE2] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                현재위치
              </button>
              <button
                onClick={() => handleModeChange('search')}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors ${departureMode === 'search'
                  ? 'bg-[#5DADE2] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                검색
              </button>
              <button
                onClick={() => handleModeChange('map')}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] transition-colors ${departureMode === 'map' || isWaitingMapClick
                  ? 'bg-[#5DADE2] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
                </svg>
                지도
              </button>
            </div>

            {/* 검색 입력창 (검색 모드일 때만 표시) */}
            {departureMode === 'search' && (
              <div className="ml-4 mt-1.5 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="출발지 검색..."
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2]"
                />
                {isSearching && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-[#5DADE2] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* 검색 결과 드롭다운 */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {searchResults.map((place, idx) => (
                      <button
                        key={place.id || idx}
                        onClick={() => handleSelectPlace(place)}
                        className="w-full px-2.5 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-xs font-medium text-gray-800 truncate">{place.place_name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{place.address_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 도착지 */}
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
              className={`flex-1 py-2.5 px-2 flex flex-col items-center gap-0.5 transition-colors ${isActive
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
            {departureMode === 'current' && (
              <button
                onClick={() => getUserLocation(true)}
                className="mt-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors text-xs"
              >
                다시 시도
              </button>
            )}
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

            {/* 자동차 상세 경로 (도보 모드에서는 거리/시간만 표시하고 상세 경로 숨김) */}
            {transportType === 'car' && !result.transitInfo && result.guides.length > 0 && (
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
