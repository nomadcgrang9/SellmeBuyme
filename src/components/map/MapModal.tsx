import { useEffect, useRef, useState } from 'react';
import { IconX, IconExternalLink, IconMapPin } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: string;  // 학교명 (예: "상원여자중학교")
  location: string;      // 지역 (예: "성남")
  cardIndex: number;     // 카드 인덱스 (0, 1, 2...)
  containerRef?: React.RefObject<HTMLDivElement>; // 카드 컨테이너 참조
}

interface Coordinates {
  lat: number;
  lng: number;
}

export default function MapModal({ isOpen, onClose, organization, location, cardIndex }: MapModalProps) {
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3열 그리드에서 카드 위치 계산 (0, 1, 2)
  const columnIndex = cardIndex % 3;
  // 카드 C(인덱스 2)는 왼쪽에서, 나머지는 오른쪽에서 나타남
  const isLeftDrawer = columnIndex === 2;


  // 좌표 캐싱 키 생성
  const getCacheKey = () => `map_coords_${organization}_${location}`;

  // 캐시에서 좌표 가져오기 (30일 유효)
  const getCachedCoords = (): Coordinates | null => {
    const key = getCacheKey();
    const cached = localStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached);
      const now = Date.now();
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

      if (now - data.timestamp < thirtyDaysInMs) {
        return data.coords;
      } else {
        localStorage.removeItem(key);
      }
    }
    return null;
  };

  // 좌표를 캐시에 저장
  const cacheCoords = (coordinates: Coordinates) => {
    const key = getCacheKey();
    localStorage.setItem(key, JSON.stringify({
      coords: coordinates,
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

        setCoords(coordinates);
        cacheCoords(coordinates);
        setIsSearching(false);
        return;

      } catch (err) {
        continue;
      }
    }

    setError('위치를 찾을 수 없습니다. 학교명이 정확하지 않을 수 있습니다.');
    setIsSearching(false);
  };

  // 지도 생성 및 마커 표시
  useEffect(() => {
    if (!coords || !mapContainerRef.current || !window.kakao || !window.kakao.maps) return;


    const mapOption = {
      center: new window.kakao.maps.LatLng(coords.lat, coords.lng),
      level: 3
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOption);
    mapInstanceRef.current = map;

    // 마커 표시
    const markerPosition = new window.kakao.maps.LatLng(coords.lat, coords.lng);
    const marker = new window.kakao.maps.Marker({
      position: markerPosition
    });
    marker.setMap(map);

    // 인포윈도우
    const infowindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:5px;font-size:12px;">${organization}</div>`
    });
    infowindow.open(map, marker);

    // 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.TOPRIGHT);

    return () => {
      // 클린업
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [coords, organization]);

  // 모달이 열릴 때 Kakao Maps 로드 및 주소 검색
  useEffect(() => {

    if (isOpen) {
      loadKakaoMaps()
        .then(() => {
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

  // 애니메이션 variants
  const drawerVariants = {
    hidden: {
      x: isLeftDrawer ? '-100%' : '100%',
      opacity: 0
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: isLeftDrawer ? '-100%' : '100%',
      opacity: 0,
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black bg-opacity-30"
          />

          {/* 사이드 드로어 패널 */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed top-0 bottom-0 z-50 bg-white shadow-2xl overflow-hidden flex flex-col ${
              isLeftDrawer ? 'left-0' : 'right-0'
            } w-full md:w-[400px] lg:w-[450px]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{organization}</h2>
                <p className="text-sm text-gray-600">{location}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                aria-label="닫기"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* 지도 영역 */}
            <div className="flex-1 relative bg-gray-100">
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://map.kakao.com/link/search/${encodeURIComponent(organization)}`, '_blank');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <IconExternalLink size={16} />
                    Kakao Maps에서 검색
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

            {/* 하단 버튼 */}
            {coords && !error && (
              <div className="flex gap-2 px-5 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenInKakaoMaps();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-400 text-gray-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors"
                >
                  <IconExternalLink size={18} />
                  크게 보기
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://map.kakao.com/link/to/${encodeURIComponent(organization)},${coords.lat},${coords.lng}`, '_blank');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <IconMapPin size={18} />
                  길찾기
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}