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
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

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
  const expandedMapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const expandedMapInstanceRef = useRef<any>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();

  // 사용자 위치 상태
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true); // 위치 권한 요청 UI 표시 여부
  const [locationSearchQuery, setLocationSearchQuery] = useState(''); // 위치 검색어

  // 공고 데이터 상태
  const [jobPostings, setJobPostings] = useState<JobPostingCard[]>([]);
  const mapMarkersRef = useRef<any[]>([]); // 마커 참조 저장
  const [expandedMapReady, setExpandedMapReady] = useState(false); // 확장 지도 준비 완료
  const [currentRegion, setCurrentRegion] = useState<string | null>(null); // 현재 선택된 지역
  const [mapZoomLevel, setMapZoomLevel] = useState(5); // 지도 줌 레벨 (낮을수록 확대)
  const MARKER_VISIBLE_ZOOM_LEVEL = 6; // 마커가 표시되는 최대 줌 레벨 (6 이하일 때 표시)

  // 지역 선택 시 해당 지역으로 지도 이동 및 공고 로드
  const handleRegionSelect = useCallback((region: string) => {
    if (!isLoaded) return;

    // 필터 토글
    toggleMapFilter('regions', region);

    // 지역명으로 좌표 검색
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(region, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        setShowLocationPrompt(false);
      }
    });
  }, [isLoaded]);

  // 지도 확장 최대 너비 (배너 너비 + gap 만큼)
  const [maxExpandWidth, setMaxExpandWidth] = useState(800);

  // 배너 너비 측정하여 최대 확장 너비 설정
  useEffect(() => {
    const updateMaxWidth = () => {
      if (bannerRef.current) {
        // 배너 너비 + gap(24px) 만큼 확장 가능
        const bannerWidth = bannerRef.current.offsetWidth;
        setMaxExpandWidth(bannerWidth + 24);
      }
    };

    updateMaxWidth();
    window.addEventListener('resize', updateMaxWidth);
    return () => window.removeEventListener('resize', updateMaxWidth);
  }, []);

  useEffect(() => {
    // 10 seconds interval
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOCK_BANNERS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load Kakao Maps SDK
  useEffect(() => {
    loadKakaoMaps();
  }, [loadKakaoMaps]);

  // 사용자 위치 요청 함수
  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      setShowLocationPrompt(false);
      return;
    }

    setLocationPermissionAsked(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationError(null);
        setShowLocationPrompt(false);
      },
      (error) => {
        console.log('[Hero] 위치 정보 가져오기 실패:', error.message);
        setLocationError('위치 정보를 가져올 수 없습니다.');
        // 실패 시 기본 위치 (서울)
        setUserLocation({ lat: 37.5665, lng: 126.9780 });
        setShowLocationPrompt(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000, // 5분간 캐시
      }
    );
  }, []);

  // 위치 권한 거부 (서울로 기본 설정)
  const denyLocationPermission = useCallback(() => {
    setUserLocation({ lat: 37.5665, lng: 126.9780 });
    setShowLocationPrompt(false);
    setLocationPermissionAsked(true);
  }, []);

  // 주소 검색 핸들러 (Kakao 주소 검색 API 사용)
  const handleLocationSearch = useCallback(() => {
    if (!locationSearchQuery.trim() || !isLoaded) return;

    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(locationSearchQuery, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        setShowLocationPrompt(false);
        setLocationSearchQuery('');
      } else {
        // 주소 검색 실패 시 키워드 검색 시도
        const places = new window.kakao.maps.services.Places();
        places.keywordSearch(locationSearchQuery, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const { y: lat, x: lng } = result[0];
            setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
            setShowLocationPrompt(false);
            setLocationSearchQuery('');
          }
        });
      }
    });
  }, [locationSearchQuery, isLoaded]);

  // 기본 위치 (서울) - userLocation이 없을 때 사용
  const defaultLocation = { lat: 37.5665, lng: 126.9780 };
  const mapCenter = userLocation || defaultLocation;

  // Initialize preview map (blurred, non-interactive)
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const center = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);

    const mapOption = {
      center: center,
      level: 8,
      draggable: false,
      scrollwheel: false,
      disableDoubleClickZoom: true,
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOption);
    mapInstanceRef.current = map;
    map.setZoomable(false);
  }, [isLoaded, mapCenter.lat, mapCenter.lng]);

  // 사용자 위치 변경 시 프리뷰 지도 중심 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    const newCenter = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    mapInstanceRef.current.setCenter(newCenter);
  }, [userLocation]);

  // 사용자 위치 변경 시 확장 지도 중심 업데이트
  useEffect(() => {
    if (!expandedMapInstanceRef.current || !userLocation || !isLoaded) return;

    const newCenter = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    expandedMapInstanceRef.current.setCenter(newCenter);
  }, [userLocation, isLoaded]);

  // Initialize expanded map (full interactive) - 드래그 시작하면 미리 초기화
  useEffect(() => {
    if (!isLoaded || !expandedMapContainerRef.current) return;
    if (expandedMapInstanceRef.current) {
      // 이미 생성된 경우 relayout만 호출
      setTimeout(() => {
        expandedMapInstanceRef.current?.relayout();
      }, 100);
      return;
    }

    const center = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);

    const mapOption = {
      center: center,
      level: 5,
      draggable: true,
      scrollwheel: true,
      disableDoubleClickZoom: false,
    };

    const map = new window.kakao.maps.Map(expandedMapContainerRef.current, mapOption);
    expandedMapInstanceRef.current = map;

    // 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    // 줌 레벨 변경 이벤트 리스너
    window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
      const level = map.getLevel();
      console.log('[Hero] 줌 레벨 변경:', level);
      setMapZoomLevel(level);
    });

    // 지도 준비 완료 표시
    console.log('[Hero] 확장 지도 초기화 완료');
    setExpandedMapReady(true);
  }, [isLoaded, dragOffset, mapCenter.lat, mapCenter.lng]);

  // 사용자 위치 기반 공고 데이터 가져오기
  useEffect(() => {
    if (!isLoaded || !userLocation) return;

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

    // 좌표를 주소로 변환 (역지오코딩)
    const geocoder = new window.kakao.maps.services.Geocoder();
    const coords = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

    geocoder.coord2RegionCode(coords.getLng(), coords.getLat(), (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        // 시/도 또는 시/군/구 이름 추출
        const region = result.find((r: any) => r.region_type === 'H') || result[0];
        const regionName = region.region_1depth_name; // 시/도 (서울특별시, 경기도 등)
        const subRegion = region.region_2depth_name; // 시/군/구 (강남구, 수원시 등)

        console.log('[Hero] 역지오코딩 결과:', regionName, subRegion);

        // 시/도 이름에서 접미사 제거하여 검색 키워드 생성
        // 예: "서울특별시" → "서울", "경기도" → "경기", "광주광역시" → "광주"
        const simplifiedRegion = regionName
          .replace(/특별시$/, '')
          .replace(/광역시$/, '')
          .replace(/특별자치시$/, '')
          .replace(/특별자치도$/, '')
          .replace(/도$/, '');

        console.log('[Hero] 검색 키워드:', simplifiedRegion);
        loadJobPostings(simplifiedRegion);
      } else {
        console.log('[Hero] 역지오코딩 실패, 기본 지역(서울)으로 검색');
        loadJobPostings('서울');
      }
    });
  }, [isLoaded, userLocation]);

  // 공고 마커 표시 (확장 지도에만, 줌 레벨 조건 충족 시)
  useEffect(() => {
    console.log('[Hero] 마커 표시 useEffect 실행:', {
      isLoaded,
      expandedMapReady,
      hasMapInstance: !!expandedMapInstanceRef.current,
      jobCount: jobPostings.length,
      mapZoomLevel,
      zoomCondition: mapZoomLevel <= MARKER_VISIBLE_ZOOM_LEVEL
    });

    // 확장 지도가 준비되고 공고 데이터가 있을 때만 마커 표시
    if (!isLoaded || !expandedMapReady || !expandedMapInstanceRef.current || jobPostings.length === 0) {
      console.log('[Hero] 마커 표시 조건 미충족');
      return;
    }

    // 줌 레벨이 충분히 확대되지 않으면 마커 숨기기
    if (mapZoomLevel > MARKER_VISIBLE_ZOOM_LEVEL) {
      console.log('[Hero] 줌 레벨 부족, 마커 숨김 (현재:', mapZoomLevel, ', 필요:', MARKER_VISIBLE_ZOOM_LEVEL, '이하)');
      // 기존 마커 제거
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
      return;
    }

    console.log('[Hero] 마커 표시 시작, 공고 수:', jobPostings.length);

    const map = expandedMapInstanceRef.current;
    const geocoder = new window.kakao.maps.services.Geocoder();
    const places = new window.kakao.maps.services.Places();

    // 기존 마커 제거
    mapMarkersRef.current.forEach(marker => marker.setMap(null));
    mapMarkersRef.current = [];

    // 각 공고의 위치를 좌표로 변환하여 마커 추가
    // API 호출 제한을 피하기 위해 순차적으로 처리
    let markerIndex = 0;
    const processNextMarker = () => {
      if (markerIndex >= jobPostings.length) return;

      const job = jobPostings[markerIndex];
      markerIndex++;

      if (!job.location && !job.organization) {
        processNextMarker();
        return;
      }

      // 학교명 + 지역으로 검색 (더 정확한 위치)
      const searchKeyword = job.organization || job.location;

      places.keywordSearch(searchKeyword, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
          createJobMarker(map, coords, job);
        } else {
          console.log('[Hero] 마커 위치 검색 실패:', searchKeyword);
        }
        // 다음 마커 처리 (50ms 딜레이로 API 제한 회피)
        setTimeout(processNextMarker, 50);
      });
    };

    processNextMarker();

    // 마커 생성 함수
    function createJobMarker(map: any, position: any, job: JobPostingCard) {
      console.log('[Hero] 마커 생성:', job.organization, job.location);

      // 커스텀 마커 이미지 (긴급 공고는 빨간색)
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

      // 인포윈도우 내용
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

      // 마커 클릭 시 인포윈도우 표시
      window.kakao.maps.event.addListener(marker, 'click', () => {
        infowindow.open(map, marker);
      });

      // 마커에 마우스오버 시 인포윈도우 표시
      window.kakao.maps.event.addListener(marker, 'mouseover', () => {
        infowindow.open(map, marker);
      });

      // 마커에서 마우스아웃 시 인포윈도우 닫기
      window.kakao.maps.event.addListener(marker, 'mouseout', () => {
        infowindow.close();
      });
    }

    // cleanup: 컴포넌트 언마운트 시 마커 제거
    return () => {
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
    };
  }, [isLoaded, expandedMapReady, jobPostings, mapZoomLevel]);

  // 드래그 핸들러
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(clientX);
    // 이미 확장되어 있으면 현재 확장 너비에서 시작
    if (!isMapExpanded) {
      setDragOffset(0);
    }
  }, [isMapExpanded]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // 일정 이상 확장되면 확장 상태 유지, 아니면 원래대로
    if (dragOffset > 150) {
      setIsMapExpanded(true);
      setDragOffset(maxExpandWidth); // 최대로 확장
    } else {
      setIsMapExpanded(false);
      setDragOffset(0);
    }
  }, [isDragging, dragOffset, maxExpandWidth]);

  // 지도 닫기 (>> 버튼 클릭 또는 오른쪽으로 드래그)
  const handleCloseMap = useCallback(() => {
    setIsMapExpanded(false);
    setDragOffset(0);
  }, []);

  // 자동 확장 임계값 (이 값 이상 드래그하면 자동으로 최대 확장)
  const AUTO_EXPAND_THRESHOLD = 300;

  // 전역 마우스/터치 이벤트 핸들러
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const offset = dragStartX - e.clientX;
      const clampedOffset = Math.max(0, Math.min(offset, maxExpandWidth));

      // 임계값 이상이면 자동으로 최대 확장
      if (clampedOffset >= AUTO_EXPAND_THRESHOLD && !isMapExpanded) {
        setIsMapExpanded(true);
        setDragOffset(maxExpandWidth);
        setIsDragging(false);
        return;
      }

      setDragOffset(clampedOffset);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      const offset = dragStartX - e.touches[0].clientX;
      const clampedOffset = Math.max(0, Math.min(offset, maxExpandWidth));

      // 임계값 이상이면 자동으로 최대 확장
      if (clampedOffset >= AUTO_EXPAND_THRESHOLD && !isMapExpanded) {
        setIsMapExpanded(true);
        setDragOffset(maxExpandWidth);
        setIsDragging(false);
        return;
      }

      setDragOffset(clampedOffset);
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStartX, maxExpandWidth, handleDragEnd, isMapExpanded]);

  const activeBanner = MOCK_BANNERS[activeIndex];
  const theme = THEMES[activeBanner.theme] || THEMES['neon-blue'];

  // 현재 지도 확장 너비 계산
  const currentExpandWidth = isMapExpanded ? maxExpandWidth : dragOffset;

  return (
    // Expanded width to max-w-7xl as requested
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[340px]">
        
        {/* LEFT: Main Banner Slider (Span 2) */}
        {/* Removed rounded-xl for sharp corners */}
        <div ref={bannerRef} className={`relative lg:col-span-2 overflow-hidden shadow-lg h-[300px] lg:h-full group w-full transition-all duration-300 ease-in-out ${!activeBanner.backgroundImage ? theme.wrapper : ''} ${isMapExpanded ? 'rounded-l-2xl' : ''}`}>

            {/* Background Image with blur effect */}
            {activeBanner.backgroundImage && (
              <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105 blur-[2px]"
                style={{ backgroundImage: `url(${activeBanner.backgroundImage})` }}
              />
            )}

            {/* Dark Overlay for text readability */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>

            {/* Animated Background Effects (optional, reduced opacity when image is present) */}
            <div className={`absolute inset-0 overflow-hidden ${activeBanner.backgroundImage ? 'opacity-30' : ''}`}>
                <div className={`absolute top-0 right-[-10%] w-[500px] h-[500px] rounded-full blur-[80px] opacity-50 mix-blend-screen animate-blob ${theme.orb1}`}></div>
                <div className={`absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[60px] opacity-40 mix-blend-screen animate-blob animation-delay-2000 ${theme.orb2}`}></div>
                <div className={`absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[50px] opacity-40 mix-blend-plus-lighter animate-blob animation-delay-4000 ${theme.orb3}`}></div>
            </div>
            
            {/* Content Layer */}
            <div className="absolute inset-0 flex items-center justify-between p-6 md:p-10 z-10">
                <div className="w-full md:w-5/6 font-sandoll">
                    {/* Key prop ensures re-render on slide change, restarting animations */}
                    <div key={`content-${activeIndex}`}>
                        {/* Title: Adjusted size (lg:text-[2.2rem]) and margins */}
                        <AnimatedText
                            text={activeBanner.title}
                            className="text-2xl md:text-3xl lg:text-[2.2rem] font-bold mb-3 text-white tracking-wide leading-snug lg:leading-relaxed [text-shadow:_0_2px_8px_rgba(0,0,0,0.7),_0_4px_16px_rgba(0,0,0,0.5)]"
                            baseDelay={500}
                            staggerDelay={40}
                        />

                        {/* Subtitle: Size reduced to text-sm md:text-base */}
                        <AnimatedText
                            text={activeBanner.subtitle}
                            className={`text-sm md:text-base font-medium mb-5 text-white/90 leading-relaxed tracking-wider [text-shadow:_0_1px_4px_rgba(0,0,0,0.6),_0_2px_8px_rgba(0,0,0,0.4)]`}
                            baseDelay={1500}
                            staggerDelay={20}
                        />
                    </div>
                </div>
            </div>

            {/* Paginator */}
            <div className="absolute bottom-6 left-8 md:left-12 flex gap-2 z-20">
                {MOCK_BANNERS.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                    />
                ))}
            </div>
        </div>

        {/* RIGHT: Map Widget (Span 1) - Expandable */}
        <div
          className="hidden lg:block relative overflow-visible"
          style={{ zIndex: currentExpandWidth > 0 ? 40 : 1 }}
        >
          {/* 확장되는 지도 패널 - 오른쪽 고정, 왼쪽으로만 확장 */}
          <div
            className="absolute top-0 right-0 h-full overflow-hidden border border-gray-200 bg-white shadow-xl rounded-l-2xl transition-[width] duration-100 ease-out"
            style={{
              width: `calc(100% + ${currentExpandWidth}px)`,
            }}
          >
            {/* 프리뷰 지도 (흐린 배경) - 확장 안됐을 때만 보임 */}
            <div
              ref={mapContainerRef}
              className="absolute inset-0 w-full h-full z-0 blur-[2px] opacity-60"
              style={{
                opacity: currentExpandWidth > 100 ? 0 : 0.6,
                transition: 'opacity 0.3s',
              }}
            />

            {/* 실제 인터랙티브 지도 - 확장됐을 때 보임 */}
            <div
              ref={expandedMapContainerRef}
              className="absolute inset-0 w-full h-full z-0"
              style={{
                opacity: currentExpandWidth > 100 ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />

            {/* 드래그 핸들 (<<) */}
            <div
              className="absolute left-0 top-0 bottom-0 z-30 bg-white/95 hover:bg-white px-2 flex items-center justify-center shadow-lg border-r border-gray-200 cursor-grab active:cursor-grabbing select-none"
              style={{
                animation: !isDragging && currentExpandWidth === 0 ? 'bounceLeft 1.2s ease-in-out infinite' : 'none'
              }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
                <span className="text-[#5B6EF7] font-black text-xl tracking-tighter select-none">
                  {currentExpandWidth > 100 ? '>>' : '<<'}
                </span>
            </div>

            {/* 오른쪽 필터 사이드바 (드래그 시작하면 나타남) */}
            <div
              className="absolute top-0 right-0 h-full w-[200px] bg-white/95 backdrop-blur-sm z-40 border-l border-gray-200 shadow-lg overflow-y-auto"
              style={{
                opacity: currentExpandWidth > 100 ? 1 : 0,
                transform: currentExpandWidth > 100 ? 'translateX(0)' : 'translateX(100%)',
                transition: 'opacity 0.3s, transform 0.3s',
                pointerEvents: currentExpandWidth > 100 ? 'auto' : 'none',
              }}
            >
              {/* 필터 헤더 */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-4 py-3 border-b border-gray-200 flex items-center justify-between z-10">
                <h4 className="font-bold text-gray-800 text-sm">필터</h4>
                <button
                  onClick={handleCloseMap}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 위치 권한 요청 배너 */}
              {showLocationPrompt && (
                <div className="mx-3 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-full flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-800 mb-1">
                        내 위치 기반 검색
                      </p>
                      <p className="text-[10px] text-blue-600 mb-2 leading-relaxed">
                        현재 위치를 사용하여 주변 공고를 찾아드릴까요?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={requestUserLocation}
                          disabled={locationPermissionAsked && !userLocation}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[10px] font-medium rounded transition-colors"
                        >
                          {locationPermissionAsked && !userLocation ? '요청 중...' : '허용'}
                        </button>
                        <button
                          onClick={denyLocationPermission}
                          className="px-2.5 py-1 bg-white hover:bg-gray-50 text-gray-600 text-[10px] font-medium rounded border border-gray-200 transition-colors"
                        >
                          괜찮아요
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 현재 위치 표시 (위치 허용된 경우) */}
              {userLocation && !showLocationPrompt && (
                <div className="mx-3 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[10px] text-green-700">내 위치 기반으로 검색 중</span>
                </div>
              )}

              {/* 필터 내용 */}
              <div className="p-3 space-y-4">
                {/* 지역 필터 */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    지역
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {LOCATIONS.slice(0, 8).map(region => (
                      <button
                        key={region}
                        onClick={() => handleRegionSelect(region)}
                        className={`px-2 py-1 text-xs rounded-full border transition-all ${
                          mapFilters.regions.includes(region)
                            ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7] hover:text-[#5B6EF7]'
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
                      placeholder="주소 검색 (예: 강남구)"
                      value={locationSearchQuery}
                      onChange={(e) => setLocationSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleLocationSearch();
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B6EF7] focus:ring-1 focus:ring-[#5B6EF7]/20 placeholder:text-gray-400"
                    />
                    <button
                      onClick={handleLocationSearch}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 학교급 필터 */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    학교급
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {SCHOOL_LEVELS.map(level => (
                      <button
                        key={level}
                        onClick={() => toggleMapFilter('schoolLevels', level)}
                        className={`px-2 py-1 text-xs rounded-full border transition-all ${
                          mapFilters.schoolLevels.includes(level)
                            ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7] hover:text-[#5B6EF7]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 유형 필터 */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    유형
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {MAP_FILTER_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleMapFilter('types', type)}
                        className={`px-2 py-1 text-xs rounded-full border transition-all ${
                          mapFilters.types.includes(type)
                            ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7] hover:text-[#5B6EF7]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 고용형태 필터 */}
                <div>
                  <h5 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    고용형태
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {MAP_FILTER_EMPLOYMENT.map(emp => (
                      <button
                        key={emp}
                        onClick={() => toggleMapFilter('employment', emp)}
                        className={`px-2 py-1 text-xs rounded-full border transition-all ${
                          mapFilters.employment.includes(emp)
                            ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7] hover:text-[#5B6EF7]'
                        }`}
                      >
                        {emp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 적용 버튼 */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm px-3 py-2 border-t border-gray-200">
                <button className="w-full py-2 bg-[#5B6EF7] hover:bg-[#4a5de6] text-white text-sm font-medium rounded-lg transition-colors">
                  적용하기
                </button>
              </div>
            </div>

            {/* White overlay (확장 안됐을 때만) */}
            <div
              className="absolute inset-0 bg-white/40 pointer-events-none z-10"
              style={{
                opacity: currentExpandWidth > 100 ? 0 : 1,
                transition: 'opacity 0.3s',
              }}
            />

            {/* Content area - 확장 안됐을 때만 보임 */}
            <div
              className="absolute inset-0 pl-7 flex flex-col items-center justify-center text-center p-6 z-20 pointer-events-none"
              style={{
                opacity: currentExpandWidth > 50 ? 0 : 1,
                transition: 'opacity 0.2s',
              }}
            >
                 <div className="relative mb-3">
                     <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
                     <div className="relative bg-white p-3 rounded-full shadow-lg border border-blue-100">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                     </div>
                 </div>

                 <h3 className="text-xl font-bold text-gray-900 mb-2">내 주변 공고 지도</h3>
                 <p className="text-base text-gray-600 word-keep">
                     집 근처 학교를 지도에서<br/>한눈에 확인해보세요!
                 </p>

                 <p className="text-xs text-gray-400 mt-3">
                   ← 왼쪽으로 드래그하여 지도 열기
                 </p>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes bounceLeft {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(-3px); }
          }
        `}</style>

      </div>
    </section>
  );
};