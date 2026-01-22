import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SCHOOL_LEVELS } from '../constants';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';
import { fetchJobsByBoardRegion } from '@/lib/supabase/queries';
import type { JobPostingCard } from '@/types';
import type { Coordinates, DirectionsResult } from '@/types/directions';
import { JobDetailPanel } from './JobDetailPanel';
import HeroCard from './HeroCard';
import { DirectionsPanel } from '@/components/directions/DirectionsPanel';
import TeacherMarkerModal from '@/components/map/TeacherMarkerModal';
import ProgramMarkerModal from '@/components/map/ProgramMarkerModal';
import FullScreenLocationPicker from '@/components/map/FullScreenLocationPicker';
import BottomControlBar from '@/components/map/BottomControlBar';
import MarkerPopup from '@/components/map/MarkerPopup';
import AuthModal from '@/components/auth/AuthModal';
import ProfileButton from '@/components/auth/ProfileButton';
import EmptyState from '@/components/common/EmptyState';
import { ListSkeleton } from '@/components/common/CardSkeleton';
import { useAuthStore } from '@/stores/authStore';
import { fetchTeacherMarkers, fetchProgramMarkers } from '@/lib/supabase/markers';
import { type MarkerLayer, type TeacherMarker, type ProgramMarker, MARKER_COLORS } from '@/types/markers';

