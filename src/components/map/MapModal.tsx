import { useEffect, useRef, useState } from 'react';
import { IconX, IconExternalLink, IconMapPin } from '@tabler/icons-react';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: string;  // 학교명 (예: "상원여자중학교")
  location: string;      // 지역 (예: "성남")
}

interface Coordinates {
  lat: number;
  lng: number;
}

export default function MapModal({ isOpen, onClose, organization, location }: MapModalProps) {
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 좌표 캐싱 키 생성
  const getCacheKey = () => `map_coords_${organization}_${location}`;

  // localStorage에서 캐시된 좌표 가져오기
  const getCachedCoords = (): Coordinates | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;

      const { lat, lng, timestamp } = JSON.parse(cached);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      // 30일 이내 캐시만 사용
      if (Date.now() - timestamp < thirtyDays) {
        return { lat, lng };
      }

      // 만료된 캐시 삭제
      localStorage.removeItem(getCacheKey());
      return null;
    } catch (err) {
      console.error('캐시 읽기 오류:', err);
      return null;
    }
  };

  // 좌표를 localStorage에 캐싱
  const cacheCoords = (coords: Coordinates) => {
    try {
      localStorage.setItem(
        getCacheKey(),
        JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          timestamp: Date.now()
        })
      );
    } catch (err) {
      console.error('캐시 저장 오류:', err);
    }
  };

  // 장소 검색: 학교명 → 좌표 변환 (자동 실행)
  const searchAddress = async () => {
    if (!window.kakao || !window.kakao.maps) {
      setError('지도 SDK가 로드되지 않았습니다.');
      return;
    }

    // 1. 캐시 확인
    const cached = getCachedCoords();
    if (cached) {
      console.log('캐시된 좌표 사용:', cached);
      setCoords(cached);
      return;
    }

    setIsSearching(true);
    setError(null);

    // Places API 사용 (키워드 검색)
    const places = new window.kakao.maps.services.Places();

    // 3단계 폴백 검색 전략 (학교명 우선)
    const searchQueries = [
      organization,                           // 1차: 학교명만
      `${organization} ${location}`,          // 2차: 학교명 + 지역
      `경기도 ${location} ${organization}`    // 3차: 전체 (경기도 + 지역 + 학교명)
    ];

    for (const query of searchQueries) {
      console.log(`장소 검색 시도: "${query}"`);

      try {
        const result = await new Promise<any>((resolve, reject) => {
          places.keywordSearch(query, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
              // 가장 관련성 높은 결과 선택 (첫 번째)
              resolve(result[0]);
            } else {
              reject(new Error('검색 결과 없음'));
            }
          });
        });

        // 성공: 좌표 저장 및 캐싱
        const coordinates = {
          lat: parseFloat(result.y),
          lng: parseFloat(result.x)
        };

        console.log(`장소 검색 성공 (${query}):`, coordinates);
        console.log(`검색된 장소: ${result.place_name} (${result.address_name})`);
        setCoords(coordinates);
        cacheCoords(coordinates);
        setIsSearching(false);
        return;

      } catch (err) {
        console.warn(`"${query}" 검색 실패, 다음 시도...`);
        continue;
      }
    }

    // 모든 검색 실패
    setError('위치를 찾을 수 없습니다. 학교명이 정확하지 않을 수 있습니다.');
    setIsSearching(false);
  };

  // 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!isLoaded || !coords || !mapContainerRef.current) return;

    const { kakao } = window;

    // 지도 생성
    const mapOption = {
      center: new kakao.maps.LatLng(coords.lat, coords.lng),
      level: 3  // 확대 레벨 (1~14, 낮을수록 상세)
    };

    const map = new kakao.maps.Map(mapContainerRef.current, mapOption);
    mapInstanceRef.current = map;

    // 마커 생성
    const markerPosition = new kakao.maps.LatLng(coords.lat, coords.lng);
    const marker = new kakao.maps.Marker({
      position: markerPosition,
      map: map
    });

    // InfoWindow (학교명 표시)
    const infowindow = new kakao.maps.InfoWindow({
      content: `<div style="padding:8px 12px; font-size:14px; font-weight:600; color:#333;">${organization}</div>`,
      removable: false
    });

    infowindow.open(map, marker);

    // 클린업
    return () => {
      if (mapInstanceRef.current) {
        // Kakao Maps는 명시적인 destroy 메서드가 없으므로 ref만 정리
        mapInstanceRef.current = null;
      }
    };
  }, [isLoaded, coords, organization]);

  // 모달이 열릴 때 SDK 로드 및 주소 검색
  useEffect(() => {
    console.log('[MapModal] 🔔 모달 상태 변경:', { isOpen, organization, location });

    if (isOpen) {
      console.log('[MapModal] 📍 지도 로드 시작:', { organization, location });

      loadKakaoMaps()
        .then(() => {
          console.log('[MapModal] ✅ SDK 로드 완료, 주소 검색 시작');
          return searchAddress();
        })
        .catch((err) => {
          console.error('[MapModal] 💥 Kakao Maps 로드 오류:', err);
          setError('지도를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        });
    }
  }, [isOpen]);

  // Kakao Maps 외부 링크
  const handleOpenInKakaoMaps = () => {
    if (!coords) return;
    const url = `https://map.kakao.com/link/map/${encodeURIComponent(organization)},${coords.lat},${coords.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        // 배경 클릭 시 모달 닫기
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{organization}</h2>
            <p className="text-sm text-gray-600">{location}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* 지도 영역 */}
        <div className="relative bg-gray-100">
          {isSearching && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-10">
              <div className="animate-spin text-4xl mb-4">🗺️</div>
              <p className="text-gray-600">지도를 불러오는 중...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-6">
              <IconMapPin size={48} className="text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">위치를 찾을 수 없습니다</h3>
              <p className="text-sm text-gray-600 text-center mb-4">{error}</p>
              <p className="text-xs text-gray-500 mb-4">주소: {location}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://map.kakao.com/link/search/${encodeURIComponent(organization)}`, '_blank');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <IconExternalLink size={16} />
                Kakao Maps에서 직접 검색하기
              </button>
            </div>
          )}

          {/* 지도 컨테이너 */}
          <div
            ref={mapContainerRef}
            className="w-full h-96 md:h-[450px]"
            style={{ display: isSearching || error ? 'none' : 'block' }}
          />
        </div>

        {/* 하단 버튼 */}
        {coords && !error && (
          <div className="flex gap-2 px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenInKakaoMaps();
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
            >
              <IconExternalLink size={16} />
              Kakao Maps에서 크게 보기
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://map.kakao.com/link/to/${encodeURIComponent(organization)},${coords.lat},${coords.lng}`, '_blank');
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
            >
              <IconMapPin size={16} />
              길찾기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
