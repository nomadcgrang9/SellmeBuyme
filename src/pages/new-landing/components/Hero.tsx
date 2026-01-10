import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MOCK_BANNERS, SCHOOL_LEVELS } from '../constants';
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

  // 지도 필터 옵션 (드롭다운과 동일)
  const MAP_FILTER_JOB_TYPES = ['기간제', '교사', '시간강사', '강사', '기타'] as const;
  const MAP_FILTER_SUBJECTS = ['국어', '영어', '수학', '사회', '과학', '체육', '음악', '미술', '정보', '보건', '사서', '상담'] as const;

  // 지도 필터 상태
  const [mapFilters, setMapFilters] = useState<{
    schoolLevels: string[];
    jobTypes: string[];
    subjects: string[];
  }>({
    schoolLevels: [],
    jobTypes: [],
    subjects: [],
  });

  // 필터 토글 핸들러
  const toggleMapFilter = (category: 'schoolLevels' | 'jobTypes' | 'subjects', value: string) => {
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
  const [activeLocationFilter, setActiveLocationFilter] = useState<string | null>(null); // 활성화된 지역 필터

  // 공고 데이터 상태
  const [jobPostings, setJobPostings] = useState<JobPostingCard[]>([]);
  const mapMarkersRef = useRef<any[]>([]);
  const coordsCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // 필터가 적용된 공고 데이터 (queries.ts 로직과 동일)
  const filteredJobPostings = useMemo(() => {
    let filtered = jobPostings;

    // 학교급 필터 (organization 필드에서 추론 - queries.ts와 동일한 로직)
    if (mapFilters.schoolLevels.length > 0) {
      filtered = filtered.filter(job => {
        const org = (job.organization || '').toLowerCase();
        const title = (job.title || '').toLowerCase();

        return mapFilters.schoolLevels.some(level => {
          if (level === '유치원') {
            return org.includes('유치원') || title.includes('유치원');
          }
          if (level === '초등학교') {
            return org.includes('초등') || title.includes('초등');
          }
          if (level === '중학교') {
            return org.includes('중학') || org.includes('중등') ||
                   title.includes('중학') || title.includes('중등');
          }
          if (level === '고등학교') {
            return org.includes('고등') || org.includes('고교') ||
                   title.includes('고등') || title.includes('고교');
          }
          if (level === '특수학교') {
            return org.includes('특수') || title.includes('특수');
          }
          if (level === '기타') {
            // 유/초/중/고/특수 어디에도 해당하지 않는 경우
            const isNotSchool =
              !org.includes('유치원') && !org.includes('초등') &&
              !org.includes('중학') && !org.includes('중등') &&
              !org.includes('고등') && !org.includes('고교') &&
              !org.includes('특수');
            return isNotSchool;
          }
          return false;
        });
      });
    }

    // 유형 필터 (title + tags 검색)
    if (mapFilters.jobTypes.length > 0) {
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const tags = job.tags || [];
        const tagsLower = tags.map(t => t.toLowerCase());

        return mapFilters.jobTypes.some(type => {
          if (type === '기간제') {
            return title.includes('기간제') || tagsLower.some(t => t.includes('기간제'));
          }
          if (type === '교사') {
            // 교사는 기간제교사, 시간강사 포함
            return title.includes('교사') || title.includes('기간제') || title.includes('시간강사') ||
                   tagsLower.some(t => t.includes('교사') || t.includes('기간제'));
          }
          if (type === '시간강사') {
            return title.includes('시간강사') || title.includes('시간제 강사') ||
                   tagsLower.some(t => t.includes('시간강사'));
          }
          if (type === '강사') {
            return title.includes('강사') || tagsLower.some(t => t.includes('강사'));
          }
          if (type === '기타') {
            // 기간제, 교사, 강사가 아닌 경우
            const isNotTeacher =
              !title.includes('기간제') && !title.includes('교사') && !title.includes('강사');
            return isNotTeacher;
          }
          return false;
        });
      });
    }

    // 과목 필터 (title + tags 검색)
    if (mapFilters.subjects.length > 0) {
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const tags = job.tags || [];
        const tagsLower = tags.map(t => t.toLowerCase());

        return mapFilters.subjects.some(subject => {
          const subLower = subject.toLowerCase();
          return title.includes(subLower) || tagsLower.some(t => t.includes(subLower));
        });
      });
    }

    return filtered;
  }, [jobPostings, mapFilters]);


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

    const searchQuery = locationSearchQuery.trim();
    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(searchQuery, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        setActiveLocationFilter(searchQuery); // 검색어 저장
        setLocationSearchQuery('');
      } else {
        const places = new window.kakao.maps.services.Places();
        places.keywordSearch(searchQuery, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const { y: lat, x: lng } = result[0];
            setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
            setActiveLocationFilter(searchQuery); // 검색어 저장
            setLocationSearchQuery('');
          }
        });
      }
    });
  }, [locationSearchQuery, isLoaded]);

  // 지역 필터 취소 핸들러
  const clearLocationFilter = useCallback(() => {
    setActiveLocationFilter(null);
    // 기본 위치(서울)로 돌아가기
    setUserLocation(null);
    loadJobPostings('서울');
    if (mapInstanceRef.current) {
      const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.9780);
      mapInstanceRef.current.setCenter(defaultCenter);
    }
  }, []);

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

    // 지도 이동 완료 시 해당 위치 공고 로드
    window.kakao.maps.event.addListener(map, 'dragend', () => {
      const center = map.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();

      // 역지오코딩으로 지역명 추출
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          // 시/도 단위 추출 (예: 서울특별시 → 서울)
          const region = result[0];
          const regionName = (region.region_1depth_name || '')
            .replace(/특별시$/, '')
            .replace(/광역시$/, '')
            .replace(/특별자치시$/, '')
            .replace(/특별자치도$/, '')
            .replace(/도$/, '');

          console.log('[Hero] 🗺️ 지도 이동 감지, 새 지역:', regionName);
          loadJobPostings(regionName);
        }
      });
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

  // 공고 마커 표시 (필터 적용, 캐싱 + 순차 처리)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // 기존 마커 정리
    mapMarkersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    mapMarkersRef.current = [];

    // 필터된 공고가 없으면 종료
    if (filteredJobPostings.length === 0) {
      return;
    }

    const map = mapInstanceRef.current;
    const places = new window.kakao.maps.services.Places();
    const cache = coordsCacheRef.current;
    let cancelled = false;
    let currentInfowindow: any = null;

    // 마커 생성 함수
    const createMarker = (coords: { lat: number; lng: number }, job: JobPostingCard) => {
      if (cancelled) return;

      const position = new window.kakao.maps.LatLng(coords.lat, coords.lng);

      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map,
      });

      mapMarkersRef.current.push(marker);

      const infoContent = `
        <div style="padding:8px 12px;min-width:180px;max-width:250px;font-family:sans-serif;">
          <div style="font-size:11px;color:#666;margin-bottom:4px;">${job.organization || ''}</div>
          <div style="font-size:13px;font-weight:600;color:#333;line-height:1.3;margin-bottom:6px;">${(job.title || '').slice(0, 30)}${(job.title || '').length > 30 ? '...' : ''}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            ${job.daysLeft !== undefined ? `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${job.daysLeft <= 3 ? '#FEE2E2' : '#E0E7FF'};color:${job.daysLeft <= 3 ? '#DC2626' : '#4F46E5'};">D-${job.daysLeft}</span>` : ''}
          </div>
        </div>
      `;

      const infowindow = new window.kakao.maps.InfoWindow({
        content: infoContent,
        removable: true,
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (currentInfowindow) currentInfowindow.close();
        infowindow.open(map, marker);
        currentInfowindow = infowindow;
      });
    };

    // 순차 처리 (API 부하 방지)
    let index = 0;
    const processNext = () => {
      if (cancelled || index >= filteredJobPostings.length) return;

      const job = filteredJobPostings[index];
      index++;

      const keyword = job.organization || job.location;
      if (!keyword) {
        setTimeout(processNext, 30);
        return;
      }

      // 캐시 확인
      if (cache.has(keyword)) {
        createMarker(cache.get(keyword)!, job);
        setTimeout(processNext, 30);
        return;
      }

      // API 검색
      places.keywordSearch(keyword, (result: any[], status: string) => {
        if (cancelled) return;

        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const coords = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
          cache.set(keyword, coords);
          createMarker(coords, job);
        }
        setTimeout(processNext, 30);
      });
    };

    processNext();

    return () => {
      cancelled = true;
      if (currentInfowindow) currentInfowindow.close();
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
    };
  }, [isLoaded, filteredJobPostings]);

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
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800 text-sm">지도 필터</h4>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {filteredJobPostings.length}개
                </span>
              </div>
            </div>

            {/* 필터 내용 */}
            <div className="p-3 space-y-3">
              {/* 주소 검색 */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-1.5">주소 검색</h5>
                <div className="relative">
                  {activeLocationFilter ? (
                    // 활성 필터가 있을 때 버튼 형태로 표시
                    <div className="w-full px-2 py-1.5 text-xs border border-[#5B6EF7] bg-[#5B6EF7]/10 rounded-lg flex items-center justify-between">
                      <span className="text-[#5B6EF7] font-medium truncate">{activeLocationFilter}</span>
                      <button
                        onClick={clearLocationFilter}
                        className="ml-1 p-0.5 text-[#5B6EF7] hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label="검색 취소"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    // 검색 입력 필드
                    <>
                      <input
                        type="text"
                        placeholder="지역, 학교명 검색"
                        value={locationSearchQuery}
                        onChange={(e) => setLocationSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLocationSearch();
                          }
                        }}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B6EF7]"
                      />
                      <button
                        onClick={handleLocationSearch}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#5B6EF7]"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </>
                  )}
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
                  {MAP_FILTER_JOB_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleMapFilter('jobTypes', type)}
                      className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                        mapFilters.jobTypes.includes(type)
                          ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* 과목 필터 */}
              <div>
                <h5 className="text-xs font-semibold text-gray-500 mb-1.5">과목</h5>
                <div className="flex flex-wrap gap-1">
                  {MAP_FILTER_SUBJECTS.map(subject => (
                    <button
                      key={subject}
                      onClick={() => toggleMapFilter('subjects', subject)}
                      className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                        mapFilters.subjects.includes(subject)
                          ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
