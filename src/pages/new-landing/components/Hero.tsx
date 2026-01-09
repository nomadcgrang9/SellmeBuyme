import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MOCK_BANNERS, LOCATIONS, SCHOOL_LEVELS } from '../constants';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';
import { fetchJobsByBoardRegion } from '@/lib/supabase/queries';
import type { JobPostingCard } from '@/types';

const THEMES = {
  'neon-blue': {
    wrapper: 'bg-gradient-to-br from-blue-900 to-slate-800',
    orb1: 'bg-blue-400',
    orb2: 'bg-cyan-300',
    orb3: 'bg-indigo-400',
    textAccent: 'text-blue-100'
  },
  'midnight-purple': {
    wrapper: 'bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900',
    orb1: 'bg-fuchsia-400',
    orb2: 'bg-purple-300',
    orb3: 'bg-pink-400',
    textAccent: 'text-purple-100'
  },
  'sunset-vibes': {
    wrapper: 'bg-gradient-to-br from-orange-800 to-red-900',
    orb1: 'bg-yellow-400',
    orb2: 'bg-orange-300',
    orb3: 'bg-rose-400',
    textAccent: 'text-orange-100'
  }
};

// Component to handle character-by-character animation
const AnimatedText = ({
  text,
  className,
  baseDelay = 0,
  staggerDelay = 30
}: {
  text: string;
  className?: string;
  baseDelay?: number;
  staggerDelay?: number;
}) => {
  // Split text by newlines to handle multi-line text blocks correctly
  const lines = text.split('\n');
  let charGlobalIndex = 0;

  return (
    <div className={className}>
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} className="block">
          {line.split('').map((char, charIndex) => {
            const currentDelay = baseDelay + (charGlobalIndex * staggerDelay);
            charGlobalIndex++;
            return (
              <span
                key={`${lineIndex}-${charIndex}`}
                className="inline-block opacity-0 animate-fade-in"
                style={{
                  animationDelay: `${currentDelay}ms`,
                  animationFillMode: 'forwards',
                  marginRight: char === ' ' ? '0.25em' : '0'
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Hero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  // 지도 필터 옵션
  const MAP_FILTER_TYPES = ['교원', '공무직', '기타'] as const;
  const MAP_FILTER_EMPLOYMENT = ['기간제', '시간강사', '기타'] as const;

  // 지도 필터 상태
  const [mapFilters, setMapFilters] = useState<{
    regions: string[];
    schoolLevels: string[];
    types: string[];
    employment: string[];
  }>({
    regions: [],
    schoolLevels: [],
    types: [],
    employment: [],
  });

  // 필터 토글 핸들러
  const toggleMapFilter = (category: 'regions' | 'schoolLevels' | 'types' | 'employment', value: string) => {
    setMapFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();

  // 사용자 위치 상태
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  // 공고 데이터 상태
  const [jobPostings, setJobPostings] = useState<JobPostingCard[]>([]);
  const mapMarkersRef = useRef<any[]>([]);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [mapZoomLevel, setMapZoomLevel] = useState(5);
  const MARKER_VISIBLE_ZOOM_LEVEL = 6;

  // 지역 선택 시 해당 지역으로 지도 이동 및 공고 로드
  const handleRegionSelect = useCallback((region: string) => {
    if (!isLoaded) return;

    toggleMapFilter('regions', region);

    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(region, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
      }
    });
  }, [isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOCK_BANNERS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load Kakao Maps SDK
  useEffect(() => {
    loadKakaoMaps();
  }, [loadKakaoMaps]);

  // 주소 검색 핸들러
  const handleLocationSearch = useCallback(() => {
    if (!locationSearchQuery.trim() || !isLoaded) return;

    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(locationSearchQuery, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        setLocationSearchQuery('');
      } else {
        const places = new window.kakao.maps.services.Places();
        places.keywordSearch(locationSearchQuery, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const { y: lat, x: lng } = result[0];
            setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
            setLocationSearchQuery('');
          }
        });
      }
    });
  }, [locationSearchQuery, isLoaded]);

  // 기본 위치 (서울)
  const defaultLocation = { lat: 37.5665, lng: 126.9780 };
  const mapCenter = userLocation || defaultLocation;

  // Initialize map (바로 인터랙티브하게)
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const center = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);

    const mapOption = {
      center: center,
      level: 5,
      draggable: true,
      scrollwheel: true,
      disableDoubleClickZoom: false,
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOption);
    mapInstanceRef.current = map;

    // 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    // 줌 레벨 변경 이벤트 리스너
    window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
      const level = map.getLevel();
      setMapZoomLevel(level);
    });

    // 기본 위치(서울) 공고 로드
    loadJobPostings('서울');
  }, [isLoaded, mapCenter.lat, mapCenter.lng]);

  // 사용자 위치 변경 시 지도 중심 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    const newCenter = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    mapInstanceRef.current.setCenter(newCenter);
  }, [userLocation]);

  // 공고 로드 함수
  const loadJobPostings = async (regionName: string) => {
    try {
      console.log('[Hero] 공고 데이터 로드 시작, 지역:', regionName);
      const jobs = await fetchJobsByBoardRegion(regionName, 50);
      console.log('[Hero] 공고 데이터 로드 완료:', jobs.length, '개');
      setJobPostings(jobs);
      setCurrentRegion(regionName);
    } catch (error) {
      console.error('[Hero] 공고 데이터 로드 실패:', error);
    }
  };

  // 사용자 위치 기반 공고 데이터 가져오기
  useEffect(() => {
    if (!isLoaded || !userLocation || !mapInstanceRef.current) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    const coords = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

    geocoder.coord2RegionCode(coords.getLng(), coords.getLat(), (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const region = result.find((r: any) => r.region_type === 'H') || result[0];
        const regionName = region.region_1depth_name;

        const simplifiedRegion = regionName
          .replace(/특별시$/, '')
          .replace(/광역시$/, '')
          .replace(/특별자치시$/, '')
          .replace(/특별자치도$/, '')
          .replace(/도$/, '');

        loadJobPostings(simplifiedRegion);
      }
    });
  }, [isLoaded, userLocation]);

  // 공고 마커 표시
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || jobPostings.length === 0) return;

    if (mapZoomLevel > MARKER_VISIBLE_ZOOM_LEVEL) {
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
      return;
    }

    const map = mapInstanceRef.current;
    const places = new window.kakao.maps.services.Places();

    mapMarkersRef.current.forEach(marker => marker.setMap(null));
    mapMarkersRef.current = [];

    let markerIndex = 0;
    const processNextMarker = () => {
      if (markerIndex >= jobPostings.length) return;

      const job = jobPostings[markerIndex];
      markerIndex++;

      if (!job.location && !job.organization) {
        processNextMarker();
        return;
      }

      const searchKeyword = job.organization || job.location;

      places.keywordSearch(searchKeyword, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          createJobMarker(map, coords, job);
        }
        setTimeout(processNextMarker, 50);
      });
    };

    processNextMarker();

    function createJobMarker(map: any, position: any, job: JobPostingCard) {
      const markerImageSrc = job.isUrgent
        ? 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png'
        : undefined;

      const markerOptions: any = {
        position: position,
        map: map,
      };

      if (markerImageSrc) {
        const imageSize = new window.kakao.maps.Size(24, 35);
        const markerImage = new window.kakao.maps.MarkerImage(markerImageSrc, imageSize);
        markerOptions.image = markerImage;
      }

      const marker = new window.kakao.maps.Marker(markerOptions);
      mapMarkersRef.current.push(marker);

      const infoContent = `
        <div style="padding:8px 12px;min-width:180px;max-width:250px;">
          <div style="font-size:11px;color:#666;margin-bottom:4px;">${job.organization}</div>
          <div style="font-size:13px;font-weight:600;color:#333;line-height:1.3;margin-bottom:6px;">${job.title.length > 30 ? job.title.slice(0, 30) + '...' : job.title}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            ${job.daysLeft !== undefined ? `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${job.daysLeft <= 3 ? '#FEE2E2' : '#E0E7FF'};color:${job.daysLeft <= 3 ? '#DC2626' : '#4F46E5'};">D-${job.daysLeft}</span>` : ''}
            ${job.tags?.slice(0, 2).map(tag => `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:#F3F4F6;color:#6B7280;">${tag}</span>`).join('') || ''}
          </div>
        </div>
      `;

      const infowindow = new window.kakao.maps.InfoWindow({
        content: infoContent,
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
      });

      window.kakao.maps.event.addListener(marker, 'mouseover', () => {
        infowindow.open(map, marker);
      });

      window.kakao.maps.event.addListener(marker, 'mouseout', () => {
        infowindow.close();
      });
    }

    return () => {
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
    };
  }, [isLoaded, jobPostings, mapZoomLevel]);

  const activeBanner = MOCK_BANNERS[activeIndex];
  const theme = THEMES[activeBanner.theme] || THEMES['neon-blue'];

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[340px]">

        {/* LEFT: Map Widget (Span 2) - 크게 표시 */}
        <div className="hidden lg:block relative lg:col-span-2 h-[300px] lg:h-full rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
          {/* 지도 컨테이너 */}
          <div
            ref={mapContainerRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* 필터 사이드바 */}
          <div className="absolute top-0 right-0 h-full w-[200px] bg-white/95 backdrop-blur-sm z-10 border-l border-gray-200 shadow-lg overflow-y-auto">
            {/* 필터 헤더 */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-3 py-2 border-b border-gray-200 z-10">
              <h4 className="font-bold text-gray-800 text-sm">지도 필터</h4>
            </div>

            {/* 필터 내용 */}
            <div className="p-3 space-y-3">
              {/* 지역 필터 */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-1.5">지역</h5>
                <div className="flex flex-wrap gap-1">
                  {LOCATIONS.slice(0, 8).map(region => (
                    <button
                      key={region}
                      onClick={() => handleRegionSelect(region)}
                      className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                        mapFilters.regions.includes(region)
                          ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
                {/* 위치 검색창 */}
                <div className="mt-2 relative">
                  <input
                    type="text"
                    placeholder="주소 검색"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLocationSearch();
                      }
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B6EF7]"
                  />
                </div>
              </div>

              {/* 학교급 필터 */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-1.5">학교급</h5>
                <div className="flex flex-wrap gap-1">
                  {SCHOOL_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => toggleMapFilter('schoolLevels', level)}
                      className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                        mapFilters.schoolLevels.includes(level)
                          ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* 유형 필터 */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-1.5">유형</h5>
                <div className="flex flex-wrap gap-1">
                  {MAP_FILTER_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleMapFilter('types', type)}
                      className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                        mapFilters.types.includes(type)
                          ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* 고용형태 필터 */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-1.5">고용형태</h5>
                <div className="flex flex-wrap gap-1">
                  {MAP_FILTER_EMPLOYMENT.map(emp => (
                    <button
                      key={emp}
                      onClick={() => toggleMapFilter('employment', emp)}
                      className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                        mapFilters.employment.includes(emp)
                          ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                      }`}
                    >
                      {emp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 마커 안내 */}
            {mapZoomLevel > MARKER_VISIBLE_ZOOM_LEVEL && (
              <div className="px-3 py-2 bg-blue-50 border-t border-blue-100">
                <p className="text-[10px] text-blue-600 text-center">
                  지도를 확대하면 공고 마커가 표시됩니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Banner Slider (Span 1) - 작게 표시 */}
        <div ref={bannerRef} className={`relative overflow-hidden shadow-lg h-[300px] lg:h-full group w-full rounded-2xl ${!activeBanner.backgroundImage ? theme.wrapper : ''}`}>

            {/* Background Image with blur effect */}
            {activeBanner.backgroundImage && (
              <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105 blur-[2px]"
                style={{ backgroundImage: `url(${activeBanner.backgroundImage})` }}
              />
            )}

            {/* Dark Overlay for text readability */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>

            {/* Animated Background Effects */}
            <div className={`absolute inset-0 overflow-hidden ${activeBanner.backgroundImage ? 'opacity-30' : ''}`}>
                <div className={`absolute top-0 right-[-10%] w-[300px] h-[300px] rounded-full blur-[60px] opacity-50 mix-blend-screen animate-blob ${theme.orb1}`}></div>
                <div className={`absolute bottom-[-20%] left-[-10%] w-[250px] h-[250px] rounded-full blur-[50px] opacity-40 mix-blend-screen animate-blob animation-delay-2000 ${theme.orb2}`}></div>
                <div className={`absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full blur-[40px] opacity-40 mix-blend-plus-lighter animate-blob animation-delay-4000 ${theme.orb3}`}></div>
            </div>

            {/* Content Layer */}
            <div className="absolute inset-0 flex items-center justify-between p-5 z-10">
                <div className="w-full font-sandoll">
                    <div key={`content-${activeIndex}`}>
                        <AnimatedText
                            text={activeBanner.title}
                            className="text-xl md:text-2xl font-bold mb-2 text-white tracking-wide leading-snug [text-shadow:_0_2px_8px_rgba(0,0,0,0.7),_0_4px_16px_rgba(0,0,0,0.5)]"
                            baseDelay={500}
                            staggerDelay={40}
                        />

                        <AnimatedText
                            text={activeBanner.subtitle}
                            className={`text-xs md:text-sm font-medium mb-4 text-white/90 leading-relaxed tracking-wider [text-shadow:_0_1px_4px_rgba(0,0,0,0.6),_0_2px_8px_rgba(0,0,0,0.4)]`}
                            baseDelay={1500}
                            staggerDelay={20}
                        />
                    </div>
                </div>
            </div>

            {/* Paginator */}
            <div className="absolute bottom-4 left-5 flex gap-2 z-20">
                {MOCK_BANNERS.map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
                    />
                ))}
            </div>
        </div>

      </div>
    </section>
  );
};
