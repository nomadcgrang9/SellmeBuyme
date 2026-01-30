/**
 * 지역 검색 입력 컴포넌트
 * 구/읍/면 단위로 전국 지역 검색 (카카오맵 API 활용)
 * 작성일: 2026-01-30
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, ChevronDown, X } from 'lucide-react';

export interface RegionData {
  regionCode: string;      // 행정구역 코드
  regionName: string;      // 표시명 (예: "용인시 기흥구")
  fullAddress: string;     // 전체 주소 (예: "경기도 용인시 기흥구")
}

interface RegionSearchInputProps {
  value: RegionData | null;
  onChange: (region: RegionData | null) => void;
  error?: string;
  placeholder?: string;
}

// 검색 결과 캐시 (성능 최적화)
const searchCache = new Map<string, any[]>();

export default function RegionSearchInput({
  value,
  onChange,
  error,
  placeholder = '지역명 검색 (예: 분당구, 기흥구)'
}: RegionSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 카카오맵 API로 지역 검색
  const searchRegion = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setNoResults(false);
      return;
    }

    // 캐시 확인
    const cacheKey = query.toLowerCase();
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey)!;
      setSearchResults(cached);
      setNoResults(cached.length === 0);
      return;
    }

    // 카카오맵 API 체크
    if (!window.kakao?.maps?.services) {
      console.error('[RegionSearchInput] Kakao Maps services not loaded');
      setSearchResults([]);
      setNoResults(true);
      return;
    }

    setIsSearching(true);
    setNoResults(false);

    try {
      const places = new window.kakao.maps.services.Places();

      // 키워드 검색 (유연한 검색 - "분당", "기흥" 등 부분 검색 가능)
      // 구/동/읍/면 + 지역명으로 검색 (예: "분당구", "기흥구")
      const searchKeyword = query.includes('구') || query.includes('동') || query.includes('읍') || query.includes('면')
        ? query
        : query + '구'; // "분당" → "분당구"로 검색

      places.keywordSearch(searchKeyword, (placeResult: any[], placeStatus: string) => {
        if (placeStatus === window.kakao.maps.services.Status.OK && placeResult.length > 0) {
          // 주소에서 지역 정보 추출
          const regionMap = new Map<string, any>();

          placeResult.forEach((p: any) => {
            const addressParts = p.address_name.split(' ');
            if (addressParts.length >= 2) {
              // 시/도 + 시/군/구 (+ 동/읍/면) 추출
              const province = addressParts[0]; // 경기도, 서울특별시 등
              const cityOrDistrict = addressParts[1]; // 성남시, 용인시 등
              const subDistrict = addressParts[2] || ''; // 분당구, 기흥구 등

              // 구/동/읍/면 단위 키 생성
              let regionKey = '';
              let regionName = '';
              let fullAddress = '';

              if (subDistrict && (subDistrict.includes('구') || subDistrict.includes('동') || subDistrict.includes('읍') || subDistrict.includes('면'))) {
                // 시+구 (예: 성남시 분당구)
                regionKey = `${cityOrDistrict} ${subDistrict}`;
                regionName = `${cityOrDistrict} ${subDistrict}`;
                fullAddress = `${province} ${cityOrDistrict} ${subDistrict}`;
              } else if (cityOrDistrict.includes('구') || cityOrDistrict.includes('군')) {
                // 직할시 구 (예: 서울 강남구)
                regionKey = cityOrDistrict;
                regionName = cityOrDistrict;
                fullAddress = `${province} ${cityOrDistrict}`;
              } else {
                // 시 단위 (예: 안성시)
                regionKey = cityOrDistrict;
                regionName = cityOrDistrict;
                fullAddress = `${province} ${cityOrDistrict}`;
              }

              // 중복 방지 (같은 지역은 첫 번째 결과만 사용)
              if (regionKey && !regionMap.has(regionKey)) {
                regionMap.set(regionKey, {
                  regionCode: '',
                  regionName,
                  fullAddress,
                  lat: parseFloat(p.y),
                  lng: parseFloat(p.x)
                });
              }
            }
          });

          const results = Array.from(regionMap.values()).slice(0, 10);
          searchCache.set(cacheKey, results);
          setSearchResults(results);
          setNoResults(results.length === 0);
          setIsSearching(false);
        } else {
          // 키워드 검색 실패 시 주소 검색 시도 (fallback)
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.addressSearch(query, (result: any[], status: string) => {
            setIsSearching(false);

            if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
              const filtered = result.map((item: any) => {
                const addr = item.address || item.road_address;
                if (!addr) return null;

                const regionName = addr.region_3depth_name
                  ? `${addr.region_2depth_name} ${addr.region_3depth_name}`.trim()
                  : addr.region_2depth_name || '';
                const fullAddress = `${addr.region_1depth_name} ${addr.region_2depth_name} ${addr.region_3depth_name || ''}`.trim();

                return {
                  regionCode: addr.h_code || addr.b_code || '',
                  regionName,
                  fullAddress,
                  lat: parseFloat(item.y),
                  lng: parseFloat(item.x)
                };
              }).filter(Boolean);

              // 중복 제거
              const unique = filtered.reduce((acc: any[], curr: any) => {
                if (curr && !acc.find(item => item.regionName === curr.regionName)) {
                  acc.push(curr);
                }
                return acc;
              }, []);

              searchCache.set(cacheKey, unique.slice(0, 10));
              setSearchResults(unique.slice(0, 10));
              setNoResults(unique.length === 0);
            } else {
              searchCache.set(cacheKey, []);
              setSearchResults([]);
              setNoResults(true);
            }
          });
        }
      }, { size: 15 }); // 더 많은 결과에서 지역 추출
    } catch (error) {
      console.error('[RegionSearchInput] Search error:', error);
      setIsSearching(false);
      setSearchResults([]);
      setNoResults(true);
    }
  }, []);

  // 디바운싱된 검색
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length >= 2) {
      debounceRef.current = setTimeout(() => {
        searchRegion(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
      setNoResults(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, searchRegion]);

  // 검색 결과 선택
  const handleSelectRegion = (region: any) => {
    onChange({
      regionCode: region.regionCode,
      regionName: region.regionName,
      fullAddress: region.fullAddress
    });
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(false);
  };

  // 선택 초기화
  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 안내 문구 */}
      <div className="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">
          거주하시는 지역의 구, 읍, 면 정도만 지정해주세요.
          <br />
          등록마커는 해당 지역 내 임의 장소에 배정됩니다.
        </p>
      </div>

      {/* 선택된 값 표시 또는 검색 입력 */}
      {value && !isOpen ? (
        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-800">{value.regionName}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              변경
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
            <Search size={18} className="text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            />
            {isSearching && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* 검색 결과 드롭다운 */}
          {isOpen && (searchResults.length > 0 || noResults) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
              {noResults ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  검색 결과가 없습니다
                </div>
              ) : (
                searchResults.map((region, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectRegion(region)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <MapPin size={16} className="text-gray-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {region.regionName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {region.fullAddress}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
