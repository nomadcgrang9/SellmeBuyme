import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { fetchJobsByBoardRegion } from '@/lib/supabase/queries';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';
import { getSchoolLevelFromJob, SCHOOL_LEVEL_MARKER_COLORS } from '@/lib/constants/markerColors';
import type { JobPostingCard } from '@/types';
import MobileBottomSheet from './components/MobileBottomSheet';
import MobileSearchBar from './components/MobileSearchBar';
import MobileJobCard from './components/MobileJobCard';
import MobileJobDetail from './components/MobileJobDetail';
import MobileFilterSheet from './components/MobileFilterSheet';

const SCHOOL_LEVELS = ['유치원', '초등학교', '중학교', '고등학교', '특수학교', '기타'] as const;
const MAP_FILTER_SUBJECTS = ['국어', '영어', '수학', '사회', '과학', '체육', '음악', '미술', '정보', '보건', '사서', '상담'] as const;

const MobileMapPage: React.FC = () => {
  // 지도 관련 상태
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();

  // 사용자 위치 (useGeolocation 훅 사용)
  const { coords: geoCoords, address: geoAddress, loading: geoLoading } = useGeolocation();

  // 위치 상태 (수동 위치 버튼용)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // 초기 로딩 플래그
  const isInitialLoadRef = useRef(true);
  const initialRegionLoadedRef = useRef(false);

  // 공고 데이터
  const [jobPostings, setJobPostings] = useState<JobPostingCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mapMarkersRef = useRef<any[]>([]);
  const coordsCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // UI 상태
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState<'collapsed' | 'half' | 'full'>('collapsed');

  // 길찾기 상태
  const [directionsMode, setDirectionsMode] = useState(false);
  const [directionsJob, setDirectionsJob] = useState<JobPostingCard | null>(null);
  const [directionsInfo, setDirectionsInfo] = useState<{ distance: string; duration: string } | null>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);

  // 필터 상태
  const [filters, setFilters] = useState<{
    schoolLevels: string[];
    subjects: string[];
    searchQuery: string;
  }>({
    schoolLevels: [],
    subjects: [],
    searchQuery: '',
  });

  // 중복 제거 함수
  const deduplicateJobs = useCallback((jobs: JobPostingCard[]): JobPostingCard[] => {
    const seen = new Map<string, JobPostingCard>();
    for (const job of jobs) {
      const key = `${job.organization}|${job.title}`;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, job);
      } else if (job.daysLeft !== undefined && existing.daysLeft !== undefined && job.daysLeft < existing.daysLeft) {
        seen.set(key, job);
      }
    }
    return Array.from(seen.values());
  }, []);

  // 필터가 적용된 공고 데이터
  const filteredJobPostings = useMemo(() => {
    let filtered = deduplicateJobs(jobPostings);

    // 학교급 필터
    if (filters.schoolLevels.length > 0) {
      filtered = filtered.filter(job => {
        const schoolLevel = (job.school_level || '').toLowerCase();
        const org = (job.organization || '').toLowerCase();

        return filters.schoolLevels.some(level => {
          const keywords: Record<string, string[]> = {
            '유치원': ['유치원'],
            '초등학교': ['초등'],
            '중학교': ['중학', '중등'],
            '고등학교': ['고등', '고교'],
            '특수학교': ['특수'],
          };
          const levelKeywords = keywords[level] || [];
          return levelKeywords.some(kw => schoolLevel.includes(kw) || org.includes(kw));
        });
      });
    }

    // 과목 필터
    if (filters.subjects.length > 0) {
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const tags = job.tags || [];
        return filters.subjects.some(subject =>
          title.includes(subject.toLowerCase()) ||
          tags.some(t => t.toLowerCase() === subject.toLowerCase())
        );
      });
    }

    // 검색어 필터
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        (job.title || '').toLowerCase().includes(query) ||
        (job.organization || '').toLowerCase().includes(query) ||
        (job.location || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [jobPostings, filters, deduplicateJobs]);

  // SDK 로드
  useEffect(() => {
    loadKakaoMaps();
  }, [loadKakaoMaps]);

  // 지역 기반 공고 로드 함수
  const loadJobPostings = useCallback(async (regionName: string) => {
    console.log('[MobileMap] 지역 기반 공고 로드:', regionName);
    try {
      setIsLoading(true);
      const jobs = await fetchJobsByBoardRegion(regionName, 300);
      console.log('[MobileMap] 로드된 공고 수:', jobs.length);
      setJobPostings(jobs);
    } catch (error) {
      console.error('[MobileMap] 공고 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapInstanceRef.current) return;
    // geoLoading 중이면 위치 확정될 때까지 대기 (최초 로딩 시에만)
    if (isInitialLoadRef.current && geoLoading) return;

    const defaultCenter = { lat: 37.5665, lng: 126.9780 }; // 서울

    // 우선순위: 수동 설정 위치 > useGeolocation 위치 > 기본값(서울)
    const initialLat = userLocation?.lat ?? geoCoords?.latitude ?? defaultCenter.lat;
    const initialLng = userLocation?.lng ?? geoCoords?.longitude ?? defaultCenter.lng;

    console.log('[MobileMap] 지도 초기화 위치:', { lat: initialLat, lng: initialLng, source: userLocation ? 'manual' : geoCoords ? 'geolocation' : 'default' });

    const center = new window.kakao.maps.LatLng(initialLat, initialLng);

    const map = new window.kakao.maps.Map(mapContainerRef.current, {
      center,
      level: 6,
    });

    mapInstanceRef.current = map;
    isInitialLoadRef.current = false;

    // 지도 드래그 완료 시 해당 지역 공고 로드
    window.kakao.maps.event.addListener(map, 'dragend', () => {
      const mapCenter = map.getCenter();
      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.coord2RegionCode(
        mapCenter.getLng(),
        mapCenter.getLat(),
        (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const region = result[0];
            const regionName = (region.region_1depth_name || '')
              .replace(/특별시$|광역시$|특별자치시$|특별자치도$|도$/, '');
            if (regionName) {
              loadJobPostings(regionName);
            }
          }
        }
      );
    });

    // 초기 공고 로드 - useGeolocation 주소 또는 현재 중심 좌표 기반
    if (geoAddress?.city) {
      // useGeolocation에서 얻은 지역명 사용
      const regionName = geoAddress.city
        .replace(/특별시$|광역시$|특별자치시$|특별자치도$|도$/, '');
      console.log('[MobileMap] 초기 로드 - 사용자 위치 지역:', regionName);
      loadJobPostings(regionName);
      initialRegionLoadedRef.current = true;
    } else {
      // 지역명을 알 수 없으면 좌표로 역지오코딩
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(
        initialLng,
        initialLat,
        (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const region = result[0];
            const regionName = (region.region_1depth_name || '')
              .replace(/특별시$|광역시$|특별자치시$|특별자치도$|도$/, '') || '서울';
            console.log('[MobileMap] 초기 로드 - 역지오코딩 지역:', regionName);
            loadJobPostings(regionName);
          } else {
            // 역지오코딩 실패 시 서울로 기본 로드
            console.log('[MobileMap] 초기 로드 - 기본 서울');
            loadJobPostings('서울');
          }
          initialRegionLoadedRef.current = true;
        }
      );
    }
  }, [isLoaded, userLocation, geoCoords, geoAddress, geoLoading, loadJobPostings]);

  // 마커 표시
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // 기존 마커 제거
    mapMarkersRef.current.forEach(marker => marker.setMap(null));
    mapMarkersRef.current = [];

    if (filteredJobPostings.length === 0) return;

    const map = mapInstanceRef.current;
    const places = new window.kakao.maps.services.Places();
    const cache = coordsCacheRef.current;
    let cancelled = false;

    const createMarker = (coords: { lat: number; lng: number }, job: JobPostingCard) => {
      if (cancelled) return;

      const position = new window.kakao.maps.LatLng(coords.lat, coords.lng);

      // 학교급별 색상 적용
      const schoolLevel = getSchoolLevelFromJob(job);
      const schoolColors = SCHOOL_LEVEL_MARKER_COLORS[schoolLevel];
      const isUrgent = job.daysLeft !== undefined && job.daysLeft <= 3;

      // 마커 크기 (긴급일 경우 살짝 크게)
      const size = isUrgent ? 32 : 28;
      const markerSize = new window.kakao.maps.Size(size, size);
      const center = size / 2;
      const radius = (size / 2) - 2;

      // 긴급 마커: 빨간 테두리 + 학교급 색상
      // 일반 마커: 학교급 색상
      const strokeColor = isUrgent ? '#EF4444' : 'white';
      const strokeWidth = isUrgent ? 3 : 2;

      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${center}" cy="${center}" r="${radius}" fill="${schoolColors.fill}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
            <text x="${center}" y="${center + 4}" text-anchor="middle" fill="white" font-size="${isUrgent ? 11 : 10}" font-weight="bold">
              ${job.daysLeft !== undefined ? `D-${job.daysLeft}` : schoolLevel.charAt(0)}
            </text>
          </svg>
        `)}`,
        markerSize
      );

      const marker = new window.kakao.maps.Marker({
        position,
        map,
        image: markerImage,
      });

      // 마커 클릭 시 미니 카드 표시
      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedJob(job);
        setBottomSheetHeight('collapsed');

        // 지도 중심 이동 (하단 시트 고려)
        const adjustedLat = coords.lat - 0.002;
        map.panTo(new window.kakao.maps.LatLng(adjustedLat, coords.lng));
      });

      mapMarkersRef.current.push(marker);
    };

    // 마커 생성 (DB 좌표 우선, 없으면 Places API 순차 호출)
    let index = 0;
    const processNext = () => {
      if (cancelled || index >= filteredJobPostings.length) return;

      const job = filteredJobPostings[index++];

      // 1. DB에 저장된 좌표가 있으면 즉시 마커 생성 (최우선)
      if (job.latitude && job.longitude) {
        const coords = { lat: Number(job.latitude), lng: Number(job.longitude) };
        createMarker(coords, job);
        // DB 좌표가 있는 경우 빠르게 다음 처리
        setTimeout(processNext, 5);
        return;
      }

      // 2. DB 좌표 없으면 Places API로 검색
      const keyword = job.organization || job.location;

      if (!keyword) {
        setTimeout(processNext, 20);
        return;
      }

      // 캐시에 있으면 캐시 사용
      if (cache.has(keyword)) {
        createMarker(cache.get(keyword)!, job);
        setTimeout(processNext, 20);
        return;
      }

      // Places API 호출 (API 부하 분산을 위해 순차 처리)
      places.keywordSearch(keyword, (result: any[], status: string) => {
        if (!cancelled && status === window.kakao.maps.services.Status.OK && result.length > 0) {
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
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
    };
  }, [isLoaded, filteredJobPostings]);

  // 현재 위치 가져오기
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setUserLocation({ lat, lng });

        if (mapInstanceRef.current) {
          const newCenter = new window.kakao.maps.LatLng(lat, lng);
          mapInstanceRef.current.setCenter(newCenter);
          mapInstanceRef.current.setLevel(5);
        }
        setIsLocating(false);
      },
      (error) => {
        console.error('위치 가져오기 실패:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // 검색 처리 - 키워드로 위치 검색 후 지도 이동 및 해당 지역 공고 로드
  const handleSearch = useCallback(async (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));

    if (!query.trim() || !isLoaded) return;

    const places = new window.kakao.maps.services.Places();
    const geocoder = new window.kakao.maps.services.Geocoder();

    // 키워드 검색 (학교명, 지역명 등)
    places.keywordSearch(query, async (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // 지도 이동
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(
            new window.kakao.maps.LatLng(latNum, lngNum)
          );
          mapInstanceRef.current.setLevel(5);
        }

        // 해당 좌표의 지역명 가져와서 공고 로드
        geocoder.coord2RegionCode(lngNum, latNum, (regionResult: any[], regionStatus: string) => {
          if (regionStatus === window.kakao.maps.services.Status.OK && regionResult.length > 0) {
            const region = regionResult[0];
            const regionName = (region.region_1depth_name || '')
              .replace(/특별시$|광역시$|특별자치시$|특별자치도$|도$/, '');
            console.log('[MobileMap] 검색 위치 지역:', regionName);
            if (regionName) {
              loadJobPostings(regionName);
            }
          }
        });
      } else {
        // 키워드 검색 실패 시 주소 검색 시도
        geocoder.addressSearch(query, (addrResult: any[], addrStatus: string) => {
          if (addrStatus === window.kakao.maps.services.Status.OK && addrResult.length > 0) {
            const { y: lat, x: lng } = addrResult[0];
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);

            if (mapInstanceRef.current) {
              mapInstanceRef.current.setCenter(
                new window.kakao.maps.LatLng(latNum, lngNum)
              );
              mapInstanceRef.current.setLevel(5);
            }

            // 해당 좌표의 지역명 가져와서 공고 로드
            geocoder.coord2RegionCode(lngNum, latNum, (regionResult: any[], regionStatus: string) => {
              if (regionStatus === window.kakao.maps.services.Status.OK && regionResult.length > 0) {
                const region = regionResult[0];
                const regionName = (region.region_1depth_name || '')
                  .replace(/특별시$|광역시$|특별자치시$|특별자치도$|도$/, '');
                if (regionName) {
                  loadJobPostings(regionName);
                }
              }
            });
          }
        });
      }
    });
  }, [isLoaded, loadJobPostings]);

  // 필터 적용
  const handleApplyFilter = useCallback((newFilters: { schoolLevels: string[]; subjects: string[] }) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setShowFilter(false);
  }, []);

  // 상세보기 열기
  const handleOpenDetail = useCallback((job: JobPostingCard) => {
    setSelectedJob(job);
    setShowDetail(true);
  }, []);

  // 길찾기 경로 정리
  const clearDirections = useCallback(() => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
      endMarkerRef.current = null;
    }
    setDirectionsMode(false);
    setDirectionsJob(null);
    setDirectionsInfo(null);
  }, []);

  // 길찾기 핸들러 - 현재위치 → 목적지 경로 표시
  const handleDirections = useCallback((job: JobPostingCard) => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // 기존 경로 정리
    clearDirections();

    // 현재 위치 가져오기
    if (!navigator.geolocation) {
      alert('위치 정보를 사용할 수 없습니다.');
      return;
    }

    setDirectionsMode(true);
    setDirectionsJob(job);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const startLat = position.coords.latitude;
        const startLng = position.coords.longitude;

        // 목적지 좌표 찾기
        const keyword = job.organization || job.location;
        if (!keyword) return;

        const places = new window.kakao.maps.services.Places();
        places.keywordSearch(keyword, (result: any[], status: string) => {
          if (status !== window.kakao.maps.services.Status.OK || result.length === 0) {
            alert('목적지를 찾을 수 없습니다.');
            clearDirections();
            return;
          }

          const endLat = parseFloat(result[0].y);
          const endLng = parseFloat(result[0].x);
          const map = mapInstanceRef.current;

          // 출발지 마커
          const startPosition = new window.kakao.maps.LatLng(startLat, startLng);
          const startMarkerImage = new window.kakao.maps.MarkerImage(
            `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="#22C55E" stroke="white" stroke-width="2"/>
                <text x="16" y="21" text-anchor="middle" fill="white" font-size="12" font-weight="bold">출발</text>
              </svg>
            `)}`,
            new window.kakao.maps.Size(32, 32)
          );
          startMarkerRef.current = new window.kakao.maps.Marker({
            position: startPosition,
            map,
            image: startMarkerImage,
          });

          // 도착지 마커
          const endPosition = new window.kakao.maps.LatLng(endLat, endLng);
          const endMarkerImage = new window.kakao.maps.MarkerImage(
            `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="#EF4444" stroke="white" stroke-width="2"/>
                <text x="16" y="21" text-anchor="middle" fill="white" font-size="12" font-weight="bold">도착</text>
              </svg>
            `)}`,
            new window.kakao.maps.Size(32, 32)
          );
          endMarkerRef.current = new window.kakao.maps.Marker({
            position: endPosition,
            map,
            image: endMarkerImage,
          });

          // 직선 경로 그리기 (카카오 API는 도보/차량 경로 API가 유료이므로 직선으로 대체)
          const linePath = [startPosition, endPosition];
          polylineRef.current = new window.kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 5,
            strokeColor: '#3B82F6',
            strokeOpacity: 0.8,
            strokeStyle: 'solid',
          });
          polylineRef.current.setMap(map);

          // 거리 계산 (직선 거리)
          const polyline = new window.kakao.maps.Polyline({ path: linePath });
          const distance = polyline.getLength(); // 미터 단위
          const distanceText = distance >= 1000
            ? `${(distance / 1000).toFixed(1)}km`
            : `${Math.round(distance)}m`;

          // 예상 시간 (도보 기준 시속 4km)
          const walkingMinutes = Math.round(distance / 67); // 67m/분
          const durationText = walkingMinutes >= 60
            ? `${Math.floor(walkingMinutes / 60)}시간 ${walkingMinutes % 60}분`
            : `${walkingMinutes}분`;

          setDirectionsInfo({ distance: distanceText, duration: durationText });

          // 지도 범위 조정
          const bounds = new window.kakao.maps.LatLngBounds();
          bounds.extend(startPosition);
          bounds.extend(endPosition);
          map.setBounds(bounds, 80, 80, 80, 80);
        });
      },
      (error) => {
        console.error('위치 가져오기 실패:', error);
        alert('현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        clearDirections();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isLoaded, clearDirections]);

  // 활성 필터 개수
  const activeFilterCount = filters.schoolLevels.length + filters.subjects.length;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* 전체화면 지도 */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* 상단 검색바 (플로팅) */}
      <div className="absolute top-0 left-0 right-0 z-20 safe-area-inset-top">
        <MobileSearchBar
          value={filters.searchQuery}
          onSearch={handleSearch}
          onFilterClick={() => setShowFilter(true)}
          filterCount={activeFilterCount}
        />
      </div>

      {/* 현위치 버튼 */}
      <button
        onClick={handleGetLocation}
        disabled={isLocating}
        className="absolute right-4 z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:bg-gray-100 disabled:opacity-50"
        style={{ bottom: bottomSheetHeight === 'collapsed' ? '140px' : bottomSheetHeight === 'half' ? '55%' : '85%' }}
      >
        {isLocating ? (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>

      {/* 선택된 공고 미니 카드 (마커 클릭 시) */}
      {selectedJob && !showDetail && bottomSheetHeight === 'collapsed' && (
        <div
          className="absolute left-4 right-4 z-10 bg-white rounded-2xl shadow-xl p-4 animate-slide-up"
          style={{ bottom: '100px' }}
        >
          <button
            onClick={() => setSelectedJob(null)}
            className="absolute top-2 right-2 p-1 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div onClick={() => handleOpenDetail(selectedJob)} className="cursor-pointer">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">{selectedJob.organization}</span>
              {selectedJob.daysLeft !== undefined && selectedJob.daysLeft <= 3 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                  D-{selectedJob.daysLeft}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{selectedJob.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <span className="truncate">{selectedJob.location || '위치 정보 없음'}</span>
            </div>
          </div>

          <button
            onClick={() => handleOpenDetail(selectedJob)}
            className="w-full mt-3 py-2.5 bg-blue-500 text-white rounded-xl font-medium active:bg-blue-600"
          >
            상세보기
          </button>
        </div>
      )}

      {/* 바텀시트 (공고 목록) - 길찾기 모드에서는 숨김 */}
      {!directionsMode && <MobileBottomSheet
        height={bottomSheetHeight}
        onHeightChange={setBottomSheetHeight}
        jobCount={filteredJobPostings.length}
        isLoading={isLoading}
      >
        <div className="space-y-3 pb-20">
          {filteredJobPostings.map((job) => (
            <MobileJobCard
              key={job.id}
              job={job}
              isSelected={selectedJob?.id === job.id}
              onClick={() => {
                setSelectedJob(job);
                // 지도에서 해당 마커 위치로 이동
                const keyword = job.organization || job.location;
                if (keyword && coordsCacheRef.current.has(keyword)) {
                  const coords = coordsCacheRef.current.get(keyword)!;
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo(
                      new window.kakao.maps.LatLng(coords.lat, coords.lng)
                    );
                  }
                }
              }}
              onDetailClick={() => handleOpenDetail(job)}
            />
          ))}

          {!isLoading && filteredJobPostings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>검색 결과가 없습니다</p>
            </div>
          )}
        </div>
      </MobileBottomSheet>}

      {/* 필터 시트 */}
      <MobileFilterSheet
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filters}
        onApply={handleApplyFilter}
        schoolLevels={SCHOOL_LEVELS}
        subjects={MAP_FILTER_SUBJECTS}
      />

      {/* 상세보기 모달 */}
      {showDetail && selectedJob && (
        <MobileJobDetail
          job={selectedJob}
          onClose={() => setShowDetail(false)}
          onDirections={handleDirections}
        />
      )}

      {/* 길찾기 모드 UI */}
      {directionsMode && directionsJob && (
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl p-5 safe-area-inset-bottom animate-slide-up">
          {/* 닫기 버튼 */}
          <button
            onClick={clearDirections}
            className="absolute top-4 right-4 p-2 text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 목적지 정보 */}
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-1">목적지</p>
            <h3 className="font-bold text-gray-900">{directionsJob.organization}</h3>
            <p className="text-sm text-gray-600">{formatLocationDisplay(directionsJob.location)}</p>
          </div>

          {/* 경로 정보 */}
          {directionsInfo ? (
            <div className="flex items-center gap-6 mb-4 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div>
                  <p className="text-xs text-gray-500">거리</p>
                  <p className="font-bold text-blue-600">{directionsInfo.distance}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-gray-500">도보</p>
                  <p className="font-bold text-blue-600">{directionsInfo.duration}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 mb-4">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
              <span className="text-gray-500">경로 계산 중...</span>
            </div>
          )}

          {/* 카카오맵으로 상세 경로 보기 버튼 */}
          <button
            onClick={() => {
              const dest = directionsJob.organization || directionsJob.location;
              if (dest) {
                window.open(`https://map.kakao.com/link/search/${encodeURIComponent(dest)}`, '_blank');
              }
            }}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2 active:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            카카오맵에서 상세 경로 보기
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileMapPage;