export const Hero: React.FC = () => {
  // 지도 필터 옵션
  const MAP_FILTER_SUBJECTS = ['국어', '영어', '수학', '사회', '과학', '체육', '음악', '미술', '정보', '보건', '사서', '상담'] as const;

  // 지도 필터 상태
  const [mapFilters, setMapFilters] = useState<{
    schoolLevels: string[];
    subjects: string[];
  }>({
    schoolLevels: [],
    subjects: [],
  });

  // 드롭다운 열림 상태
  const [openDropdown, setOpenDropdown] = useState<'schoolLevel' | 'subject' | null>(null);

  // 선택된 공고 (상세 패널용)
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);
  const setSelectedJobRef = useRef(setSelectedJob);

  // setSelectedJob ref 업데이트
  useEffect(() => {
    setSelectedJobRef.current = setSelectedJob;
  }, [setSelectedJob]);

  // selectedJob 변경 감지 디버깅
  useEffect(() => {
    console.log('[Hero] ⭐ selectedJob 변경됨:', selectedJob ? `공고: ${selectedJob.title}` : 'null');
  }, [selectedJob]);

  // 길찾기 관련 상태
  const [directionsJob, setDirectionsJob] = useState<JobPostingCard | null>(null);
  const [directionsCoords, setDirectionsCoords] = useState<Coordinates | null>(null);
  const polylineRef = useRef<any>(null);

  // 지도 클릭 모드 (출발지 선택용)
  const [mapClickMode, setMapClickMode] = useState(false);
  const mapClickCallbackRef = useRef<((coords: Coordinates) => void) | null>(null);

  // 마커 등록 관련 상태
  const { user, status: authStatus } = useAuthStore();
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState<'teacher' | 'program'>('teacher');
  const [pendingMarkerCoords, setPendingMarkerCoords] = useState<Coordinates | null>(null);
  const [pendingMarkerType, setPendingMarkerType] = useState<'teacher' | 'program' | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'signup'>('login');

  // 마커 레이어 토글 상태
  const [activeLayers, setActiveLayers] = useState<MarkerLayer[]>(['job', 'teacher', 'program']);
  const [teacherMarkers, setTeacherMarkers] = useState<TeacherMarker[]>([]);
  const [programMarkers, setProgramMarkers] = useState<ProgramMarker[]>([]);
  const teacherMapMarkersRef = useRef<any[]>([]);
  const programMapMarkersRef = useRef<any[]>([]);

  // 마커 팝업 상태
  const [selectedMarker, setSelectedMarker] = useState<{
    type: 'teacher' | 'program';
    marker: TeacherMarker | ProgramMarker;
    position: { x: number; y: number };
  } | null>(null);

  // 레이어 토글 핸들러
  const toggleLayer = useCallback((layer: MarkerLayer) => {
    setActiveLayers(prev =>
      prev.includes(layer)
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  }, []);

  // 필터 토글 핸들러
  const toggleMapFilter = (category: 'schoolLevels' | 'subjects', value: string) => {
    setMapFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();

  // 사용자 위치 상태
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [activeLocationFilter, setActiveLocationFilter] = useState<string | null>(null);
  const [isLocationSearching, setIsLocationSearching] = useState(false);

  // 공고 데이터 상태
  const [jobPostings, setJobPostings] = useState<JobPostingCard[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(false);
  const [isJobListCollapsed, setIsJobListCollapsed] = useState(false);
  const [isPanelHidden, setIsPanelHidden] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const mapMarkersRef = useRef<any[]>([]);
  const coordsCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // 마커-공고 매핑 (마커 클릭 시 상세 패널 열기용)
  const markerJobMapRef = useRef<Map<any, JobPostingCard>>(new Map());

  // 마커 클릭 직후 지도 클릭 무시 플래그
  const ignoreMapClickRef = useRef(false);

  // 중복 제거 함수 (organization + title 기준)
  const deduplicateJobs = useCallback((jobs: JobPostingCard[]): JobPostingCard[] => {
    const seen = new Map<string, JobPostingCard>();

    for (const job of jobs) {
      const key = `${job.organization}|${job.title}`;
      const existing = seen.get(key);

      // 같은 기관+제목 중 최신(created_at 기준) 또는 마감일 가까운 것 선택
      if (!existing) {
        seen.set(key, job);
      } else {
        // daysLeft가 더 작은 것(마감 임박) 우선
        if (job.daysLeft !== undefined && existing.daysLeft !== undefined) {
          if (job.daysLeft < existing.daysLeft) {
            seen.set(key, job);
          }
        }
      }
    }

    return Array.from(seen.values());
  }, []);

  // 필터가 적용된 공고 데이터
  const filteredJobPostings = useMemo(() => {
    // 먼저 중복 제거
    let filtered = deduplicateJobs(jobPostings);

    // 학교급 필터
    if (mapFilters.schoolLevels.length > 0) {
      filtered = filtered.filter(job => {
        const schoolLevel = (job.school_level || '').toLowerCase();
        const hasSchoolLevel = schoolLevel.length > 0;
        const org = (job.organization || '').toLowerCase();

        return mapFilters.schoolLevels.some(level => {
          if (level === '유치원') {
            return schoolLevel.includes('유치원') ||
              (!hasSchoolLevel && org.includes('유치원'));
          }
          if (level === '초등학교') {
            return schoolLevel.includes('초등') ||
              (!hasSchoolLevel && org.includes('초등'));
          }
          if (level === '중학교') {
            return schoolLevel.includes('중학') || schoolLevel.includes('중등') ||
              (!hasSchoolLevel && (org.includes('중학') || org.includes('중등')));
          }
          if (level === '고등학교') {
            return schoolLevel.includes('고등') || schoolLevel.includes('고교') ||
              (!hasSchoolLevel && (org.includes('고등') || org.includes('고교')));
          }
          if (level === '특수학교') {
            return schoolLevel.includes('특수') ||
              (!hasSchoolLevel && org.includes('특수'));
          }
          if (level === '기타') {
            const schoolLevelHasKeyword = schoolLevel.includes('유치원') || schoolLevel.includes('초등') ||
              schoolLevel.includes('중학') || schoolLevel.includes('중등') ||
              schoolLevel.includes('고등') || schoolLevel.includes('고교') || schoolLevel.includes('특수');

            if (hasSchoolLevel) {
              return !schoolLevelHasKeyword;
            } else {
              return !org.includes('유치원') && !org.includes('초등') &&
                !org.includes('중학') && !org.includes('중등') &&
                !org.includes('고등') && !org.includes('고교') &&
                !org.includes('특수');
            }
          }
          return false;
        });
      });
    }

    // 과목 필터
    if (mapFilters.subjects.length > 0) {
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const tags = job.tags || [];

        return mapFilters.subjects.some(subject => {
          const subLower = subject.toLowerCase();
          return title.includes(subLower) || tags.some(t => t.toLowerCase() === subLower);
        });
      });
    }

    // 주소 검색 키워드 필터
    if (activeLocationFilter) {
      const provinceKeywords = ['서울', '세종', '인천', '대전', '광주', '대구', '울산', '부산', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
      const searchKeywords = activeLocationFilter
        .replace(/특별시|광역시|특별자치시|특별자치도|도|시|구|군/g, ' ')
        .split(/\s+/)
        .filter(k => k.length >= 2);

      const isProvinceOnlySearch = searchKeywords.length === 1 &&
        provinceKeywords.some(p => p === searchKeywords[0]);

      if (searchKeywords.length > 0 && !isProvinceOnlySearch) {
        const specificKeyword = searchKeywords[searchKeywords.length - 1].toLowerCase();

        filtered = filtered.filter(job => {
          const org = (job.organization || '').toLowerCase();
          const loc = (job.location || '').toLowerCase();
          const title = (job.title || '').toLowerCase();

          return org.includes(specificKeyword) ||
            loc.includes(specificKeyword) ||
            title.includes(specificKeyword);
        });
      }
    }

    return filtered;
  }, [jobPostings, mapFilters, activeLocationFilter, deduplicateJobs]);

  // 인증 상태 초기화
  const { initialize: initializeAuth } = useAuthStore();
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Load Kakao Maps SDK
  useEffect(() => {
    loadKakaoMaps();
  }, [loadKakaoMaps]);

  // 주소 검색 핸들러
  const handleLocationSearch = useCallback(() => {
    if (!locationSearchQuery.trim() || !isLoaded || isLocationSearching) return;

    const searchQuery = locationSearchQuery.trim();
    const geocoder = new window.kakao.maps.services.Geocoder();

    setIsLocationSearching(true);

    geocoder.addressSearch(searchQuery, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        setActiveLocationFilter(searchQuery);
        setLocationSearchQuery('');
        setIsLocationSearching(false);
      } else {
        const places = new window.kakao.maps.services.Places();
        places.keywordSearch(searchQuery, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const { y: lat, x: lng } = result[0];
            setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
            setActiveLocationFilter(searchQuery);
            setLocationSearchQuery('');
          }
          setIsLocationSearching(false);
        });
      }
    });
  }, [locationSearchQuery, isLoaded, isLocationSearching]);

  // 지역 필터 취소 핸들러
  const clearLocationFilter = useCallback(() => {
    setActiveLocationFilter(null);
  }, []);

  // 기본 위치 (서울)
  const defaultLocation = { lat: 37.5665, lng: 126.9780 };
  const mapCenter = userLocation || defaultLocation;

  // Initialize map
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

    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    window.kakao.maps.event.addListener(map, 'dragend', () => {
      const center = map.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();

      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const region = result[0];
          const regionName = (region.region_1depth_name || '')
            .replace(/특별시$/, '')
            .replace(/광역시$/, '')
            .replace(/특별자치시$/, '')
            .replace(/특별자치도$/, '')
            .replace(/도$/, '');

          console.log('[Hero] 지도 이동 감지, 새 지역:', regionName);
          loadJobPostings(regionName);
        }
      });
    });

    loadJobPostings('서울');
  }, [isLoaded, mapCenter.lat, mapCenter.lng]);

  // 지도 클릭 이벤트 - 출발지 선택 모드 (별도 useEffect로 분리하여 mapClickMode 변경 시에만 업데이트)
  useEffect(() => {
    // SDK가 로드되지 않았거나 지도가 없으면 리턴
    if (!isLoaded || !window.kakao?.maps?.event) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // 기존 클릭 이벤트 제거하고 새로 등록
    const clickHandler = (mouseEvent: any) => {
      if (mapClickCallbackRef.current) {
        const latlng = mouseEvent.latLng;
        const coords: Coordinates = {
          lat: latlng.getLat(),
          lng: latlng.getLng()
        };
        console.log('[Hero] 지도 클릭 감지:', coords); // 디버그용 로그
        mapClickCallbackRef.current(coords);
        mapClickCallbackRef.current = null;
        setMapClickMode(false);
      }
    };

    window.kakao.maps.event.addListener(map, 'click', clickHandler);
    console.log('[Hero] 지도 클릭 이벤트 리스너 등록됨, mapClickMode:', mapClickMode); // 디버그용 로그

    return () => {
      if (window.kakao?.maps?.event) {
        window.kakao.maps.event.removeListener(map, 'click', clickHandler);
      }
    };
  }, [isLoaded, mapClickMode]);

  // 사용자 위치 변경 시 지도 중심 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    const newCenter = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    mapInstanceRef.current.setCenter(newCenter);
  }, [userLocation]);

  // 공고 로드 함수
  const loadJobPostings = async (regionName: string) => {
    try {
      setIsJobsLoading(true);
      console.log('[Hero] 공고 데이터 로드 시작, 지역:', regionName);
      const jobs = await fetchJobsByBoardRegion(regionName, 250);
      console.log('[Hero] 공고 데이터 로드 완료:', jobs.length, '개');
      setJobPostings(jobs);
    } catch (error) {
      console.error('[Hero] 공고 데이터 로드 실패:', error);
    } finally {
      setIsJobsLoading(false);
    }
  };

  // 구직교사/프로그램 마커 로드 함수
  const loadMarkerData = useCallback(async () => {
    try {
      console.log('[Hero] 마커 데이터 로드 시작');
      const [teachers, programs] = await Promise.all([
        fetchTeacherMarkers(),
        fetchProgramMarkers()
      ]);
      console.log('[Hero] 마커 로드 완료 - 구직교사:', teachers.length, '개, 프로그램:', programs.length, '개');
      setTeacherMarkers(teachers);
      setProgramMarkers(programs);
    } catch (error) {
      console.error('[Hero] 마커 데이터 로드 실패:', error);
    }
  }, []);

  // 초기 마커 데이터 로드
  useEffect(() => {
    if (isLoaded) {
      loadMarkerData();
    }
  }, [isLoaded, loadMarkerData]);

  // 구직교사 마커 지도에 표시
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !activeLayers.includes('teacher')) {
      // 레이어 비활성화 시 마커 제거
      teacherMapMarkersRef.current.forEach(m => m.setMap(null));
      teacherMapMarkersRef.current = [];
      return;
    }

    // 기존 마커 정리
    teacherMapMarkersRef.current.forEach(m => m.setMap(null));
    teacherMapMarkersRef.current = [];

    const map = mapInstanceRef.current;

    teacherMarkers.forEach(marker => {
      const position = new window.kakao.maps.LatLng(marker.latitude, marker.longitude);

      // 커스텀 마커 이미지 (빨간색 원)
      const markerSize = new window.kakao.maps.Size(16, 16);
      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="${MARKER_COLORS.teacher}" stroke="white" stroke-width="2"/></svg>`)}`,
        markerSize
      );

      const kakaoMarker = new window.kakao.maps.Marker({
        position,
        map,
        image: markerImage,
        clickable: true
      });

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(kakaoMarker, 'click', () => {
        const proj = map.getProjection();
        const point = proj.containerPointFromCoords(position);
        setSelectedMarker({
          type: 'teacher',
          marker,
          position: { x: point.x + 20, y: point.y - 100 }
        });
      });

      teacherMapMarkersRef.current.push(kakaoMarker);
    });

    return () => {
      teacherMapMarkersRef.current.forEach(m => m.setMap(null));
      teacherMapMarkersRef.current = [];
    };
  }, [isLoaded, teacherMarkers, activeLayers]);

  // 프로그램 마커 지도에 표시
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !activeLayers.includes('program')) {
      // 레이어 비활성화 시 마커 제거
      programMapMarkersRef.current.forEach(m => m.setMap(null));
      programMapMarkersRef.current = [];
      return;
    }

    // 기존 마커 정리
    programMapMarkersRef.current.forEach(m => m.setMap(null));
    programMapMarkersRef.current = [];

    const map = mapInstanceRef.current;

    programMarkers.forEach(marker => {
      const position = new window.kakao.maps.LatLng(marker.latitude, marker.longitude);

      // 커스텀 마커 이미지 (초록색 원)
      const markerSize = new window.kakao.maps.Size(16, 16);
      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="7" fill="${MARKER_COLORS.program}" stroke="white" stroke-width="2"/></svg>`)}`,
        markerSize
      );

      const kakaoMarker = new window.kakao.maps.Marker({
        position,
        map,
        image: markerImage,
        clickable: true
      });

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(kakaoMarker, 'click', () => {
        const proj = map.getProjection();
        const point = proj.containerPointFromCoords(position);
        setSelectedMarker({
          type: 'program',
          marker,
          position: { x: point.x + 20, y: point.y - 100 }
        });
      });

      programMapMarkersRef.current.push(kakaoMarker);
    });

    return () => {
      programMapMarkersRef.current.forEach(m => m.setMap(null));
      programMapMarkersRef.current = [];
    };
  }, [isLoaded, programMarkers, activeLayers]);

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

  // 길찾기 버튼 클릭 핸들러
  const handleDirectionsClick = useCallback((job: JobPostingCard) => {
    // 먼저 좌표 검색
    const places = new window.kakao.maps.services.Places();
    const keyword = job.organization || job.location;

    if (!keyword) {
      console.error('[Hero] 길찾기: 검색 키워드 없음');
      return;
    }

    places.keywordSearch(keyword, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const coords: Coordinates = {
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x)
        };
        setDirectionsCoords(coords);
        setDirectionsJob(job);
        // setSelectedJob(null); // 상세 패널 유지
      } else {
        console.error('[Hero] 길찾기: 위치 검색 실패', keyword);
      }
    });
  }, []);

  // 길찾기 패널 닫기
  const handleDirectionsClose = useCallback(() => {
    setDirectionsJob(null);
    setDirectionsCoords(null);
    // 기존 경로선 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  }, []);

  // 경로 결과 받아서 지도에 Polyline 표시
  const handleRouteFound = useCallback((result: DirectionsResult) => {
    if (!mapInstanceRef.current || !result.path || result.path.length === 0) return;

    // 기존 경로선 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // 경로 좌표 변환
    const linePath = result.path.map(
      coord => new window.kakao.maps.LatLng(coord.lat, coord.lng)
    );

    // Polyline 스타일 (교통수단별 색상)
    const colors = {
      car: '#3B82F6',     // 파란색
      transit: '#22C55E', // 초록색
      walk: '#F97316'     // 주황색
    };

    // Polyline 생성
    const polyline = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: colors[result.type] || '#3B82F6',
      strokeOpacity: 0.8,
      strokeStyle: result.type === 'walk' ? 'shortdash' : 'solid'
    });

    polyline.setMap(mapInstanceRef.current);
    polylineRef.current = polyline;

    // 경로가 모두 보이도록 지도 범위 조정
    const bounds = new window.kakao.maps.LatLngBounds();
    linePath.forEach(coord => bounds.extend(coord));
    mapInstanceRef.current.setBounds(bounds, 50, 50, 50, 550); // 왼쪽 패널(카드+상세+길찾기) 고려한 여백
  }, []);

  // 카드 클릭 핸들러 (상세 패널 열기 + 지도 이동)
  const handleCardClick = useCallback((job: JobPostingCard) => {
    setSelectedJob(job);

    // 지도 이동 - 패널(카드리스트 240px + 상세패널 260px)을 피해 마커가 보이도록 오프셋
    if (mapInstanceRef.current && job.organization) {
      const places = new window.kakao.maps.services.Places();
      places.keywordSearch(job.organization, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const map = mapInstanceRef.current;
          const targetLat = parseFloat(result[0].y);
          const targetLng = parseFloat(result[0].x);

          // 현재 지도 레벨에 따라 픽셀→경도 변환 비율 계산
          // 패널 총 너비: 카드리스트(240px) + 간격(12px) + 상세패널(260px) + 여백(30px) = 542px
          // 마커가 패널 오른쪽에 충분한 여백을 두고 보이도록 지도 중심을 왼쪽으로 이동
          const panelWidthPx = 300; // 패널 오른쪽 끝에서 약간 안쪽에 마커가 오도록
          const bounds = map.getBounds();
          const mapWidth = mapContainerRef.current?.offsetWidth || 800;
          const lngPerPx = (bounds.getNorthEast().getLng() - bounds.getSouthWest().getLng()) / mapWidth;
          const offsetLng = lngPerPx * panelWidthPx;

          // 지도 중심을 서쪽(왼쪽)으로 이동 → 마커는 동쪽(오른쪽, 패널 없는 곳)에 표시됨
          const adjustedCoords = new window.kakao.maps.LatLng(targetLat, targetLng - offsetLng);
          map.panTo(adjustedCoords);
          map.setLevel(3);
        }
      });
    }
  }, []);

  // 공고 마커 표시 (최적화: 병렬 배치 처리 + 캐시 즉시 처리 + sessionStorage 영구 캐시)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // 기존 마커 정리
    mapMarkersRef.current.forEach(marker => marker.setMap(null));
    mapMarkersRef.current = [];
    markerJobMapRef.current.clear();
    setMarkerCount(0);

    // 레이어 비활성화 시 마커 표시 안함
    if (!activeLayers.includes('job')) return;

    if (filteredJobPostings.length === 0) return;

    const map = mapInstanceRef.current;
    const places = new window.kakao.maps.services.Places();
    const cache = coordsCacheRef.current;
    let cancelled = false;
    let currentInfowindow: any = null;

    // sessionStorage에서 캐시 복원
    try {
      const savedCache = sessionStorage.getItem('jobCoordsCache');
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        Object.entries(parsed).forEach(([k, v]) => {
          if (!cache.has(k)) cache.set(k, v as { lat: number; lng: number });
        });
      }
    } catch (e) {
      console.warn('[Hero] 캐시 복원 실패:', e);
    }

    const coordsJobsMap = new Map<string, JobPostingCard[]>();
    const coordsMarkerMap = new Map<string, any>();

    const createMarker = (coords: { lat: number; lng: number }, job: JobPostingCard) => {
      if (cancelled) return;

      const coordKey = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

      if (!coordsJobsMap.has(coordKey)) {
        coordsJobsMap.set(coordKey, []);
      }
      coordsJobsMap.get(coordKey)!.push(job);

      let finalCoords = coords;
      if (coordsMarkerMap.has(coordKey)) {
        const offsetLat = (Math.random() - 0.5) * 0.0005;
        const offsetLng = (Math.random() - 0.5) * 0.0005;
        finalCoords = { lat: coords.lat + offsetLat, lng: coords.lng + offsetLng };
      }

      const position = new window.kakao.maps.LatLng(finalCoords.lat, finalCoords.lng);

      // 기본 마커 사용
      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map,
      });

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {
        console.log('[Hero] 마커 클릭됨:', coordKey, '공고 수:', coordsJobsMap.get(coordKey)?.length || 1);

        // 🔒 마커 클릭 직후 지도 클릭 무시 (이벤트 버블링 방지)
        ignoreMapClickRef.current = true;
        setTimeout(() => {
          ignoreMapClickRef.current = false;
          console.log('[Hero] 🔓 지도 클릭 무시 해제');
        }, 150);

        if (currentInfowindow) currentInfowindow.close();

        const jobsAtLocation = coordsJobsMap.get(coordKey) || [job];

        if (jobsAtLocation.length === 1) {
          console.log('[Hero] 공고 1개 - JobDetailPanel 열기:', jobsAtLocation[0].title);
          // stale closure 방지: 전역 함수 사용
          if (window.selectJobFromMarker) {
            window.selectJobFromMarker(jobsAtLocation[0].id);
          }
        } else {
          console.log('[Hero] 공고 여러 개 - InfoWindow 표시:', jobsAtLocation.length, '개');
          const jobItems = jobsAtLocation.map((j, idx) => `
            <div style="padding:6px 0;${idx > 0 ? 'border-top:1px solid #eee;' : ''}cursor:pointer;"
                 onclick="window.selectJobFromMarker && window.selectJobFromMarker('${j.id}')">
              <div style="font-size:10px;color:#666;margin-bottom:2px;">${j.organization || ''}</div>
              <div style="font-size:11px;font-weight:600;color:#333;line-height:1.3;">${(j.title || '').slice(0, 25)}${(j.title || '').length > 25 ? '...' : ''}</div>
              ${j.daysLeft !== undefined && j.daysLeft <= 5 ? `<span style="font-size:9px;padding:2px 5px;border-radius:3px;background:${j.daysLeft === 0 ? '#EF4444' : j.daysLeft <= 3 ? '#FEE2E2' : '#FFEDD5'};color:${j.daysLeft === 0 ? '#FFFFFF' : j.daysLeft <= 3 ? '#B91C1C' : '#C2410C'};">${j.daysLeft === 0 ? 'D-Day' : `D-${j.daysLeft}`}</span>` : ''}
            </div>
          `).join('');

          const infowindow = new window.kakao.maps.InfoWindow({
            content: `
              <div style="padding:8px 12px;min-width:180px;max-width:260px;font-family:sans-serif;">
                <div style="font-size:11px;font-weight:bold;color:#5B6EF7;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #5B6EF7;">
                  이 위치 공고 ${jobsAtLocation.length}개
                </div>
                <div style="max-height:180px;overflow-y:auto;">
                  ${jobItems}
                </div>
              </div>
            `,
            removable: true,
          });
          infowindow.open(map, marker);
          currentInfowindow = infowindow;
        }

        const offsetLng = 0.002;
        const adjustedCoords = new window.kakao.maps.LatLng(
          finalCoords.lat,
          finalCoords.lng + offsetLng
        );
        map.panTo(adjustedCoords);
      });

      mapMarkersRef.current.push(marker);
      markerJobMapRef.current.set(marker, job);
      coordsMarkerMap.set(coordKey, marker);
      setMarkerCount(prev => prev + 1);
    };

    // 인포윈도우에서 공고 선택 시 호출될 전역 함수 (cleanup에서 삭제되지 않음)
    if (!(window as any).selectJobFromMarker) {
      (window as any).selectJobFromMarker = (jobId: string) => {
        console.log('[Hero] selectJobFromMarker 호출됨, jobId:', jobId);

        // 🔒 InfoWindow 내부 클릭도 지도 클릭 무시 (이벤트 버블링 방지)
        ignoreMapClickRef.current = true;
        setTimeout(() => {
          ignoreMapClickRef.current = false;
          console.log('[Hero] 🔓 지도 클릭 무시 해제 (InfoWindow)');
        }, 150);

        // ref를 통해 항상 최신 filteredJobPostings와 setSelectedJob 접근
        const currentJobs = (window as any).__currentFilteredJobPostings || [];
        const job = currentJobs.find((j: any) => j.id === jobId);
        console.log('[Hero] job 찾기 결과:', job ? `찾음 (${job.title})` : '못 찾음');
        console.log('[Hero] setSelectedJobRef.current 타입:', typeof setSelectedJobRef.current);
        console.log('[Hero] setSelectedJobRef.current 존재:', !!setSelectedJobRef.current);
        if (job && setSelectedJobRef.current) {
          console.log('[Hero] setSelectedJob 호출 시작, job:', job);
          try {
            setSelectedJobRef.current(job);
            console.log('[Hero] ✅ setSelectedJob 호출 완료');
          } catch (error) {
            console.error('[Hero] ❌ setSelectedJob 호출 오류:', error);
          }
        } else {
          console.log('[Hero] ❌ 호출 실패 - job:', !!job, 'ref:', !!setSelectedJobRef.current);
        }
      };
    }

    // 현재 filteredJobPostings를 전역에 저장 (selectJobFromMarker에서 접근용)
    (window as any).__currentFilteredJobPostings = filteredJobPostings;
    console.log('[Hero] __currentFilteredJobPostings 업데이트:', filteredJobPostings.length, '개');

    // 캐시 저장 함수
    const saveCache = () => {
      try {
        const cacheObj: Record<string, { lat: number; lng: number }> = {};
        cache.forEach((v, k) => { cacheObj[k] = v; });
        sessionStorage.setItem('jobCoordsCache', JSON.stringify(cacheObj));
      } catch (e) {
        console.warn('[Hero] 캐시 저장 실패:', e);
      }
    };

    // 키워드 검색 Promise 래퍼
    const searchKeyword = (keyword: string): Promise<{ lat: number; lng: number } | null> => {
      return new Promise((resolve) => {
        places.keywordSearch(keyword, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
          } else {
            resolve(null);
          }
        });
      });
    };

    // 단일 공고 처리
    const processJob = async (job: JobPostingCard): Promise<boolean> => {
      if (cancelled) return false;

      const keyword = job.organization || job.location;
      if (!keyword) return false;

      // 캐시 히트: 즉시 처리
      if (cache.has(keyword)) {
        createMarker(cache.get(keyword)!, job);
        return true;
      }

      // API 검색
      let coords = await searchKeyword(keyword);

      // 첫 검색 실패 시 location으로 재검색
      if (!coords && job.location && job.location !== keyword) {
        coords = await searchKeyword(job.location);
      }

      if (coords) {
        cache.set(keyword, coords);
        createMarker(coords, job);
        return true;
      }

      return false;
    };

    // 병렬 배치 처리
    const BATCH_SIZE = 10;
    const processBatches = async () => {
      console.log(`[Hero] 마커 생성 시작: ${filteredJobPostings.length}개 공고`);
      const startTime = Date.now();

      // 1단계: 캐시 히트 즉시 처리 (딜레이 없음)
      const cachedJobs: JobPostingCard[] = [];
      const uncachedJobs: JobPostingCard[] = [];

      filteredJobPostings.forEach(job => {
        const keyword = job.organization || job.location;
        if (keyword && cache.has(keyword)) {
          cachedJobs.push(job);
        } else {
          uncachedJobs.push(job);
        }
      });

      // 캐시된 공고 즉시 마커 생성
      cachedJobs.forEach(job => {
        if (cancelled) return;
        const keyword = job.organization || job.location;
        if (keyword) createMarker(cache.get(keyword)!, job);
      });

      console.log(`[Hero] 캐시 히트: ${cachedJobs.length}개 즉시 처리`);

      // 2단계: 캐시 미스 병렬 배치 처리
      let successCount = cachedJobs.length;
      let failedCount = 0;

      for (let i = 0; i < uncachedJobs.length; i += BATCH_SIZE) {
        if (cancelled) break;

        const batch = uncachedJobs.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(job => processJob(job)));

        results.forEach(success => {
          if (success) successCount++;
          else failedCount++;
        });

        // 배치 간 짧은 딜레이 (API rate limit 방지)
        if (i + BATCH_SIZE < uncachedJobs.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // 캐시 저장
      saveCache();

      const elapsed = Date.now() - startTime;
      console.log(`[Hero] 마커 생성 완료: 성공 ${successCount}개, 실패 ${failedCount}개 (${elapsed}ms)`);
    };

    processBatches();

    return () => {
      cancelled = true;
      if (currentInfowindow) currentInfowindow.close();
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
      markerJobMapRef.current.clear();
      // selectJobFromMarker는 삭제하지 않음 (한 번 정의하면 계속 사용)
    };
  }, [isLoaded, filteredJobPostings, activeLayers]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <section className="h-full w-full relative">
      {/* 지도 영역 */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        onClick={(e) => {
          // 마커 클릭 직후에는 지도 클릭 무시 (이벤트 버블링 방지)
          if (ignoreMapClickRef.current) {
            console.log('[Hero] 🗺️ 지도 클릭 무시됨 (마커 클릭 직후)');
            return;
          }

          // 지도 클릭 시 상세 패널 닫기 (맵 클릭 모드가 아닐 때만)
          if (!mapClickMode && selectedJob) {
            // 클릭 이벤트가 패널 내부에서 발생했는지 확인
            const target = e.target as HTMLElement;
            const isInsidePanel = target.closest('[data-panel]');
            console.log('[Hero] 🗺️ 지도 클릭 감지 - isInsidePanel:', !!isInsidePanel, 'selectedJob:', !!selectedJob);
            if (!isInsidePanel) {
              console.log('[Hero] 🗺️ 패널 밖 클릭 → setSelectedJob(null) 호출');
              setSelectedJob(null);
            }
          }
        }}
      />

      {/* 맵 클릭 모드 오버레이 - 카카오맵 위에 투명하게 표시되어 커서와 클릭 이벤트를 처리 */}
      {mapClickMode && (
        <div
          className="absolute inset-0 w-full h-full z-[5]"
          style={{
            cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%2364B5F6' stroke='%23ffffff' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair`,
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // 클릭 위치를 지도 좌표로 변환
            const map = mapInstanceRef.current;
            if (!map || !mapClickCallbackRef.current) return;

            const rect = mapContainerRef.current?.getBoundingClientRect();
            if (!rect) return;

            // 클릭 위치의 픽셀 좌표 계산
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 픽셀 좌표를 지도 좌표로 변환
            const projection = map.getProjection();
            const point = new window.kakao.maps.Point(x, y);
            const latlng = projection.coordsFromContainerPoint(point);

            const coords: Coordinates = {
              lat: latlng.getLat(),
              lng: latlng.getLng()
            };

            console.log('[Hero] 오버레이 클릭 감지:', coords);
            mapClickCallbackRef.current(coords);
            mapClickCallbackRef.current = null;
            setMapClickMode(false);
          }}
        />
      )}





      {/* 로그인 필요 알림 - Anti-Vibe 미니멀 모노크롬 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowLoginPrompt(false)}>
          <div
            className="bg-white rounded-xl p-8 max-w-sm mx-4 text-center"
            style={{
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 자물쇠 아이콘 */}
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">로그인이 필요합니다</h3>
            <p className="text-sm text-gray-500 mb-6">마커를 등록하려면 먼저 로그인해주세요.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowLoginPrompt(false);
                  setIsAuthModalOpen(true);
                }}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalInitialTab}
      />

      {/* 구직 교사 마커 등록 모달 */}
      <TeacherMarkerModal
        isOpen={isTeacherModalOpen}
        onClose={() => {
          setIsTeacherModalOpen(false);
          setPendingMarkerCoords(null);
        }}
        onSuccess={() => {
          loadMarkerData();
          console.log('구직 마커 등록 성공');
        }}
        initialCoords={pendingMarkerType === 'teacher' ? pendingMarkerCoords : null}
        onRequestMapClick={(callback) => {
          setIsTeacherModalOpen(false);
          setPendingMarkerType('teacher');
          setMapClickMode(true);
          mapClickCallbackRef.current = (coords) => {
            setPendingMarkerCoords(coords);
            setIsTeacherModalOpen(true);
            callback(coords);
          };
        }}
      />

      {/* 프로그램 마커 등록 모달 */}
      <ProgramMarkerModal
        isOpen={isProgramModalOpen}
        onClose={() => {
          setIsProgramModalOpen(false);
          setPendingMarkerCoords(null);
        }}
        onSuccess={() => {
          loadMarkerData();
          console.log('프로그램 마커 등록 성공');
        }}
        initialCoords={pendingMarkerType === 'program' ? pendingMarkerCoords : null}
        onRequestMapClick={(callback) => {
          setIsProgramModalOpen(false);
          setPendingMarkerType('program');
          setMapClickMode(true);
          mapClickCallbackRef.current = (coords) => {
            setPendingMarkerCoords(coords);
            setIsProgramModalOpen(true);
            callback(coords);
          };
        }}
      />

      {/* 전체화면 위치 선택기 */}
      <FullScreenLocationPicker
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        markerType={locationPickerType}
        onConfirm={(coords) => {
          setIsLocationPickerOpen(false);
          setPendingMarkerCoords(coords);
          // 모달이 참조하는 타입 설정
          setPendingMarkerType(locationPickerType);

          // 해당 모달 열기
          if (locationPickerType === 'teacher') {
            setIsTeacherModalOpen(true);
          } else {
            setIsProgramModalOpen(true);
          }
        }}
      />

      {/* 하단 중앙: 컨트롤 바 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <BottomControlBar
          activeLayers={activeLayers}
          onToggleLayer={toggleLayer}
          onTeacherMarkerClick={() => {
            if (authStatus !== 'authenticated') {
              setShowLoginPrompt(true);
              return;
            }
            // 전체화면 위치 선택 먼저 열기
            setLocationPickerType('teacher');
            setIsLocationPickerOpen(true);
          }}
          onProgramMarkerClick={() => {
            if (authStatus !== 'authenticated') {
              setShowLoginPrompt(true);
              return;
            }
            // 전체화면 위치 선택 먼저 열기
            setLocationPickerType('program');
            setIsLocationPickerOpen(true);
          }}
        />
      </div>

      {/* 우측 하단: 로그인/회원가입 또는 프로필 버튼 */}
      <div className="absolute bottom-4 right-4 z-20">
        {user ? (
          <ProfileButton />
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAuthModalInitialTab('login');
                setIsAuthModalOpen(true);
              }}
              className="px-4 py-2.5 text-sm text-gray-600 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full hover:bg-white hover:text-gray-900 hover:shadow-md transition-all font-medium active:scale-95"
              style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setAuthModalInitialTab('signup');
                setIsAuthModalOpen(true);
              }}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95"
              style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}
            >
              회원가입
            </button>
          </div>
        )}
      </div>

      {/* 마커 팝업 */}
      {selectedMarker && (
        <MarkerPopup
          type={selectedMarker.type}
          marker={selectedMarker.marker}
          position={selectedMarker.position}
          onClose={() => setSelectedMarker(null)}
        />
      )}

      {/* 왼쪽 패널 컨테이너: 로고 + 카드 목록 + 상세 패널 + 토글 버튼 */}
      <div
        className={`absolute top-4 z-10 flex items-start transition-all duration-300 ease-in-out ${
          isPanelHidden ? '-left-[240px]' : 'left-4'
        }`}
      >
        {/* 왼쪽 패널: 로고 + 필터 + 공고 목록 (한 몸처럼) */}
        <div className="w-[240px] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-32px)]" data-panel="list">

          {/* 로고 영역 - 패널 최상단 */}
          <div className="px-3 py-3 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => {
                // 필터 초기화
                setMapFilters({ schoolLevels: [], subjects: [] });
                setLocationSearchQuery('');
                setActiveLocationFilter(null);
                // 목록 펼치기
                setIsJobListCollapsed(false);
                // 선택된 공고 해제
                setSelectedJob(null);
                // 패널 열기
                setIsPanelHidden(false);
              }}
              className="flex items-center justify-center w-full hover:opacity-80 transition-opacity active:scale-[0.98]"
              aria-label="필터 초기화 및 홈으로"
              title="필터 초기화"
            >
              <img
                src="/logo.png"
                alt="쌤찾기"
                className="h-[68px] w-auto"
              />
            </button>
          </div>

          {/* 필터 영역 */}
          <div className="px-3 py-3 border-b border-gray-100 flex-shrink-0 space-y-2.5">
            {/* 필터 드롭다운 버튼들 (먼저 표시) */}
            <div className="flex gap-2">
              {/* 학교급 드롭다운 */}
              <div className="relative filter-dropdown flex-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === 'schoolLevel' ? null : 'schoolLevel');
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center justify-between gap-1 transition-all active:scale-[0.98] ${
                    openDropdown === 'schoolLevel'
                      ? 'bg-[#5B6EF7]/15 border-[#5B6EF7] text-[#5B6EF7] shadow-sm'
                      : mapFilters.schoolLevels.length > 0
                        ? 'bg-[#5B6EF7]/10 border-[#5B6EF7] text-[#5B6EF7]'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  aria-expanded={openDropdown === 'schoolLevel'}
                  aria-haspopup="listbox"
                >
                  <span className="truncate">
                    {mapFilters.schoolLevels.length > 0
                      ? `학교급 (${mapFilters.schoolLevels.length})`
                      : '학교급'}
                  </span>
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${openDropdown === 'schoolLevel' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'schoolLevel' && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5">
                    {SCHOOL_LEVELS.map(level => (
                      <label
                        key={level}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={mapFilters.schoolLevels.includes(level)}
                          onChange={() => toggleMapFilter('schoolLevels', level)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#5B6EF7] focus:ring-[#5B6EF7]"
                        />
                        <span className="text-gray-700">{level}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 과목 드롭다운 */}
              <div className="relative filter-dropdown flex-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === 'subject' ? null : 'subject');
                  }}
                  className={`w-full px-3 py-2 text-xs rounded-lg border flex items-center justify-between gap-1 transition-all active:scale-[0.98] ${
                    openDropdown === 'subject'
                      ? 'bg-[#5B6EF7]/15 border-[#5B6EF7] text-[#5B6EF7] shadow-sm'
                      : mapFilters.subjects.length > 0
                        ? 'bg-[#5B6EF7]/10 border-[#5B6EF7] text-[#5B6EF7]'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  aria-expanded={openDropdown === 'subject'}
                  aria-haspopup="listbox"
                >
                  <span className="truncate">
                    {mapFilters.subjects.length > 0
                      ? `과목 (${mapFilters.subjects.length})`
                      : '과목'}
                  </span>
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${openDropdown === 'subject' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'subject' && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5 max-h-[200px] overflow-y-auto">
                    {MAP_FILTER_SUBJECTS.map(subject => (
                      <label
                        key={subject}
                        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={mapFilters.subjects.includes(subject)}
                          onChange={() => toggleMapFilter('subjects', subject)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#5B6EF7] focus:ring-[#5B6EF7]"
                        />
                        <span className="text-gray-700">{subject}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 검색 (필터 아래에 표시) */}
            <div className="relative">
              {activeLocationFilter ? (
                <div className="w-full px-3 py-2 text-sm border border-[#5B6EF7] bg-[#5B6EF7]/10 rounded-lg flex items-center justify-between">
                  <span className="text-[#5B6EF7] font-medium truncate">{activeLocationFilter}</span>
                  <button
                    onClick={clearLocationFilter}
                    className="ml-1 p-1.5 text-[#5B6EF7] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0 active:scale-95"
                    aria-label="필터 해제"
                    title="필터 해제"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="검색 (지역, 학교명)"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B6EF7] pr-9"
                  />
                  <button
                    onClick={handleLocationSearch}
                    disabled={isLocationSearching}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#5B6EF7] hover:bg-gray-100 rounded-md transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isLocationSearching ? "검색 중..." : "검색"}
                    title={isLocationSearching ? "검색 중..." : "검색"}
                  >
                    {isLocationSearching ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 히어로 카드 - 브랜딩 영역 (캐러셀) */}
          <HeroCard />

          {/* 공고 목록 헤더 - 항상 표시 */}
          <div
            className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsJobListCollapsed(!isJobListCollapsed)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">공고 목록</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {activeLayers.includes('job') ? filteredJobPostings.length : 0}개
                </span>
                <div
                  className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600"
                  aria-label={isJobListCollapsed ? '목록 펼치기' : '목록 접기'}
                >
                  {isJobListCollapsed ? (
                    <ChevronDown size={18} strokeWidth={2.5} />
                  ) : (
                    <ChevronUp size={18} strokeWidth={2.5} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 공고 카드 목록 (job 레이어 활성화 시만 표시) */}
          {activeLayers.includes('job') && (
          <div
            className={`overflow-y-auto transition-all duration-300 ease-in-out ${
              isJobListCollapsed ? 'max-h-0 opacity-0' : 'flex-1 opacity-100'
            }`}
            style={{ minHeight: isJobListCollapsed ? 0 : undefined }}
          >
            {isJobsLoading ? (
              <ListSkeleton count={5} />
            ) : filteredJobPostings.length === 0 ? (
              <EmptyState
                type="filter"
                title="조건에 맞는 공고가 없어요"
                description="필터를 조정하거나 다른 지역을 선택해 보세요"
                size="sm"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredJobPostings.map((job) => (
                  <div
                    key={job.id}
                    className={`group relative p-4 cursor-pointer transition-colors border-l-4 border-l-transparent ${selectedJob?.id === job.id
                      ? 'bg-blue-50 !border-l-[#5B6EF7]'
                      : 'hover:bg-gray-50'
                      }`}
                    onClick={() => handleCardClick(job)}
                  >
                    {/* 기관명 + D-day (카드와 동일한 색상 시스템) */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500 truncate flex-1">
                        {job.organization || '기관 정보 없음'}
                      </span>
                      {job.daysLeft !== undefined && job.daysLeft <= 5 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1.5 ${
                          job.daysLeft === 0
                            ? 'bg-red-500 text-white'
                            : job.daysLeft <= 3
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}>
                          {job.daysLeft === 0 ? 'D-Day' : `D-${job.daysLeft}`}
                        </span>
                      )}
                    </div>

                    {/* 제목 + 태그 병기 */}
                    <h5 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-2">
                      {job.title}
                      {job.tags && job.tags.length > 0 && (
                        <span className="font-normal text-gray-500">
                          {' '}({job.tags.slice(0, 2).join(', ')}{job.tags.length > 2 ? ' 외' : ''})
                        </span>
                      )}
                    </h5>

                    {/* 상세 정보: 위치, 보수, 마감일 */}
                    <div className="space-y-1 text-xs text-gray-600">
                      {job.location && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{job.location}</span>
                        </div>
                      )}
                      {job.compensation && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="truncate">{job.compensation}</span>
                        </div>
                      )}
                      {job.deadline && (
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{(() => {
                            // 마감일에서 요일 계산 (예: "01.12" -> "01.12(일)")
                            const deadlineStr = job.deadline.replace(/^~\s*/, '').trim();
                            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                            // MM.DD 또는 YYYY.MM.DD 형식 파싱
                            const parts = deadlineStr.split('.');
                            if (parts.length >= 2) {
                              const year = parts.length === 3 ? parseInt(parts[0]) : new Date().getFullYear();
                              const month = parseInt(parts.length === 3 ? parts[1] : parts[0]) - 1;
                              const day = parseInt(parts.length === 3 ? parts[2] : parts[1]);
                              const date = new Date(year, month, day);
                              if (!isNaN(date.getTime())) {
                                const dayOfWeek = dayNames[date.getDay()];
                                return `${deadlineStr}(${dayOfWeek})`;
                              }
                            }
                            return deadlineStr;
                          })()}</span>
                        </div>
                      )}
                    </div>

                    {/* 호버 시 길찾기 버튼 - 테마 컬러 사용 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDirectionsClick(job);
                      }}
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-800 text-white text-xs font-semibold rounded-lg shadow-md flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      길찾기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

        </div>

        {/* 상세 패널 - 카드 목록 옆에 배치 (flex 아이템) */}
        {selectedJob && (
          <div data-panel="detail">
            {console.log('[Hero] 🎨 JobDetailPanel 렌더링 중, job:', selectedJob.title)}
            <JobDetailPanel
              job={selectedJob}
              isOpen={!!selectedJob}
              onClose={() => setSelectedJob(null)}
              onDirectionsClick={handleDirectionsClick}
            />
          </div>
        )}

        {/* 패널 접기/펼치기 토글 버튼 (네이버 지도 스타일 탭) */}
        <button
          onClick={() => setIsPanelHidden(!isPanelHidden)}
          className="self-center -ml-[1px] flex items-center justify-center w-5 h-14 bg-white border border-gray-200 border-l-0 rounded-r-md shadow-sm hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label={isPanelHidden ? '패널 펼치기' : '패널 접기'}
          title={isPanelHidden ? '패널 펼치기' : '패널 접기'}
        >
          {isPanelHidden ? (
            <ChevronRight size={14} strokeWidth={2} className="text-gray-400" />
          ) : (
            <ChevronLeft size={14} strokeWidth={2} className="text-gray-400" />
          )}
        </button>
      </div>

      {/* 길찾기 패널 - 사이드 패널 방식 (상세 패널 옆에 위치) */}
      <AnimatePresence>
        {directionsJob && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute top-4 z-20"
            data-panel="directions"
            style={{
              // 패널 숨김 시: 16px, 패널 보임 시: 카드목록(240px) + 토글버튼(20px) + gap(12px) + 상세패널(260px, 있을 때) + gap(12px) = 위치
              left: isPanelHidden
                ? '16px'
                : selectedJob
                  ? 'calc(16px + 240px + 20px + 12px + 260px + 12px)'
                  : 'calc(16px + 240px + 20px + 12px)'
            }}
          >
            <DirectionsPanel
              job={directionsJob}
              destinationCoords={directionsCoords}
              onClose={handleDirectionsClose}
              onRouteFound={handleRouteFound}
              onRequestMapClick={(callback) => {
                setMapClickMode(true);
                mapClickCallbackRef.current = callback;
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
