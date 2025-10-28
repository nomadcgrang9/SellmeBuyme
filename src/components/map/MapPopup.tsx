import { useEffect, useRef, useState } from 'react';
import { IconX, IconExternalLink, IconMapPin, IconPhone, IconClock, IconBuilding } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';

interface MapPopupProps {
  isOpen: boolean;
  onClose: () => void;
  organization: string;  // 학교명 (예: "상원여자중학교")
  location: string;      // 지역 (예: "성남")
  // 추가 정보 (선택사항)
  workPeriod?: string;
  workTime?: string;
  contact?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

export default function MapPopup({
  isOpen,
  onClose,
  organization,
  location,
  workPeriod,
  workTime,
  contact
}: MapPopupProps) {
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  // 좌표 캐싱 키 생성
  const getCacheKey = () => `map_coords_${organization}_${location}`;

  // 캐시에서 좌표 가져오기 (30일 유효)
  const getCachedCoords = (): { coords: Coordinates; address?: string } | null => {
    const key = getCacheKey();
    const cached = localStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached);
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      if (now - data.timestamp < thirtyDaysInMs) {
        return { coords: data.coords, address: data.address };
      } else {
        localStorage.removeItem(key);
      }
    }
    return null;
  };

  // 좌표를 캐시에 저장
  const cacheCoords = (coordinates: Coordinates, foundAddress?: string) => {
    const key = getCacheKey();
    localStorage.setItem(key, JSON.stringify({
      coords: coordinates,
      address: foundAddress,
      timestamp: Date.now()
    }));
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
      setCoords(cached.coords);
      setAddress(cached.address || null);
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
              resolve(result[0]);
            } else {
              reject(new Error('검색 결과 없음'));
            }
          });
        });

        const coordinates = {
          lat: parseFloat(result.y),
          lng: parseFloat(result.x)
        };

        const foundAddress = result.address_name || result.road_address_name;

        console.log(`장소 검색 성공 (${query}):`, coordinates);
        console.log(`검색된 장소: ${result.place_name} (${foundAddress})`);

        setCoords(coordinates);
        setAddress(foundAddress);
        cacheCoords(coordinates, foundAddress);
        setIsSearching(false);
        return;

      } catch (err) {
        console.warn(`"${query}" 검색 실패, 다음 시도...`);
        continue;
      }
    }

    setError('위치를 찾을 수 없습니다. 학교명이 정확하지 않을 수 있습니다.');
    setIsSearching(false);
  };

  // 지도 생성 및 마커 표시
  useEffect(() => {
    if (!coords || !mapContainerRef.current || !window.kakao || !window.kakao.maps) return;

    console.log('[MapPopup] 🗺️ 지도 렌더링:', coords);

    // 지도 옵션 설정
    const mapOption = {
      center: new window.kakao.maps.LatLng(coords.lat, coords.lng),
      level: 3
    };

    // 지도 생성
    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOption);
    mapInstanceRef.current = map;

    // 마커 표시
    const markerPosition = new window.kakao.maps.LatLng(coords.lat, coords.lng);
    const marker = new window.kakao.maps.Marker({
      position: markerPosition
    });
    marker.setMap(map);

    // 커스텀 오버레이
    const content = `
      <div style="
        padding: 8px 12px;
        background: white;
        border: 2px solid #4B5563;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 14px;
        font-weight: 600;
        color: #111827;
        white-space: nowrap;
      ">
        📍 ${organization}
      </div>
    `;

    const customOverlay = new window.kakao.maps.CustomOverlay({
      position: markerPosition,
      content: content,
      yAnchor: 2.5
    });
    customOverlay.setMap(map);

    // 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.TOPRIGHT);

    // 맵 타입 컨트롤 추가
    const mapTypeControl = new window.kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPLEFT);

    return () => {
      // 클린업
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [coords, organization]);

  // 모달이 열릴 때 Kakao Maps 로드 및 주소 검색
  useEffect(() => {
    console.log('[MapPopup] 🔔 모달 상태 변경:', { isOpen, organization, location });

    if (isOpen) {
      console.log('[MapPopup] 📍 지도 로드 시작:', { organization, location });
      loadKakaoMaps()
        .then(() => {
          console.log('[MapPopup] ✅ SDK 로드 완료, 주소 검색 시작');
          return searchAddress();
        })
        .catch((err) => {
          console.error('[MapPopup] 💥 Kakao Maps 로드 오류:', err);
          setError('지도를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
        });
    } else {
      // 모달이 닫힐 때 상태 초기화 (캐시는 유지)
      setError(null);
    }
  }, [isOpen]);

  // Kakao Maps 외부 링크
  const handleOpenInKakaoMaps = () => {
    if (!coords) return;
    const url = `https://map.kakao.com/link/map/${encodeURIComponent(organization)},${coords.lat},${coords.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 길찾기 링크
  const handleDirections = () => {
    if (!coords) return;
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(organization)},${coords.lat},${coords.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 애니메이션 variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto w-full max-w-3xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-5">
                <div className="pr-10">
                  <h2 className="text-2xl font-bold mb-1">{organization}</h2>
                  <p className="text-blue-100 flex items-center gap-2">
                    <IconMapPin size={18} />
                    {location}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="닫기"
                >
                  <IconX size={24} />
                </button>
              </div>

              {/* 본문 - 지도와 정보를 나란히 배치 (데스크톱) / 세로 배치 (모바일) */}
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* 지도 영역 */}
                <div className="flex-1 relative bg-gray-100 min-h-[300px] md:min-h-[400px]">
                  {isSearching && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                      <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-gray-600 mt-4 font-medium">지도를 불러오는 중...</p>
                    </div>
                  )}

                  {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-6">
                      <IconMapPin size={64} className="text-gray-300 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">위치를 찾을 수 없습니다</h3>
                      <p className="text-gray-600 text-center mb-6">{error}</p>
                      <button
                        onClick={() => {
                          window.open(`https://map.kakao.com/link/search/${encodeURIComponent(organization)}`, '_blank');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                      >
                        <IconExternalLink size={18} />
                        Kakao Maps에서 직접 검색
                      </button>
                    </div>
                  )}

                  {/* 지도 컨테이너 */}
                  <div
                    ref={mapContainerRef}
                    className="w-full h-full"
                    style={{ display: isSearching || error ? 'none' : 'block' }}
                  />
                </div>

                {/* 정보 영역 */}
                <div className="w-full md:w-72 bg-gray-50 p-5 flex flex-col">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-4 text-lg">상세 정보</h3>

                    <div className="space-y-3">
                      {/* 주소 */}
                      {address && (
                        <div className="bg-white rounded-lg p-3">
                          <div className="flex items-start gap-2.5">
                            <IconBuilding size={20} className="text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">주소</p>
                              <p className="text-sm font-medium text-gray-900">{address}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 근무기간 */}
                      {workPeriod && (
                        <div className="bg-white rounded-lg p-3">
                          <div className="flex items-start gap-2.5">
                            <IconClock size={20} className="text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">근무기간</p>
                              <p className="text-sm font-medium text-gray-900">{workPeriod}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 근무시간 */}
                      {workTime && (
                        <div className="bg-white rounded-lg p-3">
                          <div className="flex items-start gap-2.5">
                            <IconClock size={20} className="text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">근무시간</p>
                              <p className="text-sm font-medium text-gray-900">{workTime}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 연락처 */}
                      {contact && (
                        <div className="bg-white rounded-lg p-3">
                          <div className="flex items-start gap-2.5">
                            <IconPhone size={20} className="text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">문의</p>
                              <p className="text-sm font-medium text-gray-900">{contact}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  {coords && !error && (
                    <div className="flex flex-col gap-2 mt-5">
                      <button
                        onClick={handleOpenInKakaoMaps}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
                      >
                        <IconExternalLink size={18} />
                        큰 지도로 보기
                      </button>
                      <button
                        onClick={handleDirections}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <IconMapPin size={18} />
                        길찾기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}