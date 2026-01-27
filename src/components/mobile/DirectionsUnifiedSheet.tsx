import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { TransportType, DirectionsResult } from '@/types/directions';
import { formatDistance, formatDuration, formatFare } from '@/lib/api/directions';

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface SearchResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface DirectionsUnifiedSheetProps {
  isOpen: boolean;
  onClose: () => void;
  startLocation: Location | null;
  endLocation: Location | null;
  directionsResult: DirectionsResult | null;
  transportType: TransportType;
  onTransportTypeChange: (type: TransportType) => void;
  isLoading?: boolean;
  destinationName?: string;
  onSelectCurrentLocation: () => void;
  onSelectSearchLocation: (location: SearchResult) => void;
  onSelectMapLocation: () => void;
  onClearStartLocation: () => void;
  hasLocationPermission: boolean;
  onRequestLocationPermission: () => void;
}

const DirectionsUnifiedSheet: React.FC<DirectionsUnifiedSheetProps> = ({
  isOpen,
  onClose,
  startLocation,
  endLocation,
  directionsResult,
  transportType,
  onTransportTypeChange,
  isLoading = false,
  destinationName = '',
  onSelectCurrentLocation,
  onSelectSearchLocation,
  onSelectMapLocation,
  onClearStartLocation,
  hasLocationPermission,
  onRequestLocationPermission,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 시트 열릴 때 입력창에 포커스
  useEffect(() => {
    if (isOpen && !startLocation) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, startLocation]);

  // startLocation이 설정되면 검색 결과 초기화
  useEffect(() => {
    if (startLocation) {
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [startLocation]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      onClose();
    }, 200);
  }, [onClose]);

  // 카카오맵에서 열기
  const openInKakaoMap = useCallback(() => {
    if (!startLocation || !endLocation) return;
    const url = `https://map.kakao.com/link/from/${encodeURIComponent(startLocation.name || '출발지')},${startLocation.lat},${startLocation.lng}/to/${encodeURIComponent(destinationName || endLocation.name || '도착지')},${endLocation.lat},${endLocation.lng}`;
    window.open(url, '_blank');
  }, [startLocation, endLocation, destinationName]);

  // 현재 위치 선택
  const handleCurrentClick = () => {
    setShowDropdown(false);
    if (!hasLocationPermission) {
      onRequestLocationPermission();
      return;
    }
    setIsLocating(true);
    onSelectCurrentLocation();
  };

  // startLocation이 설정되면 로딩 상태 해제
  useEffect(() => {
    if (startLocation) {
      setIsLocating(false);
    }
  }, [startLocation]);

  // 검색 실행
  const performSearch = useCallback((query: string) => {
    if (!query.trim() || !window.kakao?.maps?.services) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const places = new window.kakao.maps.services.Places();

    places.keywordSearch(query, (results: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const mapped = results.slice(0, 5).map((place) => ({
          id: place.id,
          name: place.place_name,
          address: place.address_name || place.road_address_name || '',
          lat: parseFloat(place.y),
          lng: parseFloat(place.x),
        }));
        setSearchResults(mapped);
      } else {
        setSearchResults([]);
      }
      setIsSearching(false);
    });
  }, []);

  // 디바운스 검색
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowDropdown(false);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  // 검색 결과 선택
  const handleSelectResult = (result: SearchResult) => {
    onSelectSearchLocation(result);
    setSearchQuery('');
    setSearchResults([]);
  };

  // 출발지 초기화 (변경)
  const handleClearStart = () => {
    onClearStartLocation();
    setSearchQuery('');
    setSearchResults([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!isOpen) return null;

  // 배경 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // 교통수단 아이콘
  const transportIcons: Record<TransportType, React.ReactNode> = {
    car: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    transit: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-9.12c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V6.375" />
      </svg>
    ),
    walk: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  };

  // 요금 텍스트 생성
  const getFareText = () => {
    if (!directionsResult?.fare) return null;
    const parts: string[] = [];
    if (directionsResult.fare.taxi && directionsResult.fare.taxi > 0) {
      parts.push(`택시 ${formatFare(directionsResult.fare.taxi)}`);
    }
    if (directionsResult.fare.fuel && directionsResult.fare.fuel > 0) {
      parts.push(`주유 ${formatFare(directionsResult.fare.fuel)}`);
    }
    if (directionsResult.fare.toll && directionsResult.fare.toll > 0) {
      parts.push(`통행료 ${formatFare(directionsResult.fare.toll)}`);
    }
    if (directionsResult.fare.transit && directionsResult.fare.transit > 0) {
      parts.push(`요금 ${formatFare(directionsResult.fare.transit)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  return (
    <>
      {/* 모달 컨텐츠 - 배경 dimmed 제거 (경로를 보기 위해) */}
      <div
        className={`
          fixed bottom-4 left-4 right-4 z-40 bg-white rounded-2xl shadow-lg
          transition-transform duration-200
          ${isClosing ? 'translate-y-full' : 'translate-y-0'}
        `}
        style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' }}
      >
      {/* 헤더: 공고보기 + 교통수단 탭 + 카카오 버튼 (한 줄) */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        {/* 공고로 돌아가기 (뒤로가기) */}
        <button
          onClick={handleClose}
          className="flex items-center gap-0.5 px-2 py-1 -ml-1 text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs font-medium leading-tight text-left">
            <span className="block">공고로</span>
            <span className="block">돌아가기</span>
          </span>
        </button>

        {/* 교통수단 탭 (아이콘만, 컴팩트) */}
        <div className="flex gap-1.5 flex-shrink-0">
          {(['car', 'transit', 'walk'] as TransportType[]).map((type) => {
            const isActive = transportType === type;
            return (
              <button
                key={type}
                onClick={() => onTransportTypeChange(type)}
                disabled={isLoading || !startLocation}
                className={`
                  p-2 rounded-lg transition-colors flex-shrink-0
                  ${isActive
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }
                  ${(isLoading || !startLocation) ? 'opacity-50' : ''}
                `}
              >
                {transportIcons[type]}
              </button>
            );
          })}
        </div>

        {/* 여백 */}
        <div className="flex-1 min-w-2" />

        {/* 카카오맵 버튼 (아이콘만) */}
        <button
          onClick={openInKakaoMap}
          disabled={!directionsResult}
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-sm"
          aria-label="카카오맵에서 열기"
        >
          <img src="/icons/kakaomap.svg" alt="카카오맵" className="w-full h-full" />
        </button>
      </div>

      {/* 출발/도착 입력 영역 */}
      <div className="px-4 py-3 space-y-3">
        {/* 출발지 */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
          <div className="flex-1 relative">
            {startLocation ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl">
                <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                  {startLocation.name}
                </span>
                <button
                  onClick={handleClearStart}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* 출발지 검색창 - 너비 제한 */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 rounded-xl" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 'calc(100% - 76px)' }}>
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    placeholder="출발지 검색"
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400 min-w-0 w-full"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                      className="p-0.5 text-gray-400 flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* 현재위치 버튼 - 고정 너비, 눈에 띄는 색상 */}
                <button
                  onClick={handleCurrentClick}
                  disabled={isLocating}
                  className="flex-shrink-0 w-[68px] py-2.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-600 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1 disabled:opacity-70"
                >
                  {isLocating ? (
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
                      </svg>
                      현위치
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 도착지 */}
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
          <div className="flex-1 px-3 py-2.5 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-900 truncate block">
              {destinationName || endLocation?.name || '도착지'}
            </span>
          </div>
        </div>
      </div>

      {/* 검색 결과 (인라인 리스트 - 카드 없이) */}
      {(searchResults.length > 0 || isSearching) && !startLocation && (
        <div className="border-t border-gray-100 max-h-48 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            searchResults.map((result, index) => (
              <button
                key={result.id}
                onClick={() => handleSelectResult(result)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  hover:bg-gray-50 active:bg-gray-100 transition-colors
                  ${index < searchResults.length - 1 ? 'border-b border-gray-50' : ''}
                `}
              >
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                  <p className="text-xs text-gray-500 truncate">{result.address}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* 경로 결과 - 1줄 컴팩트 레이아웃 */}
      <div className="px-4 py-3 border-t border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
            <span className="text-sm text-gray-500">경로 검색 중...</span>
          </div>
        ) : directionsResult && startLocation ? (
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
              {formatDuration(directionsResult.totalTime)}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-600 whitespace-nowrap">
              {formatDistance(directionsResult.totalDistance)}
            </span>
            {getFareText() && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {getFareText()}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-2 text-sm text-gray-400">
            {startLocation ? '경로를 불러올 수 없습니다' : '출발지를 입력하세요'}
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default DirectionsUnifiedSheet;
