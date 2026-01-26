import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { fetchJobsByBoardRegion } from '@/lib/supabase/queries';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';
import { getSchoolLevelFromJob, SCHOOL_LEVEL_MARKER_COLORS } from '@/lib/constants/markerColors';
import { getDirections, formatDistance, formatDuration } from '@/lib/api/directions';
import type { JobPostingCard } from '@/types';
import type { TransportType, DirectionsResult } from '@/types/directions';
import { useAuthStore } from '@/stores/authStore';
import AuthModal from '@/components/auth/AuthModal';
import MobileBottomSheet from './components/MobileBottomSheet';
import MobileSearchBar from './components/MobileSearchBar';
import MobileQuickFilters from './components/MobileQuickFilters';
import MobileJobCard from './components/MobileJobCard';
import MobileJobDetail from './components/MobileJobDetail';
import MobileFilterSheet from './components/MobileFilterSheet';
import LocationPermissionModal from './components/LocationPermissionModal';
import DirectionsUnifiedSheet from './components/DirectionsUnifiedSheet';

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

  // 인증 상태
  const { user } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // UI 상태
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState<'collapsed' | 'half' | 'full'>('collapsed');

  // 길찾기 상태
  const [directionsMode, setDirectionsMode] = useState(false);
  const [directionsJob, setDirectionsJob] = useState<JobPostingCard | null>(null);
  const [directionsResult, setDirectionsResult] = useState<DirectionsResult | null>(null);
  const [transportType, setTransportType] = useState<TransportType>('car');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);

  // 길찾기 통합 시트 상태
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
  const [startLocation, setStartLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [endLocation, setEndLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

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

  // 빠른 필터 상태
  const [quickFilters, setQuickFilters] = useState<string[]>([]);
  const [quickSubjects, setQuickSubjects] = useState<Record<string, string[]>>({});
  const [globalSubjects, setGlobalSubjects] = useState<string[]>([]); // 전역 과목 필터

  // 위치 권한 모달 상태
  const [showLocationModal, setShowLocationModal] = useState(false);
  const locationPermissionCheckedRef = useRef(false);

  // 뷰포트 기반 필터링 상태
  const [viewportJobIds, setViewportJobIds] = useState<Set<string>>(new Set());
  const [isViewportSynced, setIsViewportSynced] = useState(false);
  const boundsDebounceRef = useRef<NodeJS.Timeout | null>(null);

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

    // 빠른 필터 - 임박 (D-3 이하)
    if (quickFilters.includes('urgent')) {
      filtered = filtered.filter(job =>
        job.daysLeft !== undefined && job.daysLeft <= 3
      );
    }

    // 빠른 필터 - 학교급
    const quickSchoolLevels = quickFilters.filter(f =>
      ['kindergarten', 'elementary', 'middle', 'high', 'special', 'etc'].includes(f)
    );

    if (quickSchoolLevels.length > 0) {
      filtered = filtered.filter(job => {
        const schoolLevel = (job.school_level || '').toLowerCase();
        const org = (job.organization || '').toLowerCase();
        const title = (job.title || '').toLowerCase();

        return quickSchoolLevels.some(level => {
          const keywords: Record<string, string[]> = {
            'kindergarten': ['유치원'],
            'elementary': ['초등'],
            'middle': ['중학', '중등'],
            'high': ['고등', '고교'],
            'special': ['특수'],
            'etc': ['기타'],
          };
          const levelKeywords = keywords[level] || [];
          const matchesLevel = levelKeywords.some(kw =>
            schoolLevel.includes(kw) || org.includes(kw) || title.includes(kw)
          );

          // 해당 학교급의 과목 필터가 있으면 적용
          const subjectsForLevel = quickSubjects[level] || [];
          if (matchesLevel && subjectsForLevel.length > 0) {
            const tags = job.tags || [];
            return subjectsForLevel.some(subject =>
              title.includes(subject.toLowerCase()) ||
              tags.some(t => t.toLowerCase().includes(subject.toLowerCase()))
            );
          }

          return matchesLevel;
        });
      });
    }

    // 기존 필터 - 학교급 필터
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

    // 과목 필터 (기존 필터 모달)
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

    // 전역 과목 필터 (빠른 필터 영역의 과목 칩)
    if (globalSubjects.length > 0) {
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const tags = job.tags || [];
        return globalSubjects.some(subject =>
          title.includes(subject.toLowerCase()) ||
          tags.some(t => t.toLowerCase().includes(subject.toLowerCase()))
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
  }, [jobPostings, filters, quickFilters, quickSubjects, globalSubjects, deduplicateJobs]);

  // 뷰포트 내 공고 업데이트 함수
  const updateViewportJobs = useCallback(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const bounds = map.getBounds();
    const cache = coordsCacheRef.current;

    const visibleIds = new Set<string>();

    for (const job of filteredJobPostings) {
      // DB 좌표 우선
      if (job.latitude && job.longitude) {
        const position = new window.kakao.maps.LatLng(
          Number(job.latitude),
          Number(job.longitude)
        );
        if (bounds.contain(position)) {
          visibleIds.add(job.id);
        }
        continue;
      }

      // 캐시된 좌표 사용
      const keyword = job.organization || job.location;
      if (keyword && cache.has(keyword)) {
        const coords = cache.get(keyword)!;
        const position = new window.kakao.maps.LatLng(coords.lat, coords.lng);
        if (bounds.contain(position)) {
          visibleIds.add(job.id);
        }
      }
    }

    setViewportJobIds(visibleIds);
    setIsViewportSynced(true);
  }, [filteredJobPostings]);

  // 뷰포트 기반 필터링된 공고 (지도에 보이는 것만)
  const viewportFilteredJobs = useMemo(() => {
    // 동기화 전이거나 뷰포트 내 공고가 없으면 전체 표시
    if (!isViewportSynced || viewportJobIds.size === 0) {
      return filteredJobPostings;
    }
    return filteredJobPostings.filter(job => viewportJobIds.has(job.id));
  }, [filteredJobPostings, viewportJobIds, isViewportSynced]);

  // SDK 로드
  useEffect(() => {
    loadKakaoMaps();
  }, [loadKakaoMaps]);

  // 위치 권한 모달 표시 로직 (첫 방문 시)
  useEffect(() => {
    if (locationPermissionCheckedRef.current) return;
    locationPermissionCheckedRef.current = true;

    // localStorage에서 위치 권한 선택 여부 확인
    const locationPermissionChoice = localStorage.getItem('locationPermissionChoice');

    // 이미 선택한 경우 모달 표시 안함
    if (locationPermissionChoice) return;

    // geolocation API 지원 확인
    if (!navigator.geolocation) return;

    // 이미 위치 권한이 있는지 확인 (permissions API 지원 시)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          // 이미 허용됨 - 저장하고 모달 표시 안함
          localStorage.setItem('locationPermissionChoice', 'allowed');
        } else if (result.state === 'prompt') {
          // 아직 선택 안함 - 모달 표시
          setShowLocationModal(true);
        }
        // denied인 경우는 모달 표시해도 브라우저가 막으므로 표시 안함
      }).catch(() => {
        // permissions API 실패 시 모달 표시
        setShowLocationModal(true);
      });
    } else {
      // permissions API 미지원 시 모달 표시
      setShowLocationModal(true);
    }
  }, []);

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

    // 뷰포트 변경 시 리스트 동기화 (debounce 적용)
    const handleBoundsChanged = () => {
      if (boundsDebounceRef.current) {
        clearTimeout(boundsDebounceRef.current);
      }
      boundsDebounceRef.current = setTimeout(() => {
        updateViewportJobs();
      }, 300);
    };

    window.kakao.maps.event.addListener(map, 'bounds_changed', handleBoundsChanged);
    window.kakao.maps.event.addListener(map, 'zoom_changed', handleBoundsChanged);

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

      // 마커 클릭 시 바로 상세보기 모달 표시
      window.kakao.maps.event.addListener(marker, 'click', () => {
        setSelectedJob(job);
        setShowDetail(true); // 바로 상세 모달 열기

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

  // 마커 생성 완료 후 뷰포트 동기화
  useEffect(() => {
    if (!mapInstanceRef.current || filteredJobPostings.length === 0) return;

    // 마커가 생성될 시간을 고려하여 지연 후 동기화
    const timer = setTimeout(() => {
      updateViewportJobs();
    }, 500);

    return () => clearTimeout(timer);
  }, [filteredJobPostings, updateViewportJobs]);

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

  // 위치 권한 허용 핸들러
  const handleLocationAllow = useCallback(() => {
    setShowLocationModal(false);
    localStorage.setItem('locationPermissionChoice', 'allowed');
    handleGetLocation();
  }, [handleGetLocation]);

  // 위치 권한 거부 핸들러
  const handleLocationDeny = useCallback(() => {
    setShowLocationModal(false);
    localStorage.setItem('locationPermissionChoice', 'denied');
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

  // 빠른 필터 토글
  const handleQuickFilterToggle = useCallback((filterId: string) => {
    setQuickFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  // 빠른 필터 과목 변경
  const handleQuickSubjectsChange = useCallback((filterId: string, subjects: string[]) => {
    setQuickSubjects(prev => ({
      ...prev,
      [filterId]: subjects,
    }));
  }, []);

  // 전역 과목 필터 변경
  const handleGlobalSubjectsChange = useCallback((subjects: string[]) => {
    setGlobalSubjects(subjects);
  }, []);

  // 빠른 필터 초기화
  const handleQuickFilterReset = useCallback(() => {
    setQuickFilters([]);
    setQuickSubjects({});
    setGlobalSubjects([]);
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
    setDirectionsResult(null);
  }, []);

  // 경로 계산 및 지도에 표시 (실제 API 호출)
  const calculateAndShowRoute = useCallback(async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    type: TransportType = transportType
  ) => {
    if (!mapInstanceRef.current) return;

    // 기존 경로 정리
    clearDirections();
    setDirectionsMode(true);
    setIsLoadingRoute(true);
    setShowDirectionsSheet(true); // 로딩 중에도 시트 표시

    const map = mapInstanceRef.current;

    // 출발지 마커
    const startPosition = new window.kakao.maps.LatLng(start.lat, start.lng);
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
    const endPosition = new window.kakao.maps.LatLng(end.lat, end.lng);
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

    try {
      // 실제 경로 API 호출
      const result = await getDirections(type, start, end);
      setDirectionsResult(result);

      // 경로 좌표가 있으면 실제 경로 그리기, 없으면 직선
      const colors: Record<TransportType, string> = {
        car: '#3B82F6',     // 파란색
        transit: '#22C55E', // 초록색
        walk: '#F97316'     // 주황색
      };

      let linePath: any[];
      if (result.path && result.path.length > 0) {
        // 실제 경로 좌표로 폴리라인 생성
        linePath = result.path.map(
          coord => new window.kakao.maps.LatLng(coord.lat, coord.lng)
        );
      } else {
        // 대중교통 등 경로 좌표가 없는 경우 직선
        linePath = [startPosition, endPosition];
      }

      polylineRef.current = new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 5,
        strokeColor: colors[type] || '#3B82F6',
        strokeOpacity: 0.8,
        strokeStyle: type === 'walk' ? 'shortdash' : 'solid',
      });
      polylineRef.current.setMap(map);

      // 지도 범위 조정 (경로가 모두 보이도록)
      const bounds = new window.kakao.maps.LatLngBounds();
      linePath.forEach((coord: any) => bounds.extend(coord));
      map.setBounds(bounds, 80, 80, 200, 80); // 하단에 시트용 여백
    } catch (error) {
      console.error('[MobileMapPage] 경로 검색 실패:', error);
      // 실패 시 직선 경로로 폴백
      const linePath = [startPosition, endPosition];
      polylineRef.current = new window.kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 5,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeStyle: 'solid',
      });
      polylineRef.current.setMap(map);

      // 지도 범위 조정
      const bounds = new window.kakao.maps.LatLngBounds();
      bounds.extend(startPosition);
      bounds.extend(endPosition);
      map.setBounds(bounds, 80, 80, 200, 80);
    } finally {
      setIsLoadingRoute(false);
    }
  }, [clearDirections, transportType]);

  // 위치 권한 상태 확인
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setHasLocationPermission(result.state === 'granted');
        result.onchange = () => {
          setHasLocationPermission(result.state === 'granted');
        };
      }).catch(() => {
        // permissions API 실패 시 false
        setHasLocationPermission(false);
      });
    }
  }, []);

  // 길찾기 시작 - 출발지 선택 시트 열기
  const handleDirections = useCallback((job: JobPostingCard) => {
    if (!isLoaded) return;

    setDirectionsJob(job);

    // 목적지 좌표 찾기
    const keyword = job.organization || job.location;
    if (!keyword) {
      alert('목적지 정보가 없습니다.');
      return;
    }

    // 목적지 좌표 검색
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(keyword, (result: any[], status: string) => {
      if (status !== window.kakao.maps.services.Status.OK || result.length === 0) {
        alert('목적지를 찾을 수 없습니다.');
        return;
      }

      const endLat = parseFloat(result[0].y);
      const endLng = parseFloat(result[0].x);

      setEndLocation({
        name: job.organization || '목적지',
        address: job.location || result[0].address_name || '',
        lat: endLat,
        lng: endLng,
      });

      // 통합 시트 표시 (출발지 선택부터 시작)
      setShowDirectionsSheet(true);
    });
  }, [isLoaded, hasLocationPermission]);

  // 현재 위치에서 출발 선택
  const handleSelectCurrentLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(
          position.coords.longitude,
          position.coords.latitude,
          (result: any[], status: string) => {
            const address = status === window.kakao.maps.services.Status.OK && result[0]
              ? result[0].address?.address_name || result[0].road_address?.address_name || ''
              : '';

            setStartLocation({
              name: '현재 위치',
              address,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });

            // 경로 계산 및 표시
            calculateAndShowRoute(
              { lat: position.coords.latitude, lng: position.coords.longitude },
              endLocation!
            );
          }
        );
      },
      (error) => {
        console.error('위치 가져오기 실패:', error);
        alert('현재 위치를 가져올 수 없습니다.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [endLocation, calculateAndShowRoute]);

  // 지도에서 출발지 선택 (향후 구현)
  const handleSelectMapLocation = useCallback(() => {
    // TODO: 지도 선택 모드 구현
    alert('지도 선택 기능은 준비 중입니다.');
  }, []);

  // 검색 결과에서 출발지 선택 (인라인 검색용)
  const handleSearchLocationSelect = useCallback((location: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => {
    setStartLocation({
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
    });

    // 경로 계산 및 표시
    calculateAndShowRoute(
      { lat: location.lat, lng: location.lng },
      endLocation!
    );
  }, [endLocation, calculateAndShowRoute]);

  // 위치 권한 요청
  const handleRequestLocationPermission = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      () => {
        setHasLocationPermission(true);
        handleSelectCurrentLocation();
      },
      (error) => {
        console.error('위치 권한 요청 실패:', error);
        alert('위치 권한을 허용해주세요.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleSelectCurrentLocation]);

  // 길찾기 시트 닫기
  const handleCloseDirectionsSheet = useCallback(() => {
    setShowDirectionsSheet(false);
    clearDirections();
    setStartLocation(null);
    setEndLocation(null);
    setDirectionsJob(null);
    setDirectionsResult(null);
    setTransportType('car');
  }, [clearDirections]);

  // 출발지 초기화
  const handleClearStartLocation = useCallback(() => {
    setStartLocation(null);
    setDirectionsResult(null);
    clearDirections();
  }, [clearDirections]);

  // 교통수단 변경 핸들러
  const handleTransportTypeChange = useCallback((type: TransportType) => {
    if (!startLocation || !endLocation) return;
    setTransportType(type);
    // 새 교통수단으로 경로 재계산
    calculateAndShowRoute(
      { lat: startLocation.lat, lng: startLocation.lng },
      { lat: endLocation.lat, lng: endLocation.lng },
      type
    );
  }, [startLocation, endLocation, calculateAndShowRoute]);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* 전체화면 지도 */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* 상단 검색바 + 빠른 필터 (플로팅) - 풀업 모드에서는 숨김 */}
      {bottomSheetHeight !== 'full' && (
        <div className="absolute top-0 left-0 right-0 z-20 safe-area-inset-top">
          <MobileSearchBar
            value={filters.searchQuery}
            onSearch={handleSearch}
            bottomSheetHeight={bottomSheetHeight}
            onProfileClick={() => {
              if (user) {
                // 로그인 상태: 프로필 페이지로 이동
                window.location.href = '/profile';
              } else {
                // 비로그인 상태: 로그인 모달 열기
                setShowAuthModal(true);
              }
            }}
          />
          <MobileQuickFilters
            selectedFilters={quickFilters}
            selectedSubjects={quickSubjects}
            onFilterToggle={handleQuickFilterToggle}
            onSubjectsChange={handleQuickSubjectsChange}
            onReset={handleQuickFilterReset}
            bottomSheetHeight={bottomSheetHeight}
            globalSubjects={globalSubjects}
            onGlobalSubjectsChange={handleGlobalSubjectsChange}
          />
        </div>
      )}

      {/* 현위치 버튼 - 상단 우측 (필터 칩 아래) */}
      {bottomSheetHeight !== 'full' && (
        <button
          onClick={handleGetLocation}
          disabled={isLocating}
          className="absolute right-4 top-[140px] z-20 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center active:bg-gray-100 disabled:opacity-50"
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
      )}

      {/* 바텀시트 (공고 목록) - 길찾기 모드에서는 숨김 */}
      {!directionsMode && <MobileBottomSheet
        height={bottomSheetHeight}
        onHeightChange={setBottomSheetHeight}
        jobCount={viewportFilteredJobs.length}
        isLoading={isLoading}
      >
        <div className="space-y-3 pb-20">
          {viewportFilteredJobs.map((job) => (
            <MobileJobCard
              key={job.id}
              job={job}
              isSelected={selectedJob?.id === job.id}
              onClick={() => {
                // 카드 클릭 시 바로 상세보기 열기
                handleOpenDetail(job);
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
              onDirectionsClick={() => handleDirections(job)}
            />
          ))}

          {!isLoading && viewportFilteredJobs.length === 0 && (
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

      {/* 길찾기 통합 시트 */}
      <DirectionsUnifiedSheet
        isOpen={showDirectionsSheet}
        onClose={handleCloseDirectionsSheet}
        startLocation={startLocation}
        endLocation={endLocation}
        directionsResult={directionsResult}
        transportType={transportType}
        onTransportTypeChange={handleTransportTypeChange}
        isLoading={isLoadingRoute}
        destinationName={directionsJob?.organization || ''}
        onSelectCurrentLocation={handleSelectCurrentLocation}
        onSelectSearchLocation={handleSearchLocationSelect}
        onSelectMapLocation={handleSelectMapLocation}
        onClearStartLocation={handleClearStartLocation}
        hasLocationPermission={hasLocationPermission}
        onRequestLocationPermission={handleRequestLocationPermission}
      />

      {/* 위치 권한 요청 모달 */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={handleLocationAllow}
        onDeny={handleLocationDeny}
      />

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab="login"
      />
    </div>
  );
};

export default MobileMapPage;
