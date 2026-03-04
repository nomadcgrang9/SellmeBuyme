import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';
import { fetchJobsByBoardRegion } from '@/lib/supabase/queries';
import { getGeocacheBatch, saveGeocache } from '@/lib/supabase/geocache';
import type { JobPostingCard } from '@/types';
import type { Coordinates, DirectionsResult, TransportType } from '@/types/directions';
import { getDirections } from '@/lib/api/directions';
import { JobDetailPanel } from './JobDetailPanel';
import { TeacherDetailPanel } from './TeacherDetailPanel';
import { InstructorDetailPanel } from './InstructorDetailPanel';
import HeroCard from './HeroCard';
import { DirectionsPanel } from '@/components/directions/DirectionsPanel';
import TeacherMarkerModal from '@/components/map/TeacherMarkerModal';
import ProgramMarkerModal from '@/components/map/ProgramMarkerModal';
import JobPostingModal from '@/components/job/JobPostingModal';
import FullScreenLocationPicker from '@/components/map/FullScreenLocationPicker';
import CascadingFilterBarWithLayerToggle from '@/components/map/CascadingFilterBarWithLayerToggle';
import LayerToggleBar from '@/components/map/LayerToggleBar';
import { type CascadingFilter, matchesCascadingFilter } from '@/lib/utils/jobClassifier';
import MarkerPopup from '@/components/map/MarkerPopup';
import AuthModal from '@/components/auth/AuthModal';
import ProfileButton from '@/components/auth/ProfileButton';
import ProfileModal from '@/components/auth/ProfileModal';
import EmptyState from '@/components/common/EmptyState';
import { ListSkeleton } from '@/components/common/CardSkeleton';
import { getSchoolLevelFromJob, generateSchoolLevelMarker, MARKER_SIZE, URGENT_MARKER_SIZE, SCHOOL_LEVEL_MARKER_COLORS, generateTeacherMarkerSVG, TEACHER_MARKER_SIZE, generateInstructorMarkerSVG, INSTRUCTOR_MARKER_SIZE, getSupabaseThumbnailUrl, renderProfileMarkerToDataURL } from '@/lib/constants/markerColors';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';

// 모바일 전용 컴포넌트
import MobileBottomSheet from '@/components/mobile/MobileBottomSheet';
import MobileSearchBar from '@/components/mobile/MobileSearchBar';
import MobileQuickFilters from '@/components/mobile/MobileQuickFilters';
import MobileJobCard from '@/components/mobile/MobileJobCard';
import MobileTeacherCard from '@/components/mobile/MobileTeacherCard';
import MobileInstructorCard from '@/components/mobile/MobileInstructorCard';
import MobileJobDetail from '@/components/mobile/MobileJobDetail';
import MobileTeacherDetail from '@/components/mobile/MobileTeacherDetail';
import MobileInstructorDetail from '@/components/mobile/MobileInstructorDetail';
import LocationPermissionModal from '@/components/mobile/LocationPermissionModal';
import DirectionsUnifiedSheet from '@/components/mobile/DirectionsUnifiedSheet';
import MobileRegisterNav from '@/components/mobile/MobileRegisterNav';
import ComingSoonModal from '@/components/common/ComingSoonModal';
import InstructorInfoModal from '@/components/mobile/InstructorInfoModal';
import InstructorMarkerModal from '@/components/map/InstructorMarkerModal';
import FloatingLocationButton from '@/components/map/FloatingLocationButton';
import DesktopWaglePanel from '@/components/wagle/DesktopWaglePanel';
import DesktopChatPanel from '@/components/chat/DesktopChatPanel';
import FavoritesPanel from '@/components/bookmark/FavoritesPanel';
import { useWagleStore } from '@/stores/wagleStore';
import { useChatStore } from '@/stores/chatStore';
import { useSidePanelStore } from '@/stores/sidePanelStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { fetchUserBookmarkIds } from '@/lib/supabase/queries';

// 간단한 debounce 유틸리티
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
  return debounced as T & { cancel: () => void };
}

// Window 전역 타입 정의
declare global {
  interface Window {
    selectJobFromMarker?: (jobId: string) => void;
    __currentFilteredJobPostings?: JobPostingCard[];
    __currentSelectedJobId?: string | null;
  }
}

// 전국 17개 광역시도 (줌 레벨 13+ 전국 축척에서 전체 로드용)
const ALL_PROVINCES = [
  '서울', '경기', '인천', '강원',
  '부산', '대구', '광주', '대전', '울산', '세종',
  '충북', '충남',
  '전북', '전남',
  '경북', '경남',
  '제주'
];
// 전국 축척 줌 레벨 기준 (Kakao Maps에서 13 이상이면 전국이 다 보임)
const NATIONAL_ZOOM_LEVEL = 13;
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { fetchTeacherMarkers, fetchProgramMarkers } from '@/lib/supabase/markers';
import { fetchInstructorMarkers } from '@/lib/supabase/instructorMarkers';
import { deleteJobPosting } from '@/lib/supabase/jobPostings';
import { type MarkerLayer, type TeacherMarker, type ProgramMarker, MARKER_COLORS, getTeacherMarkerColor, CATEGORY_MARKER_COLORS, type PrimaryCategory } from '@/types/markers';
import { type InstructorMarker, INSTRUCTOR_MARKER_COLORS } from '@/types/instructorMarkers';
import { useAutoScaleMap } from '@/hooks/useAutoScaleMap';
import TermsAgreementModal from '@/components/auth/TermsAgreementModal';
import PopupBannerModal from '@/components/popup/PopupBannerModal';
import CardBannerItem from '@/components/cards/CardBannerItem';
import { getNativeBannerConfig, getNativeBanners } from '@/lib/supabase/hero-banner';
import type { NativeBannerConfig, NativeBanner } from '@/types/hero-banner';
import { fetchUserProfile } from '@/lib/supabase/profiles';

// ============================================
// 지역별 SEO 좌표 및 메타 정보
// ============================================
const REGION_SEO_DATA: Record<string, {
  coords: { lat: number; lng: number };
  zoom: number;
  title: string;
  description: string;
}> = {
  seoul: { coords: { lat: 37.5665, lng: 126.9780 }, zoom: 8, title: '서울시 교육청 채용공고', description: '서울시 학교, 교육청 채용정보를 실시간으로 확인하세요' },
  gyeonggi: { coords: { lat: 37.4138, lng: 127.5183 }, zoom: 9, title: '경기도 교육청 채용공고', description: '경기도 내 학교, 교육청 채용정보를 실시간으로 확인하세요' },
  incheon: { coords: { lat: 37.4563, lng: 126.7052 }, zoom: 10, title: '인천 교육청 채용공고', description: '인천광역시 학교, 교육청 채용정보를 실시간으로 확인하세요' },
  hwaseong: { coords: { lat: 37.1996, lng: 126.8312 }, zoom: 11, title: '화성시 교육청 채용', description: '화성시 학교 채용정보를 실시간으로 확인하세요' },
  suwon: { coords: { lat: 37.2636, lng: 127.0286 }, zoom: 11, title: '수원 교육청 채용공고', description: '수원시 학교, 교육청 채용정보를 실시간으로 확인하세요' },
  yongin: { coords: { lat: 37.2411, lng: 127.1776 }, zoom: 11, title: '용인 교육청 채용공고', description: '용인시 학교 채용정보를 실시간으로 확인하세요' },
  seongnam: { coords: { lat: 37.4201, lng: 127.1265 }, zoom: 11, title: '성남 교육청 채용공고', description: '성남시, 분당 학교 채용정보를 실시간으로 확인하세요' },
  busan: { coords: { lat: 35.1796, lng: 129.0756 }, zoom: 10, title: '부산 교육청 채용공고', description: '부산광역시 학교, 교육청 채용정보를 실시간으로 확인하세요' },
  bucheon: { coords: { lat: 37.5034, lng: 126.7660 }, zoom: 11, title: '부천 교육청 채용공고', description: '부천시 학교 채용정보를 실시간으로 확인하세요' },
  goyang: { coords: { lat: 37.6564, lng: 126.8350 }, zoom: 11, title: '고양 교육청 채용공고', description: '고양시, 일산 학교 채용정보를 실시간으로 확인하세요' },
};

export const Hero: React.FC = () => {
  // URL 파라미터 (지역 SEO용) - native URLSearchParams 사용
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const regionParam = searchParams.get('region');

  // 캐스케이딩 필터 상태 (1차/2차/3차)
  const [cascadingFilter, setCascadingFilter] = useState<CascadingFilter>({
    primary: null,
    secondary: null,
    tertiary: null,
  });

  // 선택된 공고 (상세 패널용)
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);
  const setSelectedJobRef = useRef(setSelectedJob);

  // 선택된 구직자/강사 (상세 패널용)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherMarker | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorMarker | null>(null);
  const setShowMobileDetailRef = useRef<(show: boolean) => void>(() => { });

  // selectedJob 변경 감지 디버깅 + 전역 변수 동기화 (마커 토글용)
  useEffect(() => {
    // 전역 변수에 현재 선택된 공고 ID 저장 (selectJobFromMarker 토글 체크용)
    (window as any).__currentSelectedJobId = selectedJob?.id ?? null;
  }, [selectedJob]);


  // 길찾기 관련 상태
  const [directionsJob, setDirectionsJob] = useState<JobPostingCard | null>(null);
  const [directionsCoords, setDirectionsCoords] = useState<Coordinates | null>(null);
  const polylineRef = useRef<any>(null);

  // 길찾기 전용 마커 (출발/도착)
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);

  // 지도 클릭 모드 (출발지 선택용)
  const [mapClickMode, setMapClickMode] = useState(false);
  const mapClickCallbackRef = useRef<((coords: Coordinates) => void) | null>(null);

  // 마커 등록 관련 상태
  const { user, status: authStatus } = useAuthStore();
  const { showToast } = useToastStore();
  const isWagleDrawerOpen = useWagleStore(s => s.isDesktopPanelOpen);
  const isChatPanelOpen = useChatStore(s => s.isDesktopPanelOpen);
  const activeSidePanel = useSidePanelStore(s => s.activePanel);

  // 즐겨찾기 패널 상태
  const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);
  const openFavoritesDrawer = useCallback(() => {
    setIsFavoritesPanelOpen(true);
  }, []);

  // 공고 수정용 상태
  const [editJobData, setEditJobData] = useState<JobPostingCard | null>(null);

  // 레이어 표시 상태 (공고/구직자/교원연수강사)
  // 모두 false = 모든 마커 표시 (기본 상태)
  const [showJobLayer, setShowJobLayer] = useState(false);
  const [showSeekerLayer, setShowSeekerLayer] = useState(false);
  const [showInstructorLayer, setShowInstructorLayer] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isJobPostingModalOpen, setIsJobPostingModalOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [locationPickerType, setLocationPickerType] = useState<'teacher' | 'program' | 'jobPosting' | 'instructor'>('teacher');
  const [pendingMarkerCoords, setPendingMarkerCoords] = useState<Coordinates | null>(null);
  const [pendingMarkerAddress, setPendingMarkerAddress] = useState<string>('');
  const [pendingMarkerType, setPendingMarkerType] = useState<'teacher' | 'program' | 'jobPosting' | 'instructor' | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'signup'>('login');

  // 로그인 후 이어갈 액션 (구직등록/공고등록/교원연수 플로우 연속성)
  const [pendingAction, setPendingAction] = useState<'register' | 'jobPost' | 'instructor' | null>(null);

  // 프로필 모달 상태
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // 구현 예정(Coming Soon) 모달 상태
  const [comingSoonFeature, setComingSoonFeature] = useState('');
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  // 교원연수 강사등록 안내 모달 상태
  const [isInstructorModalOpen, setIsInstructorModalOpen] = useState(false);
  // 교원연수 강사등록 실제 모달 상태
  const [isInstructorRegisterModalOpen, setIsInstructorRegisterModalOpen] = useState(false);

  // 좌측 패널: 통합 목록 (탭 분리 없음 - 지도와 1:1 동기화)

  // ★ 로그인 성공 후 pendingAction 처리 (등록 플로우 이어가기)
  useEffect(() => {
    if (user && pendingAction && !isAuthModalOpen) {
      if (pendingAction === 'register') {
        setPendingAction(null);
        useSidePanelStore.getState().openPanel('register');
      } else if (pendingAction === 'jobPost') {
        setPendingAction(null);
        useSidePanelStore.getState().openPanel('jobPost');
      } else if (pendingAction === 'instructor') {
        setPendingAction(null);
        useSidePanelStore.getState().openPanel('instructor');
      }
    }
  }, [user, pendingAction, isAuthModalOpen]);



  // 약관동의 모달 상태
  const [needsTermsAgreement, setNeedsTermsAgreement] = useState(false);

  // 카드배너 상태
  const [cardBannerConfig, setCardBannerConfig] = useState<NativeBannerConfig | null>(null);
  const [cardBanners, setCardBanners] = useState<NativeBanner[]>([]);

  // 로그인 사용자 약관동의 여부 체크
  useEffect(() => {
    if (authStatus !== 'authenticated' || !user) {
      return;
    }

    // 1. localStorage 영구 플래그 체크 (이미 동의한 사용자)
    const localAgreed = localStorage.getItem(`termsAgreed_${user.id}`);
    if (localAgreed === 'true') {
      return;
    }

    // 2. AuthCallback에서 세팅한 플래그 (신규 가입자)
    const flagFromCallback = sessionStorage.getItem('needsTermsAgreement');
    if (flagFromCallback === 'true') {
      setNeedsTermsAgreement(true);
      return;
    }

    // 3. DB에서 약관동의 여부 확인
    void fetchUserProfile(user.id).then(({ data, error }) => {
      if (error) {
        console.error('[Terms] 프로필 조회 실패:', error);
        return;
      }
      // data가 null(프로필 없음)이거나 agree_terms가 false/null이면 모달 표시
      if (!data || !data.agree_terms) {
        setNeedsTermsAgreement(true);
      } else {
        // DB에 동의 기록이 있으면 localStorage에도 저장 (다음 로드 시 빠른 체크)
        localStorage.setItem(`termsAgreed_${user.id}`, 'true');
      }
    });
  }, [user, authStatus]);

  // ===== 모바일 전용 상태 =====
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showMobileTeacherDetail, setShowMobileTeacherDetail] = useState(false);
  const [showMobileInstructorDetail, setShowMobileInstructorDetail] = useState(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState<'collapsed' | 'half' | 'full'>('collapsed');

  // setSelectedJob, setShowMobileDetail ref 업데이트 (마커 클릭에서 사용)
  useEffect(() => {
    setSelectedJobRef.current = setSelectedJob;
    setShowMobileDetailRef.current = setShowMobileDetail;
  }, [setSelectedJob, setShowMobileDetail]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  // (모바일은 cascadingFilter 공유)
  const [isLocating, setIsLocating] = useState(false);
  const locationPermissionCheckedRef = useRef(false);

  // 모바일 길찾기 상태
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
  const showDirectionsSheetRef = useRef(false); // ★ 마커 생성 시 참조용 ref
  const [startLocation, setStartLocation] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);
  const [endLocation, setEndLocation] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);
  const [transportType, setTransportType] = useState<TransportType>('car');
  const [directionsResult, setDirectionsResult] = useState<DirectionsResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // ★ endLocation 변경 추적 (디버깅용)
  useEffect(() => {
  }, [endLocation]);

  // ★ showDirectionsSheet ref 동기화 (마커 생성 시 참조)
  useEffect(() => {
    showDirectionsSheetRef.current = showDirectionsSheet;
  }, [showDirectionsSheet]);

  // ★ 모바일 길찾기: startLocation 설정 시 경로 검색 실행
  useEffect(() => {

    if (!startLocation || !endLocation) {
      return;
    }

    // 좌표 유효성 검증 (0,0 또는 NaN 체크)
    const isValidCoord = (lat: number, lng: number) => {
      return lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    if (!isValidCoord(startLocation.lat, startLocation.lng)) {
      console.error('[Hero] 출발지 좌표 유효하지 않음:', startLocation);
      return;
    }
    if (!isValidCoord(endLocation.lat, endLocation.lng)) {
      console.error('[Hero] 도착지 좌표 유효하지 않음:', endLocation);
      alert('도착지 좌표를 찾을 수 없습니다. 길찾기를 다시 시도해주세요.');
      setShowDirectionsSheet(false);
      setEndLocation(null);
      setStartLocation(null);
      return;
    }


    const searchRoute = async () => {
      setIsLoadingRoute(true);
      setDirectionsResult(null);

      try {
        const result = await getDirections(
          transportType,
          { lat: startLocation.lat, lng: startLocation.lng },
          { lat: endLocation.lat, lng: endLocation.lng }
        );
        setDirectionsResult(result);
      } catch (error) {
        console.error('[Hero] 경로 검색 실패:', error);
        setDirectionsResult(null);
      } finally {
        setIsLoadingRoute(false);
      }
    };

    searchRoute();
  }, [startLocation, endLocation, transportType]);

  // ★ 경로 검색 성공 시 지도 자동 포커싱 (출발지/도착지 모두 포함)
  useEffect(() => {
    if (!startLocation || !endLocation || !mapInstanceRef.current || !window.kakao) {
      return;
    }


    // 출발지와 도착지를 포함하는 bounds 계산
    const bounds = new window.kakao.maps.LatLngBounds();
    bounds.extend(new window.kakao.maps.LatLng(startLocation.lat, startLocation.lng));
    bounds.extend(new window.kakao.maps.LatLng(endLocation.lat, endLocation.lng));

    // 지도를 bounds에 맞춰 이동 (모달 높이 고려한 padding)
    // padding: top, right, bottom, left
    // 하단 350px = 모달 높이(~300px) + 여유(50px)
    mapInstanceRef.current.setBounds(bounds, 100, 80, 350, 80);

  }, [startLocation, endLocation]);

  // ★ 경로 결과 받으면 지도에 폴리라인 그리기
  useEffect(() => {
    if (!directionsResult || !mapInstanceRef.current || !window.kakao) {
      return;
    }


    // 기존 폴리라인 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // path가 없으면 스킵
    if (!directionsResult.path || directionsResult.path.length === 0) {
      return;
    }

    // Coordinates[] → kakao.maps.LatLng[]
    const linePath = directionsResult.path.map(
      (coord) => new window.kakao.maps.LatLng(coord.lat, coord.lng)
    );

    // 교통수단별 색상
    const strokeColor = directionsResult.type === 'car' ? '#3366FF' :
      directionsResult.type === 'transit' ? '#00AA00' :
        '#FF6600';

    // 폴리라인 생성
    const polyline = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 5,
      strokeColor: strokeColor,
      strokeOpacity: 0.8,
      strokeStyle: 'solid'
    });

    polyline.setMap(mapInstanceRef.current);
    polylineRef.current = polyline;

  }, [directionsResult]);

  // ★ 출발/도착 마커 생성 (방안 3: 심플 원형)
  useEffect(() => {
    if (!startLocation || !endLocation || !mapInstanceRef.current || !window.kakao) {
      return;
    }


    // 기존 마커 제거
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.setMap(null);
      endMarkerRef.current = null;
    }

    // 출발 마커 (하늘색 원형)
    const startMarkerContent = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #33A9FF 0%, #1E90FF 100%);
        border: 3px solid #0066CC;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(30, 144, 255, 0.4);
        cursor: pointer;
      ">
        <span style="color: white; font-weight: bold; font-size: 14px;">출발</span>
      </div>
    `;

    const startCustomOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(startLocation.lat, startLocation.lng),
      content: startMarkerContent,
      yAnchor: 0.5,
      zIndex: 100
    });

    startCustomOverlay.setMap(mapInstanceRef.current);
    startMarkerRef.current = startCustomOverlay;

    // 도착 마커 (주황색 원형)
    const endMarkerContent = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FF6B35 0%, #FF5722 100%);
        border: 3px solid #D32F2F;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(255, 87, 34, 0.4);
        cursor: pointer;
      ">
        <span style="color: white; font-weight: bold; font-size: 14px;">도착</span>
      </div>
    `;

    const endCustomOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(endLocation.lat, endLocation.lng),
      content: endMarkerContent,
      yAnchor: 0.5,
      zIndex: 100
    });

    endCustomOverlay.setMap(mapInstanceRef.current);
    endMarkerRef.current = endCustomOverlay;

  }, [startLocation, endLocation]);

  // 마커 레이어 토글 상태
  const [activeLayers, setActiveLayers] = useState<MarkerLayer[]>(['job', 'teacher', 'program']);
  const [teacherMarkers, setTeacherMarkers] = useState<TeacherMarker[]>([]);
  const [programMarkers, setProgramMarkers] = useState<ProgramMarker[]>([]);
  const [instructorMarkers, setInstructorMarkers] = useState<InstructorMarker[]>([]);
  const [editingTeacherMarker, setEditingTeacherMarker] = useState<TeacherMarker | null>(null);
  const [editingInstructorMarker, setEditingInstructorMarker] = useState<InstructorMarker | null>(null);
  const teacherMapMarkersRef = useRef<any[]>([]);
  const programMapMarkersRef = useRef<any[]>([]);
  const instructorMapMarkersRef = useRef<any[]>([]);

  // ★ showJobLayer/showSeekerLayer/showInstructorLayer ↔ activeLayers 동기화
  // 모두 false면 모든 마커 표시 (기본 상태)
  // 하나라도 true면 선택된 레이어만 표시
  useEffect(() => {
    setActiveLayers(() => {
      // 모두 미선택 = 필터 없음 = 모든 마커 표시 (instructor 제외 - 별도 관리)
      if (!showJobLayer && !showSeekerLayer && !showInstructorLayer) {
        return ['job', 'teacher', 'program'];
      }

      const newLayers: MarkerLayer[] = [];

      // 공고 레이어
      if (showJobLayer) {
        newLayers.push('job');
      }

      // 구직자 레이어 (teacher)
      if (showSeekerLayer) {
        newLayers.push('teacher');
      }

      // program은 기본 포함 (showJobLayer 선택 시)
      if (showJobLayer) {
        newLayers.push('program');
      }

      return newLayers;
    });
  }, [showJobLayer, showSeekerLayer, showInstructorLayer]);

  // ★ 모든 레이어 토글이 OFF가 되면 필터 초기화 (기본 상태 복원)
  useEffect(() => {
    if (!showJobLayer && !showSeekerLayer && !showInstructorLayer) {
      // 모든 토글 OFF → 필터 초기화하여 기본 카테고리 UI 복원
      setCascadingFilter({ primary: null, secondary: null, tertiary: null });
    }
  }, [showJobLayer, showSeekerLayer, showInstructorLayer]);

  // ★ 길찾기 모드 토글 (공고 마커 숨김/복원)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (showDirectionsSheet) {
      // 길찾기 모드: 모든 공고 마커 숨김
      mapMarkersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      teacherMapMarkersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      programMapMarkersRef.current.forEach(marker => {
        marker.setMap(null);
      });
    } else {
      // 일반 모드: 공고 마커 복원
      mapMarkersRef.current.forEach(marker => {
        marker.setMap(mapInstanceRef.current);
      });
      if (activeLayers.includes('teacher')) {
        teacherMapMarkersRef.current.forEach(marker => {
          marker.setMap(mapInstanceRef.current);
        });
      }
      if (activeLayers.includes('program')) {
        programMapMarkersRef.current.forEach(marker => {
          marker.setMap(mapInstanceRef.current);
        });
      }

      // 길찾기 종료 시 출발/도착 마커도 제거
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
        startMarkerRef.current = null;
      }
      if (endMarkerRef.current) {
        endMarkerRef.current.setMap(null);
        endMarkerRef.current = null;
      }
      // 폴리라인도 제거
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    }
  }, [showDirectionsSheet, activeLayers]);

  // 로드된 지역 추적 (복수 지역 동시 표시용)
  const loadedRegionsRef = useRef<Set<string>>(new Set());

  // 현재 줌 레벨 추적 (auto-scale 훅용)
  const [currentZoomLevel, setCurrentZoomLevel] = useState(5);
  // 뷰포트 필터 전 공고 수 (auto-scale에서 전국 검색 판단용)
  const totalFilteredCountRef = useRef(0);

  // 자동 스케일업: 지도 줌/센터 변경 콜백
  const handleAutoScaleMapChange = useCallback((zoom: number, center: { lat: number; lng: number }) => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao?.maps) return;
    map.setLevel(zoom);
    map.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
  }, []);

  // 현재 뷰포트 bounds (줌 인/아웃 시 목록 필터링용)
  const [viewportBounds, setViewportBounds] = useState<{
    sw: { lat: number; lng: number };
    ne: { lat: number; lng: number };
  } | null>(null);

  // 마커 팝업 상태
  const [selectedMarker, setSelectedMarker] = useState<{
    type: 'teacher' | 'program' | 'instructor';
    marker: TeacherMarker | ProgramMarker | InstructorMarker;
    position: { x: number; y: number };
  } | null>(null);

  // 카드 목록 컨테이너 ref (마커 클릭 시 해당 카드로 스크롤용)
  const jobListContainerRef = useRef<HTMLDivElement>(null);

  // 마커 클릭 시 해당 카드로 스크롤하는 함수
  const scrollToJobCard = useCallback((jobId: string) => {
    const cardElement = document.querySelector(`[data-job-id="${jobId}"]`);
    if (cardElement && jobListContainerRef.current) {
      // 카드가 목록 컨테이너 내에서 보이도록 스크롤
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 시각적 하이라이트 효과 (일시적)
      cardElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      setTimeout(() => {
        cardElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  // (필터 토글은 cascadingFilter로 대체)

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
  const [coordsCacheVersion, setCoordsCacheVersion] = useState(0); // 캐시 업데이트 감지용
  const mapMarkersRef = useRef<any[]>([]);
  const coordsCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // 마커-공고 매핑 (마커 클릭 시 상세 패널 열기용)
  const markerJobMapRef = useRef<Map<any, JobPostingCard>>(new Map());

  // 공고ID → 실제 마커 좌표 매핑 (카드 클릭 시 정확한 위치로 이동)
  const jobMarkerCoordsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // 구직자ID → 실제 마커 좌표 매핑 (카드 클릭 시 정확한 위치로 이동)
  const teacherMarkerCoordsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // 강사ID → 실제 마커 좌표 매핑 (카드 클릭 시 정확한 위치로 이동)
  const instructorMarkerCoordsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // 프로필 이미지 마커 렌더링 캐시 (profileUrl_color → dataURL)
  const profileMarkerCacheRef = useRef<Map<string, string>>(new Map());

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

    // ★ 레이어 토글이 활성화되어 있으면 cascadingFilter 무시 (토글로 레이어 제어)
    const anyLayerToggleActive = showJobLayer || showSeekerLayer || showInstructorLayer;

    // 캐스케이딩 필터 적용 (레이어 토글 비활성 상태에서만)
    if (cascadingFilter.primary && !anyLayerToggleActive) {
      filtered = filtered.filter(job => matchesCascadingFilter(job, cascadingFilter));
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

    // auto-scale용: 뷰포트 필터 전 공고 수 저장
    totalFilteredCountRef.current = filtered.length;

    // 뷰포트 기반 필터링 (줌 인/아웃 시 현재 화면에 보이는 공고만 표시)
    if (viewportBounds) {
      const beforeCount = filtered.length;
      let withCoords = 0;
      let withoutCoords = 0;

      filtered = filtered.filter(job => {
        // 선택된 공고는 항상 목록에 포함 (지도 이동 후에도 상세 패널 유지)
        if (selectedJob && job.id === selectedJob.id) {
          return true;
        }

        // 실제 마커 좌표 우선 사용 (중복 마커 오프셋이 적용된 정확한 위치)
        const markerCoords = jobMarkerCoordsRef.current.get(job.id);
        let lat = markerCoords?.lat ?? job.latitude;
        let lng = markerCoords?.lng ?? job.longitude;

        // 마커 좌표도 DB 좌표도 없으면 캐시된 좌표 사용
        if (lat == null || lng == null) {
          const cacheKey = job.organization || job.location || '';
          const cached = coordsCacheRef.current.get(cacheKey);
          if (cached) {
            lat = cached.lat;
            lng = cached.lng;
          }
        }

        // 좌표가 없으면 일단 표시 (마커 생성 전 상태)
        if (lat == null || lng == null) {
          withoutCoords++;
          return true;
        }

        withCoords++;
        // bounds 내에 있는지 확인
        return lat >= viewportBounds.sw.lat && lat <= viewportBounds.ne.lat &&
          lng >= viewportBounds.sw.lng && lng <= viewportBounds.ne.lng;
      });

    }

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPostings, cascadingFilter, activeLocationFilter, deduplicateJobs, viewportBounds, coordsCacheVersion, selectedJob, showJobLayer, showSeekerLayer, showInstructorLayer]);

  // ★ 자동 스케일업 훅 연동
  const {
    checkAndExpand,
    restoreOriginalPosition,
    isExpanded: isAutoScaleExpanded,
    canRestore: canRestorePosition,
    resetExpansionState,
  } = useAutoScaleMap({
    currentMapState: {
      zoom: currentZoomLevel,
      center: mapInstanceRef.current
        ? { lat: mapInstanceRef.current.getCenter().getLat(), lng: mapInstanceRef.current.getCenter().getLng() }
        : { lat: 37.5665, lng: 126.9780 },
    },
    viewportFilteredCount: filteredJobPostings.length,
    totalFilteredCount: totalFilteredCountRef.current,
    primaryCategory: cascadingFilter.primary,
    secondaryCategory: cascadingFilter.secondary,
    onMapStateChange: handleAutoScaleMapChange,
    onShowToast: showToast,
  });

  // 필터 변경 후 뷰포트 결과 부족 시 자동 확장
  useEffect(() => {
    // 필터가 설정되어 있고 결과가 부족할 때만 동작
    if (!cascadingFilter.primary) return;
    if (filteredJobPostings.length >= 3) return;
    // 공고 로딩 중이면 대기
    if (isJobsLoading) return;

    const timer = setTimeout(() => {
      checkAndExpand();
    }, 800); // 지도 이동/로딩 후 안정화 대기

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredJobPostings.length, cascadingFilter.primary, cascadingFilter.secondary, isJobsLoading]);

  // 필터 변경 시 확장 상태 리셋
  useEffect(() => {
    resetExpansionState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascadingFilter.primary, cascadingFilter.secondary, cascadingFilter.tertiary]);

  // ★ 통합 목록: 지도에 보이는 모든 마커 (공고 + 구직자 + 강사)
  // 지도와 1:1 실시간 동기화 - 탭 분리 없이 하나의 목록으로 표시
  type UnifiedItem =
    | { type: 'job'; data: JobPostingCard }
    | { type: 'teacher'; data: TeacherMarker }
    | { type: 'instructor'; data: InstructorMarker };

  const unifiedVisibleItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // 토글 상태 확인: 모두 false면 기본 상태 (전체 표시)
    const anyToggleActive = showJobLayer || showSeekerLayer || showInstructorLayer;

    // 뷰포트 내 좌표 체크 헬퍼
    const isInViewport = (lat: number, lng: number): boolean => {
      if (!viewportBounds) return true; // bounds 없으면 일단 표시
      return lat >= viewportBounds.sw.lat && lat <= viewportBounds.ne.lat &&
        lng >= viewportBounds.sw.lng && lng <= viewportBounds.ne.lng;
    };

    // 1. 공고 (이미 filteredJobPostings에서 viewportBounds 필터링 완료)
    // 기본 상태(토글 없음) 또는 공고만 보기 토글 시 표시
    const shouldShowJobs = !anyToggleActive || showJobLayer;
    if (shouldShowJobs && activeLayers.includes('job')) {
      filteredJobPostings.forEach(job => {
        items.push({ type: 'job', data: job });
      });
    }

    // 2. 구직자 (뷰포트 필터링 적용)
    // 기본 상태(토글 없음) 또는 구직자만 보기 토글 시 표시
    const shouldShowTeachers = !anyToggleActive || showSeekerLayer;
    if (shouldShowTeachers && activeLayers.includes('teacher')) {
      teacherMarkers.forEach(marker => {
        if (marker.latitude != null && marker.longitude != null &&
          isInViewport(marker.latitude, marker.longitude)) {
          items.push({ type: 'teacher', data: marker });
        }
      });
    }

    // 3. 교원연수 강사 (뷰포트 필터링 적용)
    // 기본 상태(토글 없음) 또는 교원연수강사만 보기 토글 시 표시
    const shouldShowInstructors = !anyToggleActive || showInstructorLayer;
    if (shouldShowInstructors) {
      instructorMarkers.forEach(marker => {
        if (marker.latitude != null && marker.longitude != null &&
          isInViewport(marker.latitude, marker.longitude)) {
          items.push({ type: 'instructor', data: marker });
        }
      });
    }


    return items;
  }, [filteredJobPostings, teacherMarkers, instructorMarkers, viewportBounds, activeLayers, showJobLayer, showSeekerLayer, showInstructorLayer]);

  // 모바일 바텀시트 라벨 (토글 상태에 따라 동적)
  const mobileBottomSheetLabel = useMemo(() => {
    const anyToggleActive = showJobLayer || showSeekerLayer || showInstructorLayer;
    if (!anyToggleActive) return '주변 목록';
    const parts: string[] = [];
    if (showJobLayer) parts.push('공고');
    if (showSeekerLayer) parts.push('구직자');
    if (showInstructorLayer) parts.push('강사');
    return parts.join('+');
  }, [showJobLayer, showSeekerLayer, showInstructorLayer]);

  // 카드배너 로드
  useEffect(() => {
    async function loadCardBanners() {
      try {
        const [cfg, banners] = await Promise.all([
          getNativeBannerConfig(),
          getNativeBanners(true), // filterActive = true
        ]);
        if (cfg) setCardBannerConfig(cfg);
        setCardBanners(banners);
      } catch (err) {
        console.error('Failed to load card banners:', err);
      }
    }
    loadCardBanners();
  }, []);

  // 인증 상태 초기화
  const { initialize: initializeAuth } = useAuthStore();
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 로그인 시 북마크 + 채팅 unread count 초기 로드
  const { loadBookmarks } = useBookmarkStore();
  const { loadUnreadCount } = useChatStore();
  useEffect(() => {
    if (!user?.id) {
      loadBookmarks([], 0);
      return;
    }
    // 북마크 ID 로드
    fetchUserBookmarkIds(user.id)
      .then((ids) => loadBookmarks(ids, ids.length))
      .catch(() => loadBookmarks([], 0));
    // 채팅 unread count 로드
    loadUnreadCount();
  }, [user?.id, loadBookmarks, loadUnreadCount]);

  // Load Kakao Maps SDK
  useEffect(() => {
    loadKakaoMaps();
  }, [loadKakaoMaps]);

  // 사용자 현재 위치 획득 (초기 로드 시)
  useEffect(() => {
    // 이미 위치가 설정되어 있으면 스킵
    if (userLocation) return;

    // 캐시된 위치 확인 (24시간 유효)
    const cachedLocation = localStorage.getItem('userLocation');
    if (cachedLocation) {
      try {
        const { lat, lng, timestamp } = JSON.parse(cachedLocation);
        const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000;
        if (isValid && lat && lng) {
          setUserLocation({ lat, lng });
          return;
        }
      } catch (e) {
        // 캐시 파싱 실패 시 무시
      }
    }

    // Geolocation API로 현재 위치 획득
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setUserLocation({ lat, lng });
          // 위치 캐시
          localStorage.setItem('userLocation', JSON.stringify({ lat, lng, timestamp: Date.now() }));
        },
        (error) => {
          // 위치 획득 실패 시 기본 위치 사용 (아무것도 안함 - defaultLocation 사용)
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    }
  }, [userLocation]);

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

  // ★ region 파라미터가 있으면 해당 지역 좌표 사용, 없으면 사용자 위치 또는 기본값
  const getInitialMapCenter = useCallback(() => {
    if (regionParam) {
      const regionData = REGION_SEO_DATA[regionParam.toLowerCase()];
      if (regionData) {
        return regionData.coords;
      }
    }
    return userLocation || defaultLocation;
  }, [regionParam, userLocation]);

  const getInitialZoomLevel = useCallback(() => {
    if (regionParam) {
      const regionData = REGION_SEO_DATA[regionParam.toLowerCase()];
      if (regionData) {
        return regionData.zoom;
      }
    }
    return 5;
  }, [regionParam]);

  const mapCenter = getInitialMapCenter();
  const initialZoomLevel = getInitialZoomLevel();

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const center = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);

    const mapOption = {
      center: center,
      level: initialZoomLevel,
      draggable: true,
      scrollwheel: true,
      disableDoubleClickZoom: false,
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOption);
    mapInstanceRef.current = map;

    // ★ 줌 컨트롤 완전히 제거 (모든 환경에서 표시 안 함)
    // 이유: 사용자 요청으로 인해 줌 컨트롤을 어떤 환경에서도 표시하지 않음

    // 뷰포트 bounds 업데이트 함수
    const updateViewportBounds = () => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      setViewportBounds({
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() }
      });
    };

    // 뷰포트 내 모든 지역의 공고 로드
    const loadRegionsInViewport = (isInitial: boolean = false) => {
      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const currentZoomLevel = map.getLevel();

      // 뷰포트 bounds 업데이트
      updateViewportBounds();

      // ★ 줌 레벨 13 이상 (전국 축척)이면 17개 전 지역 자동 로드
      if (currentZoomLevel >= NATIONAL_ZOOM_LEVEL) {
        let isFirstRegion = true;
        ALL_PROVINCES.forEach(regionName => {
          loadJobPostings(regionName, isInitial && isFirstRegion);
          isFirstRegion = false;
        });
        return;
      }

      // 줌 레벨이 낮으면 기존 5점 샘플링 방식 사용
      const geocoder = new window.kakao.maps.services.Geocoder();

      // 뷰포트의 5개 지점 (네 모서리 + 중앙)에서 지역명 추출
      const points = [
        { lat: sw.getLat(), lng: sw.getLng() }, // 좌하
        { lat: ne.getLat(), lng: ne.getLng() }, // 우상
        { lat: sw.getLat(), lng: ne.getLng() }, // 우하
        { lat: ne.getLat(), lng: sw.getLng() }, // 좌상
        { lat: (sw.getLat() + ne.getLat()) / 2, lng: (sw.getLng() + ne.getLng()) / 2 }, // 중앙
      ];

      const foundRegions = new Set<string>();
      let isFirstRegion = true;

      points.forEach(point => {
        geocoder.coord2RegionCode(point.lng, point.lat, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const region = result[0];
            const regionName = (region.region_1depth_name || '')
              .replace(/특별시$/, '')
              .replace(/광역시$/, '')
              .replace(/특별자치시$/, '')
              .replace(/특별자치도$/, '')
              .replace(/도$/, '');

            if (regionName && !foundRegions.has(regionName)) {
              foundRegions.add(regionName);
              // 초기 로드 시 첫 번째 지역만 replace 모드로 로드
              loadJobPostings(regionName, isInitial && isFirstRegion);
              isFirstRegion = false;
            }
          }
        });
      });
    };

    // Debounced 뷰포트 로딩 (150ms) - 빠른 줌/드래그 시 중복 호출 방지
    const debouncedLoadRegions = debounce(() => {
      loadRegionsInViewport();
    }, 150);

    // 드래그 종료 시 뷰포트 내 지역 로드 + bounds 업데이트
    window.kakao.maps.event.addListener(map, 'dragend', () => {
      debouncedLoadRegions();
    });

    // 줌 레벨 변경 시 뷰포트 내 지역 로드 + bounds 업데이트
    window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
      const level = map.getLevel();
      setCurrentZoomLevel(level);
      debouncedLoadRegions();
    });

    // 초기 로드: 현재 뷰포트(사용자 위치 기반) 지역 로드
    // 지도가 완전히 초기화된 후 로드
    setTimeout(() => {
      loadRegionsInViewport(true);
    }, 100);
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
        mapClickCallbackRef.current(coords);
        mapClickCallbackRef.current = null;
        setMapClickMode(false);
      }
    };

    window.kakao.maps.event.addListener(map, 'click', clickHandler);

    return () => {
      if (window.kakao?.maps?.event) {
        window.kakao.maps.event.removeListener(map, 'click', clickHandler);
      }
    };
  }, [isLoaded, mapClickMode]);

  // 사용자 위치 변경 시 지도 중심 업데이트 (단, URL region 파라미터가 없을 때만)
  useEffect(() => {
    // ★ region 파라미터가 있으면 사용자 위치로 이동하지 않음
    if (regionParam) {
      return;
    }
    if (!mapInstanceRef.current || !userLocation) return;
    const newCenter = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    mapInstanceRef.current.setCenter(newCenter);
  }, [userLocation, regionParam]);

  // ★ URL region 파라미터에 따른 지도 이동 + SEO 설정
  useEffect(() => {
    if (!regionParam) return;

    const regionData = REGION_SEO_DATA[regionParam.toLowerCase()];
    if (!regionData) {
      return;
    }

    // SEO: 페이지 타이틀 변경 (즉시 실행)
    document.title = `${regionData.title} | 학교일자리`;

    // SEO: 메타 description 변경
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', regionData.description);
    }

    // OG 태그도 업데이트
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', `${regionData.title} | 학교일자리`);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', regionData.description);
    }

    // 지도 중심 이동 (지도가 준비될 때까지 retry)
    const moveToRegion = () => {
      if (!mapInstanceRef.current) {
        setTimeout(moveToRegion, 500);
        return;
      }

      const newCenter = new window.kakao.maps.LatLng(regionData.coords.lat, regionData.coords.lng);
      mapInstanceRef.current.setCenter(newCenter);
      mapInstanceRef.current.setLevel(regionData.zoom);
    };

    // 약간의 지연 후 실행 (초기화 완료 대기)
    setTimeout(moveToRegion, 200);
  }, [regionParam]);

  // 공고 로드 함수 (복수 지역 누적 로드)
  const loadJobPostings = async (regionName: string, replace: boolean = false) => {
    // 이미 로드된 지역이면 스킵 (replace 모드가 아닐 때)
    if (!replace && loadedRegionsRef.current.has(regionName)) {
      return;
    }

    try {
      setIsJobsLoading(true);
      const jobs = await fetchJobsByBoardRegion(regionName, 10000);  // 제한 해제 (전체 공고 로드)

      if (replace) {
        // 초기 로드 시 교체
        loadedRegionsRef.current = new Set([regionName]);
        setJobPostings(jobs);
      } else {
        // 지역 이동 시 누적 (중복 제거)
        loadedRegionsRef.current.add(regionName);
        setJobPostings(prev => {
          const existingIds = new Set(prev.map(j => j.id));
          const newJobs = jobs.filter(j => !existingIds.has(j.id));
          return [...prev, ...newJobs];
        });
      }
    } catch (error) {
      console.error('[Hero] 공고 데이터 로드 실패:', error);
    } finally {
      setIsJobsLoading(false);
    }
  };

  // 구직교사/프로그램/교원연수 마커 로드 함수
  const loadMarkerData = useCallback(async () => {
    try {
      const [teachers, programs, instructors] = await Promise.all([
        fetchTeacherMarkers(),
        fetchProgramMarkers(),
        fetchInstructorMarkers()
      ]);
      setTeacherMarkers(teachers);
      setProgramMarkers(programs);
      setInstructorMarkers(instructors);
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

  // 구직교사 마커 지도에 표시 (필터링 + 카테고리별 색상 적용)
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

    // ★ 필터링 적용
    // - 레이어 토글이 하나라도 켜져 있으면 필터 무시 (토글로 레이어 제어)
    // - 모든 토글이 꺼진 상태(기본)에서만 cascadingFilter 적용
    const anyLayerToggleActive = showJobLayer || showSeekerLayer || showInstructorLayer;

    const filteredTeacherMarkers = teacherMarkers.filter(marker => {
      // 레이어 토글이 활성화되어 있으면 필터 무시하고 모두 표시
      if (anyLayerToggleActive) return true;

      // 필터가 없으면 모두 표시
      if (!cascadingFilter.primary) return true;

      // 교원연수 필터는 구직자 마커와 무관 (별도 레이어)
      if (cascadingFilter.primary === '교원연수') return true;

      // primary_category가 필터와 일치하는지 확인
      if (marker.primary_category === cascadingFilter.primary) return true;

      // 하위 호환: school_levels로도 매칭 시도
      // 필터 카테고리에 따른 학교급 매핑
      const categoryToSchoolLevels: Record<string, string[]> = {
        '유치원': ['유치원'],
        '초등담임': ['초등'],
        '교과과목': ['중등', '고등'],
        '비교과': ['중등', '고등'],
        '특수': ['특수'],
        '방과후/돌봄': ['초등', '중등', '고등'],
        '행정·교육지원': ['유치원', '초등', '중등', '고등', '특수'],
      };

      const expectedSchoolLevels = categoryToSchoolLevels[cascadingFilter.primary];
      if (!expectedSchoolLevels) return false;

      // school_levels 배열에서 매칭 확인
      if (marker.school_levels && marker.school_levels.length > 0) {
        return marker.school_levels.some(level =>
          expectedSchoolLevels.includes(level)
        );
      }

      return false;
    });

    // 구직자 마커 좌표 캐시 초기화
    teacherMarkerCoordsRef.current.clear();

    filteredTeacherMarkers.forEach(marker => {
      const position = new window.kakao.maps.LatLng(marker.latitude, marker.longitude);

      // 좌표 저장 (카드 클릭 시 정확한 위치로 이동)
      teacherMarkerCoordsRef.current.set(marker.id, { lat: marker.latitude, lng: marker.longitude });

      // ★ 카테고리별 마커 색상 적용
      const markerColor = getTeacherMarkerColor(marker.primary_category);

      // 커스텀 마커 이미지 (원형 + 사람 아이콘)
      const markerSize = new window.kakao.maps.Size(TEACHER_MARKER_SIZE.width, TEACHER_MARKER_SIZE.height);
      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(generateTeacherMarkerSVG(markerColor))}`,
        markerSize
      );

      // ★ 길찾기 모드일 때는 마커를 지도에 추가하지 않음
      const kakaoMarker = new window.kakao.maps.Marker({
        position,
        map: showDirectionsSheetRef.current ? null : map,
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

    // ★ Progressive enhancement: 프로필 이미지가 있는 마커에 썸네일 적용
    // 1차: 기본 SVG 아이콘으로 즉시 렌더링 (위 forEach)
    // 2차: 비동기로 프로필 이미지 로드 → 마커 아이콘 업데이트
    let aborted = false;
    const markerById = new Map<string, any>();
    filteredTeacherMarkers.forEach((m, i) => markerById.set(m.id, teacherMapMarkersRef.current[i]));

    filteredTeacherMarkers.forEach(marker => {
      if (!marker.profile_image_url) return;

      const markerColor = getTeacherMarkerColor(marker.primary_category);
      const cacheKey = `${marker.profile_image_url}_${markerColor}`;

      // 캐시 히트 → 즉시 적용
      const cached = profileMarkerCacheRef.current.get(cacheKey);
      if (cached) {
        const km = markerById.get(marker.id);
        if (km) {
          km.setImage(new window.kakao.maps.MarkerImage(
            cached,
            new window.kakao.maps.Size(TEACHER_MARKER_SIZE.width, TEACHER_MARKER_SIZE.height)
          ));
        }
        return;
      }

      // Supabase Image Transform으로 80x80 썸네일 URL 생성 → Canvas 렌더링
      const thumbnailUrl = getSupabaseThumbnailUrl(marker.profile_image_url);
      renderProfileMarkerToDataURL(markerColor, thumbnailUrl)
        .then(dataUrl => {
          if (aborted) return;
          profileMarkerCacheRef.current.set(cacheKey, dataUrl);
          const km = markerById.get(marker.id);
          if (km) {
            km.setImage(new window.kakao.maps.MarkerImage(
              dataUrl,
              new window.kakao.maps.Size(TEACHER_MARKER_SIZE.width, TEACHER_MARKER_SIZE.height)
            ));
          }
        })
        .catch(() => { /* 실패 시 기본 SVG 아이콘 유지 */ });
    });

    return () => {
      aborted = true;
      teacherMapMarkersRef.current.forEach(m => m.setMap(null));
      teacherMapMarkersRef.current = [];
    };
  }, [isLoaded, teacherMarkers, activeLayers, cascadingFilter.primary, showJobLayer, showSeekerLayer, showInstructorLayer]);

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

      // ★ 길찾기 모드일 때는 마커를 지도에 추가하지 않음
      const kakaoMarker = new window.kakao.maps.Marker({
        position,
        map: showDirectionsSheetRef.current ? null : map,
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

  // 교원연수 강사 마커 지도에 표시
  // 교원연수강사 마커 표시 조건:
  // - showInstructorLayer가 true일 때
  // - 또는 모든 레이어 토글이 false일 때 (기본 상태) + cascadingFilter가 '교원연수'일 때
  useEffect(() => {
    const anyLayerActive = showJobLayer || showSeekerLayer || showInstructorLayer;


    // 지도 미로드 시 마커 제거
    if (!isLoaded || !mapInstanceRef.current) {
      instructorMapMarkersRef.current.forEach(m => m.setMap(null));
      instructorMapMarkersRef.current = [];
      return;
    }

    // 교원연수강사 마커 표시 조건 체크
    // 1. 교원연수 토글이 ON이면 무조건 표시
    // 2. 모든 토글이 OFF면 기본 상태이므로 모든 마커 표시 (교원연수 포함)
    const shouldShowInstructors =
      showInstructorLayer || // 교원연수강사만 보기 토글 ON
      !anyLayerActive; // 모든 토글 OFF = 기본 상태 = 모든 마커 표시

    if (!shouldShowInstructors) {
      instructorMapMarkersRef.current.forEach(m => m.setMap(null));
      instructorMapMarkersRef.current = [];
      return;
    }

    // 기존 마커 정리
    instructorMapMarkersRef.current.forEach(m => m.setMap(null));
    instructorMapMarkersRef.current = [];

    const map = mapInstanceRef.current;

    // 필터링: '교원연수' 필터 + secondary(전문분야)가 선택되면 해당 분야만 표시
    const filteredInstructors = instructorMarkers.filter(marker => {
      // 필터 없거나 secondary 없으면 모두 표시
      if (!cascadingFilter.primary || !cascadingFilter.secondary) return true;
      // specialties 배열에 선택된 전문분야가 포함되어 있는지 확인
      return marker.specialties?.some(s =>
        s.toLowerCase().includes(cascadingFilter.secondary!.toLowerCase()) ||
        cascadingFilter.secondary!.toLowerCase().includes(s.toLowerCase())
      );
    });

    // 강사 마커 좌표 캐시 초기화
    instructorMarkerCoordsRef.current.clear();

    filteredInstructors.forEach((marker) => {
      // 마커에 저장된 실제 좌표 사용 (lat/lng 마이그레이션 적용 후)
      const lat = marker.latitude;
      const lng = marker.longitude;

      // 좌표가 없으면 스킵 (마이그레이션 미적용 시)
      if (!lat || !lng) {
        return;
      }

      // 좌표 저장 (카드 클릭 시 정확한 위치로 이동)
      instructorMarkerCoordsRef.current.set(marker.id, { lat, lng });

      const position = new window.kakao.maps.LatLng(lat, lng);

      // 핑크색 원형 + 사람 아이콘 마커 (구직 마커와 동일한 디자인)
      const markerSize = new window.kakao.maps.Size(INSTRUCTOR_MARKER_SIZE.width, INSTRUCTOR_MARKER_SIZE.height);
      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(generateInstructorMarkerSVG(INSTRUCTOR_MARKER_COLORS.base))}`,
        markerSize
      );

      const kakaoMarker = new window.kakao.maps.Marker({
        position,
        map: showDirectionsSheetRef.current ? null : map,
        image: markerImage,
        clickable: true
      });

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(kakaoMarker, 'click', () => {
        const proj = map.getProjection();
        const point = proj.containerPointFromCoords(position);
        setSelectedMarker({
          type: 'instructor',
          marker,
          position: { x: point.x + 20, y: point.y - 100 }
        });
      });

      instructorMapMarkersRef.current.push(kakaoMarker);
    });


    // ★ Progressive enhancement: 프로필 이미지가 있는 강사 마커에 썸네일 적용
    let abortedInstructor = false;
    const instructorMarkerById = new Map<string, any>();
    filteredInstructors.forEach((m, i) => instructorMarkerById.set(m.id, instructorMapMarkersRef.current[i]));

    filteredInstructors.forEach(marker => {
      if (!marker.profile_image_url) return;

      const markerColor = INSTRUCTOR_MARKER_COLORS.base;
      const cacheKey = `instructor_${marker.profile_image_url}_${markerColor}`;

      // 캐시 히트 → 즉시 적용
      const cached = profileMarkerCacheRef.current.get(cacheKey);
      if (cached) {
        const km = instructorMarkerById.get(marker.id);
        if (km) {
          km.setImage(new window.kakao.maps.MarkerImage(
            cached,
            new window.kakao.maps.Size(INSTRUCTOR_MARKER_SIZE.width, INSTRUCTOR_MARKER_SIZE.height)
          ));
        }
        return;
      }

      // Supabase Image Transform으로 80x80 썸네일 URL 생성 → Canvas 렌더링
      const thumbnailUrl = getSupabaseThumbnailUrl(marker.profile_image_url);
      renderProfileMarkerToDataURL(markerColor, thumbnailUrl)
        .then(dataUrl => {
          if (abortedInstructor) return;
          profileMarkerCacheRef.current.set(cacheKey, dataUrl);
          const km = instructorMarkerById.get(marker.id);
          if (km) {
            km.setImage(new window.kakao.maps.MarkerImage(
              dataUrl,
              new window.kakao.maps.Size(INSTRUCTOR_MARKER_SIZE.width, INSTRUCTOR_MARKER_SIZE.height)
            ));
          }
        })
        .catch(() => { /* 실패 시 기본 SVG 아이콘 유지 */ });
    });

    return () => {
      abortedInstructor = true;
      instructorMapMarkersRef.current.forEach(m => m.setMap(null));
      instructorMapMarkersRef.current = [];
    };
  }, [isLoaded, instructorMarkers, cascadingFilter.primary, cascadingFilter.secondary, showJobLayer, showSeekerLayer, showInstructorLayer]);

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
        const lat = parseFloat(result[0].y);
        const lng = parseFloat(result[0].x);


        // 좌표 유효성 검증
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          console.error('[Hero] 길찾기: 좌표 파싱 실패', { y: result[0].y, x: result[0].x, lat, lng });
          alert('위치 좌표를 가져올 수 없습니다. 다시 시도해주세요.');
          return;
        }

        const coords: Coordinates = { lat, lng };

        setDirectionsCoords(coords);
        setDirectionsJob(job);

        // ★ 모바일: 길찾기 시트 열기 + endLocation 설정
        if (window.innerWidth < 768) {
          const newEndLocation = {
            name: job.organization || job.title,
            address: job.location || result[0].address_name || '',
            lat: coords.lat,
            lng: coords.lng
          };
          setEndLocation(newEndLocation);
          setShowDirectionsSheet(true);
          setShowMobileDetail(false); // 상세 모달 닫기
        }
      } else {
        console.error('[Hero] 길찾기: 위치 검색 실패', keyword, status);
        alert('위치를 찾을 수 없습니다. 다른 검색어로 시도해주세요.');
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

  // 공고 수정 핸들러
  const handleJobEdit = useCallback((job: JobPostingCard) => {
    // 위치 정보 설정
    if (job.latitude && job.longitude) {
      setPendingMarkerCoords({ lat: job.latitude, lng: job.longitude });
    }
    setPendingMarkerAddress(job.location || '');
    setEditJobData(job);
    setIsJobPostingModalOpen(true);
    setSelectedJob(null);
  }, []);

  // 공고 삭제 핸들러
  const handleJobDelete = useCallback(async (job: JobPostingCard) => {
    try {
      await deleteJobPosting(job.id);
      showToast('공고가 삭제되었습니다.', 'success');
      // 목록에서 제거
      setJobPostings(prev => prev.filter(j => j.id !== job.id));
      setSelectedJob(null);
    } catch (err: any) {
      console.error('[Hero] 공고 삭제 실패:', err);
      showToast('공고 삭제 실패: ' + (err?.message || '알 수 없는 오류'), 'error');
    }
  }, [showToast]);

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

  // 지도 이동 헬퍼 함수 (패널 오프셋 적용)
  const moveMapToCoords = useCallback((lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;


    // 마커 좌표로 직접 이동 (오프셋 없이)
    const targetCoords = new window.kakao.maps.LatLng(lat, lng);
    map.setCenter(targetCoords);
    map.setLevel(3);

  }, []);

  // 카드 클릭 핸들러 (상세 패널 열기 + 지도 이동, 토글 지원)
  const handleCardClick = useCallback((job: JobPostingCard) => {
    // 토글: 이미 선택된 공고면 선택 해제
    if (selectedJob?.id === job.id) {
      setSelectedJob(null);
      return;
    }

    // 다른 패널 닫기 + 공고 패널 열기
    setSelectedTeacher(null);
    setSelectedInstructor(null);
    setSelectedMarker(null);
    setSelectedJob(job);

    if (!mapInstanceRef.current) return;

    // 1순위: 실제 마커 좌표 사용 (마커 생성 시 저장된 정확한 위치)
    const markerCoords = jobMarkerCoordsRef.current.get(job.id);
    if (markerCoords) {
      moveMapToCoords(markerCoords.lat, markerCoords.lng);
      return;
    }

    // 2순위: job에 저장된 DB 좌표 사용
    if (job.latitude && job.longitude) {
      moveMapToCoords(job.latitude, job.longitude);
      return;
    }

    // 3순위: 캐시된 좌표 사용
    const cacheKey = job.organization || job.location;
    if (cacheKey) {
      const cached = coordsCacheRef.current.get(cacheKey);
      if (cached) {
        moveMapToCoords(cached.lat, cached.lng);
        return;
      }
    }

    // 4순위: Places API 검색 (fallback)
    if (job.organization) {
      const places = new window.kakao.maps.services.Places();
      places.keywordSearch(job.organization, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const lat = parseFloat(result[0].y);
          const lng = parseFloat(result[0].x);
          // 검색 결과를 캐시에 저장
          coordsCacheRef.current.set(job.organization, { lat, lng });
          moveMapToCoords(lat, lng);
        }
      });
    }
  }, [moveMapToCoords, selectedJob]);

  // 공고 마커 표시 (최적화: 병렬 배치 처리 + 캐시 즉시 처리 + sessionStorage 영구 캐시)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // 기존 마커 정리
    mapMarkersRef.current.forEach(marker => marker.setMap(null));
    mapMarkersRef.current = [];
    markerJobMapRef.current.clear();
    jobMarkerCoordsRef.current.clear();
    setMarkerCount(0);

    // 레이어 비활성화 시 마커 표시 안함
    if (!activeLayers.includes('job')) return;

    if (filteredJobPostings.length === 0) return;

    const map = mapInstanceRef.current;
    const places = new window.kakao.maps.services.Places();
    const cache = coordsCacheRef.current;
    let cancelled = false;
    let currentInfowindow: any = null;

    // localStorage에서 캐시 복원 (30일 만료)
    const CACHE_KEY = 'jobCoordsCache_v2';
    const CACHE_EXPIRY_DAYS = 30;
    let cacheRestored = false;
    try {
      const savedCache = localStorage.getItem(CACHE_KEY);
      if (savedCache) {
        const parsed = JSON.parse(savedCache);
        const now = Date.now();
        const expiryMs = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        // 캐시 만료 확인
        if (parsed.timestamp && (now - parsed.timestamp) < expiryMs) {
          const beforeSize = cache.size;
          Object.entries(parsed.data || {}).forEach(([k, v]) => {
            if (!cache.has(k)) cache.set(k, v as { lat: number; lng: number });
          });
          cacheRestored = cache.size > beforeSize;
          if (cacheRestored) {
          }
        } else {
          // 만료된 캐시 삭제
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (e) {
    }

    // 캐시가 복원되었으면 뷰포트 필터링 트리거
    if (cacheRestored) {
      setCoordsCacheVersion(v => v + 1);
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

      // 학교급별 색상 마커 생성
      const schoolLevel = getSchoolLevelFromJob(job);
      const isUrgent = job.daysLeft !== undefined && job.daysLeft <= 1;
      const markerSVG = generateSchoolLevelMarker(schoolLevel, job.daysLeft, isUrgent);

      // 긴급 마커는 크기가 다름 (펄스 링 여유 공간)
      const markerSize = isUrgent ? URGENT_MARKER_SIZE : MARKER_SIZE;
      const markerWidth = isUrgent ? URGENT_MARKER_SIZE.width : MARKER_SIZE.width;
      const markerHeight = isUrgent ? URGENT_MARKER_SIZE.height : MARKER_SIZE.height;
      // 긴급 마커는 패딩이 있으므로 offset 조정
      const offsetX = isUrgent ? URGENT_MARKER_SIZE.padding + MARKER_SIZE.centerX : MARKER_SIZE.centerX;
      const offsetY = isUrgent ? URGENT_MARKER_SIZE.height - 2 : MARKER_SIZE.height - 2;

      const markerImage = new window.kakao.maps.MarkerImage(
        `data:image/svg+xml,${encodeURIComponent(markerSVG)}`,
        new window.kakao.maps.Size(markerWidth, markerHeight),
        { offset: new window.kakao.maps.Point(offsetX, offsetY) }
      );

      // ★ 길찾기 모드일 때는 마커를 지도에 추가하지 않음
      const marker = new window.kakao.maps.Marker({
        position: position,
        map: showDirectionsSheetRef.current ? null : map,
        image: markerImage,
        clickable: true,
      });

      // 마커 클릭 이벤트
      window.kakao.maps.event.addListener(marker, 'click', () => {

        // 🔒 마커 클릭 직후 지도 클릭 무시 (이벤트 버블링 방지)
        ignoreMapClickRef.current = true;
        setTimeout(() => {
          ignoreMapClickRef.current = false;
        }, 150);

        if (currentInfowindow) currentInfowindow.close();

        const jobsAtLocation = coordsJobsMap.get(coordKey) || [job];

        if (jobsAtLocation.length === 1) {
          // stale closure 방지: 전역 함수 사용
          if (window.selectJobFromMarker) {
            window.selectJobFromMarker(jobsAtLocation[0].id);
          }
        } else {
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
      // 공고 ID → 실제 마커 좌표 저장 (카드 클릭 시 정확한 위치로 이동하기 위함)
      jobMarkerCoordsRef.current.set(job.id, finalCoords);
      setMarkerCount(prev => prev + 1);
    };

    // 인포윈도우에서 공고 선택 시 호출될 전역 함수 (매번 업데이트하여 최신 scrollToJobCard 접근, 토글 지원)
    (window as any).selectJobFromMarker = (jobId: string) => {

      // 🔒 InfoWindow 내부 클릭도 지도 클릭 무시 (이벤트 버블링 방지)
      ignoreMapClickRef.current = true;
      setTimeout(() => {
        ignoreMapClickRef.current = false;
      }, 150);

      // 현재 선택된 공고 ID 가져오기 (토글 체크용)
      const currentSelectedId = (window as any).__currentSelectedJobId;

      // 토글: 이미 선택된 공고면 선택 해제
      if (currentSelectedId === jobId) {
        if (setSelectedJobRef.current) {
          setSelectedJobRef.current(null);
        }
        return;
      }

      // ref를 통해 항상 최신 filteredJobPostings와 setSelectedJob 접근
      const currentJobs = (window as any).__currentFilteredJobPostings || [];
      const job = currentJobs.find((j: any) => j.id === jobId);

      if (job && setSelectedJobRef.current) {
        try {
          setSelectedJobRef.current(job);

          // ★ 모바일: 마커 클릭 시 상세 모달 표시
          if (window.innerWidth < 768 && setShowMobileDetailRef.current) {
            setShowMobileDetailRef.current(true);
          }

          // ★ 핵심: 마커 클릭 시 카드 목록에서 해당 카드로 스크롤
          setTimeout(() => {
            scrollToJobCard(jobId);
          }, 100);
        } catch (error) {
          console.error('[Hero] ❌ setSelectedJob 호출 오류:', error);
        }
      } else {
      }
    };

    // 현재 filteredJobPostings를 전역에 저장 (selectJobFromMarker에서 접근용)
    (window as any).__currentFilteredJobPostings = filteredJobPostings;

    // 캐시 저장 함수 (localStorage with timestamp)
    const saveCache = () => {
      try {
        const cacheObj: Record<string, { lat: number; lng: number }> = {};
        cache.forEach((v, k) => { cacheObj[k] = v; });
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: cacheObj,
          timestamp: Date.now()
        }));
      } catch (e) {
      }
    };

    // 실패한 키워드 추적 (무한 재시도 방지) - 세션 동안 유지
    const failedKeywordsKey = '__failedGeoKeywords';
    const getFailedKeywords = (): Set<string> => {
      try {
        const saved = sessionStorage.getItem(failedKeywordsKey);
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    };
    const saveFailedKeyword = (keyword: string) => {
      try {
        const failed = getFailedKeywords();
        failed.add(keyword);
        sessionStorage.setItem(failedKeywordsKey, JSON.stringify([...failed]));
      } catch { }
    };
    const failedKeywords = getFailedKeywords();

    // 새로 획득한 좌표 수 추적 (상태 업데이트 조건)
    let newCoordsCount = 0;

    // 키워드 검색 Promise 래퍼 (with error logging + failure tracking)
    let apiErrorCount = 0;
    const searchKeyword = (keyword: string): Promise<{ lat: number; lng: number } | null> => {
      // 이미 실패한 키워드는 스킵
      if (failedKeywords.has(keyword)) {
        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        places.keywordSearch(keyword, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            resolve({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) });
          } else {
            // 실패한 키워드 저장 (429 에러 등)
            saveFailedKeyword(keyword);

            // API 에러 로깅 (첫 5회만)
            if (apiErrorCount < 5) {
              apiErrorCount++;
              if (apiErrorCount === 5) {
              }
            }
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
        newCoordsCount++;  // 새 좌표 획득 카운트
        // Supabase geocache에도 저장 (비동기, 실패해도 무시)
        saveGeocache(keyword, coords.lat, coords.lng).catch(() => { });
        return true;
      }

      // 🔄 Fallback: 지역 중심 좌표 사용 (완전 실패 방지)
      const region = extractRegionFromLocation(job.location);
      if (region && REGION_CENTER_COORDS[region]) {
        const center = REGION_CENTER_COORDS[region];
        // 약간의 랜덤 오프셋으로 마커 겹침 방지
        const fallbackCoords = {
          lat: center.lat + (Math.random() - 0.5) * 0.03,
          lng: center.lng + (Math.random() - 0.5) * 0.03,
        };
        createMarker(fallbackCoords, job);
        return true;  // fallback이지만 마커는 표시됨
      }

      return false;
    };

    // location에서 지역 추출 (processJob 내부에서 사용)
    const extractRegionFromLocation = (location: string | null | undefined): string | null => {
      if (!location) return null;
      for (const region of Object.keys(REGION_CENTER_COORDS)) {
        if (location.includes(region)) return region;
      }
      // 시/군 단위에서 도 추출
      if (location.includes('성남') || location.includes('수원') || location.includes('용인') ||
        location.includes('고양') || location.includes('안양') || location.includes('부천')) {
        return '경기';
      }
      return null;
    };

    // 지역 중심 좌표 (geocache 실패 시 fallback용)
    const REGION_CENTER_COORDS: Record<string, { lat: number; lng: number }> = {
      '서울': { lat: 37.5665, lng: 126.9780 },
      '부산': { lat: 35.1796, lng: 129.0756 },
      '대구': { lat: 35.8714, lng: 128.6014 },
      '인천': { lat: 37.4563, lng: 126.7052 },
      '광주': { lat: 35.1595, lng: 126.8526 },
      '대전': { lat: 36.3504, lng: 127.3845 },
      '울산': { lat: 35.5384, lng: 129.3114 },
      '세종': { lat: 36.4800, lng: 127.2890 },
      '경기': { lat: 37.4138, lng: 127.5183 },
      '강원': { lat: 37.8228, lng: 128.1555 },
      '충북': { lat: 36.6357, lng: 127.4914 },
      '충남': { lat: 36.5184, lng: 126.8000 },
      '전북': { lat: 35.7175, lng: 127.1530 },
      '전남': { lat: 34.8679, lng: 126.9910 },
      '경북': { lat: 36.4919, lng: 128.8889 },
      '경남': { lat: 35.4606, lng: 128.2132 },
      '제주': { lat: 33.4996, lng: 126.5312 },
    };

    // 병렬 배치 처리 (rate limit 방지를 위해 배치 크기 축소)
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 100;

    const processBatches = async () => {
      const startTime = Date.now();

      // 1단계: DB에 좌표가 이미 있는 공고 (user_posted 등)
      const jobsWithCoords: JobPostingCard[] = [];
      // 2단계: 캐시 히트 (키워드로 좌표 캐시된 경우)
      const cachedJobs: JobPostingCard[] = [];
      // 3단계: 좌표 없고 캐시도 없는 경우 (키워드 검색 필요)
      const uncachedJobs: JobPostingCard[] = [];

      filteredJobPostings.forEach(job => {
        // DB에 좌표가 이미 있으면 우선 사용 (user_posted 공고 등)
        if (job.latitude && job.longitude) {
          jobsWithCoords.push(job);
        } else {
          const keyword = job.organization || job.location;
          if (keyword && cache.has(keyword)) {
            cachedJobs.push(job);
          } else {
            uncachedJobs.push(job);
          }
        }
      });

      // DB 좌표가 있는 공고 즉시 마커 생성
      jobsWithCoords.forEach(job => {
        if (cancelled) return;
        createMarker({ lat: job.latitude!, lng: job.longitude! }, job);
      });


      // 캐시된 공고 즉시 마커 생성
      cachedJobs.forEach(job => {
        if (cancelled) return;
        const keyword = job.organization || job.location;
        if (keyword) createMarker(cache.get(keyword)!, job);
      });


      // 3단계: Supabase geocache에서 먼저 조회
      let successCount = jobsWithCoords.length + cachedJobs.length;
      let failedCount = 0;

      if (uncachedJobs.length > 0) {
        // geocache에서 일괄 조회
        const organizationsToLookup = [...new Set(
          uncachedJobs.map(job => job.organization || job.location).filter(Boolean)
        )] as string[];

        const geocacheResults = await getGeocacheBatch(organizationsToLookup);

        // geocache 히트된 공고 처리
        // 주의: cancelled 체크는 마커 생성에만 적용 (stillUncachedJobs 채우기는 항상 수행)
        const stillUncachedJobs: JobPostingCard[] = [];
        uncachedJobs.forEach(job => {
          const keyword = job.organization || job.location;
          if (keyword && geocacheResults.has(keyword)) {
            const coords = geocacheResults.get(keyword)!;
            cache.set(keyword, coords);  // localStorage 캐시에도 저장
            if (!cancelled) {
              createMarker(coords, job);
              successCount++;
            }
          } else {
            stillUncachedJobs.push(job);  // cancelled 여부와 상관없이 항상 추가
          }
        });


        // 4단계: geocache에도 없는 경우만 Kakao API 호출
        if (stillUncachedJobs.length > 0) {
        }

        for (let i = 0; i < stillUncachedJobs.length; i += BATCH_SIZE) {
          const batch = stillUncachedJobs.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map(job => processJob(job)));

          results.forEach(success => {
            if (success) successCount++;
            else failedCount++;
          });

          // 배치 완료 후 cancelled 체크 (중간에 중단하되, 현재 배치는 완료)
          if (cancelled) {
            break;
          }

          // 배치 간 딜레이 (API rate limit 방지)
          if (i + BATCH_SIZE < stillUncachedJobs.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }
      }

      // 캐시 저장
      saveCache();

      const elapsed = Date.now() - startTime;

      // ★ 핵심 수정: 실제로 새 좌표를 획득했을 때만 뷰포트 필터링 트리거
      // (무한 루프 방지: 실패만 발생하면 상태 업데이트 안 함)
      if (newCoordsCount > 0 && !cancelled) {
        setCoordsCacheVersion(v => v + 1);
      }
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

  return (
    <section className="h-full w-full relative">
      {/* 지도 영역 */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
        onClick={(e) => {
          // 마커 클릭 직후에는 지도 클릭 무시 (이벤트 버블링 방지)
          if (ignoreMapClickRef.current) {
            return;
          }

          // 지도 클릭 시 상세 패널 닫기 (맵 클릭 모드가 아닐 때만)
          if (!mapClickMode && selectedJob) {
            // 클릭 이벤트가 패널 내부에서 발생했는지 확인
            const target = e.target as HTMLElement;
            const isInsidePanel = target.closest('[data-panel]');
            if (!isInsidePanel) {
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
        onClose={() => {
          setIsAuthModalOpen(false);
          // pendingAction은 useEffect에서 처리 (user 상태 변경 감지)
        }}
        initialTab={authModalInitialTab}
      />

      {/* 프로필 모달 */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* 약관동의 모달 (신규 사용자) */}
      {user && (
        <TermsAgreementModal
          isOpen={needsTermsAgreement}
          userId={user.id}
          onComplete={() => setNeedsTermsAgreement(false)}
        />
      )}

      {/* 접속배너 팝업 */}
      <PopupBannerModal />

      {/* 구직 교사 마커 등록 사이드 패널 */}
      <TeacherMarkerModal
        isOpen={activeSidePanel === 'register'}
        onClose={() => {
          useSidePanelStore.getState().closePanel();
          setEditingTeacherMarker(null);
          setPendingMarkerCoords(null);
          setPendingMarkerAddress('');
        }}
        editData={editingTeacherMarker}
        onSuccess={(newMarker) => {
          if (newMarker) {
            if (editingTeacherMarker) {
              // 수정: 기존 마커 교체
              setTeacherMarkers(prev => prev.map(m => m.id === newMarker.id ? newMarker : m));
            } else {
              // 신규: 추가
              setTeacherMarkers(prev => [newMarker, ...prev]);
            }
            setEditingTeacherMarker(null);

            // 지도를 새 마커 위치로 이동
            if (newMarker.latitude && newMarker.longitude && mapInstanceRef.current) {
              const newCenter = new window.kakao.maps.LatLng(newMarker.latitude, newMarker.longitude);
              mapInstanceRef.current.setCenter(newCenter);
              mapInstanceRef.current.setLevel(5);
            }
          } else {
            // 폴백: 마커 데이터가 없으면 기존처럼 전체 리로드
            loadMarkerData();
          }
        }}
        initialCoords={null}
        initialAddress={null}
        onRequestLocationChange={undefined}
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

      {/* 공고 등록/수정 사이드 패널 */}
      <JobPostingModal
        isOpen={activeSidePanel === 'jobPost' || isJobPostingModalOpen}
        onClose={() => {
          useSidePanelStore.getState().closePanel();
          setIsJobPostingModalOpen(false);
          setPendingMarkerCoords(null);
          setPendingMarkerAddress('');
          setEditJobData(null); // 수정 모드 초기화
        }}
        onSuccess={(newJob) => {
          // 로드된 지역 초기화하여 다음 로드 시 새 데이터 가져오기
          loadedRegionsRef.current.clear();
          setEditJobData(null); // 수정 모드 초기화

          // 방안 2: 낙관적 업데이트 - 새로 등록된 공고를 즉시 state에 추가
          if (newJob && !editJobData) {
            setJobPostings(prev => [newJob, ...prev]);

            // 지도를 새 공고 위치로 이동
            if (newJob.latitude && newJob.longitude && mapInstanceRef.current) {
              const newCenter = new window.kakao.maps.LatLng(newJob.latitude, newJob.longitude);
              mapInstanceRef.current.setCenter(newCenter);
              mapInstanceRef.current.setLevel(5); // 적당한 줌 레벨
            }
          }

        }}
        initialCoords={editJobData ? pendingMarkerCoords : (pendingMarkerType === 'jobPosting' ? pendingMarkerCoords : null)}
        initialAddress={editJobData ? pendingMarkerAddress : (pendingMarkerType === 'jobPosting' ? pendingMarkerAddress : null)}
        onRequestLocationChange={() => {
          setIsJobPostingModalOpen(false);
          setLocationPickerType('jobPosting');
          setIsLocationPickerOpen(true);
        }}
        editData={editJobData}
      />

      {/* 전체화면 위치 선택기 */}
      <FullScreenLocationPicker
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        markerType={locationPickerType}
        onConfirm={(coords, address) => {
          setIsLocationPickerOpen(false);
          setPendingMarkerCoords(coords);
          setPendingMarkerAddress(address);
          // 모달이 참조하는 타입 설정
          setPendingMarkerType(locationPickerType);

          // 해당 모달 열기
          if (locationPickerType === 'teacher') {
            setIsTeacherModalOpen(true);
          } else if (locationPickerType === 'jobPosting') {
            setIsJobPostingModalOpen(true);
          } else if (locationPickerType === 'instructor') {
            setIsInstructorRegisterModalOpen(true);
          } else {
            setIsProgramModalOpen(true);
          }
        }}
      />

      {/* 하단 우측: 통합 필터 바 or 플로팅 버튼 (사이드 패널 열림 시) */}
      {(isWagleDrawerOpen || isChatPanelOpen || isFavoritesPanelOpen || !!activeSidePanel) ? (
        <button
          onClick={() => {
            useWagleStore.getState().setDesktopPanelOpen(false);
            useChatStore.getState().closePanel();
            setIsFavoritesPanelOpen(false);
            useSidePanelStore.getState().closePanel();
          }}
          className="hidden md:flex items-center gap-1.5 absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full shadow-lg hover:bg-gray-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          검색필터
        </button>
      ) : (
        <div className="hidden md:block absolute bottom-4 right-4 z-20">
          <CascadingFilterBarWithLayerToggle
            filter={cascadingFilter}
            onFilterChange={setCascadingFilter}
            showJobLayer={showJobLayer}
            showSeekerLayer={showSeekerLayer}
            showInstructorLayer={showInstructorLayer}
            onJobLayerToggle={() => setShowJobLayer(prev => !prev)}
            onSeekerLayerToggle={() => setShowSeekerLayer(prev => !prev)}
            onInstructorLayerToggle={() => {
              setShowInstructorLayer(prev => {
                const newValue = !prev;
                if (newValue) {
                  setCascadingFilter({ primary: '교원연수', secondary: null, tertiary: null });
                } else {
                  if (!showJobLayer && !showSeekerLayer) {
                    setCascadingFilter({ primary: null, secondary: null, tertiary: null });
                  }
                }
                return newValue;
              });
            }}
          />
        </div>
      )}

      {/* 우측 상단: 사이드패널 + 현재위치 버튼 - PC만 */}
      <div className="hidden md:flex flex-col items-center gap-2 absolute top-4 right-4 z-20">
        <LayerToggleBar
          showJobLayer={showJobLayer}
          showSeekerLayer={showSeekerLayer}
          showInstructorLayer={showInstructorLayer}
          onJobLayerToggle={() => setShowJobLayer(prev => !prev)}
          onSeekerLayerToggle={() => setShowSeekerLayer(prev => !prev)}
          onInstructorLayerToggle={() => setShowInstructorLayer(prev => !prev)}
          onRegisterClick={() => {
            if (!user) {
              setPendingAction('register');
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            setIsFavoritesPanelOpen(false);
            setEditingTeacherMarker(null);
            useSidePanelStore.getState().bringToFront('register');
            useSidePanelStore.getState().togglePanel('register');
          }}
          onJobPostClick={() => {
            if (!user) {
              setPendingAction('jobPost');
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            setIsFavoritesPanelOpen(false);
            useSidePanelStore.getState().bringToFront('jobPost');
            useSidePanelStore.getState().togglePanel('jobPost');
          }}
          onFavoritesClick={() => {
            if (!user) {
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            // 하나만 열리게: 즐겨찾기 열면 다른 패널 모두 닫기
            const nextOpen = !isFavoritesPanelOpen;
            if (nextOpen) {
              useWagleStore.getState().setDesktopPanelOpen(false);
              useChatStore.getState().closePanel();
              useSidePanelStore.getState().closePanel();
              useSidePanelStore.getState().bringToFront('favorites');
            }
            setIsFavoritesPanelOpen(nextOpen);
          }}
          onChatClick={() => {
            // 채팅 열면 다른 패널 모두 닫기
            useWagleStore.getState().setDesktopPanelOpen(false);
            setIsFavoritesPanelOpen(false);
            useSidePanelStore.getState().closePanel();
            useSidePanelStore.getState().bringToFront('chat');
            useChatStore.getState().openPanel();
          }}
          onInstructorRegisterClick={() => {
            if (!user) {
              setPendingAction('instructor');
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            setIsFavoritesPanelOpen(false);
            setEditingInstructorMarker(null);
            useSidePanelStore.getState().bringToFront('instructor');
            useSidePanelStore.getState().togglePanel('instructor');
          }}
          onLoginClick={() => {
            if (user) {
              setIsProfileModalOpen(true);
            } else {
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
            }
          }}
          isLoggedIn={!!user}
          userProfileImage={null}
          userName={user?.email?.split('@')[0] || null}
          onCloseFavorites={() => setIsFavoritesPanelOpen(false)}
          onOpenFavorites={openFavoritesDrawer}
        />
        {/* 현재위치 버튼 - 사이드패널 바로 아래 */}
        <FloatingLocationButton mapInstance={mapInstanceRef.current} />
        {/* 자동 스케일업 후 원래 위치 복귀 버튼 */}
        {canRestorePosition && (
          <button
            onClick={restoreOriginalPosition}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-sm text-gray-700 px-4 py-2 rounded-full shadow-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            원래 위치로 돌아가기
          </button>
        )}
      </div>

      {/* 와글와글 데스크탑 패널 */}
      <DesktopWaglePanelWrapper />

      {/* 1:1 채팅 데스크탑 패널 */}
      <DesktopChatPanelWrapper />

      {/* 즐겨찾기 데스크탑 패널 */}
      <FavoritesPanel
        isOpen={isFavoritesPanelOpen}
        onClose={() => setIsFavoritesPanelOpen(false)}
        onJobCardClick={(job) => {
          setIsFavoritesPanelOpen(false);
          setSelectedJob(job);
          // 지도에서 해당 공고 마커로 이동
          if (mapInstanceRef.current && window.kakao?.maps) {
            const lat = job.latitude;
            const lng = job.longitude;
            if (lat && lng) {
              mapInstanceRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
              mapInstanceRef.current.setLevel(5);
            }
          }
        }}
      />

      {/* 구현 예정 모달 */}
      <ComingSoonModal
        isOpen={isComingSoonOpen}
        onClose={() => setIsComingSoonOpen(false)}
        title={comingSoonFeature}
      />

      {/* 교원연수 강사등록 안내 모달 */}
      <InstructorInfoModal
        isOpen={isInstructorModalOpen}
        onClose={() => setIsInstructorModalOpen(false)}
        onRegister={() => {
          if (!user) {
            // 로그인 안 됨 → 로그인 모달 열기
            setPendingAction('instructor');
            setIsAuthModalOpen(true);
          } else {
            // 로그인 됨 → LocationPicker 스킵, 바로 모달 열기 (위치는 모달 내에서 선택)
            setIsInstructorRegisterModalOpen(true);
          }
        }}
      />

      {/* 교원연수 강사등록 사이드 패널 */}
      <InstructorMarkerModal
        isOpen={activeSidePanel === 'instructor' || isInstructorRegisterModalOpen}
        onClose={() => {
          useSidePanelStore.getState().closePanel();
          setIsInstructorRegisterModalOpen(false);
          setEditingInstructorMarker(null);
        }}
        editData={editingInstructorMarker}
        onSuccess={(newMarker) => {
          if (newMarker) {
            if (editingInstructorMarker) {
              setInstructorMarkers(prev => prev.map(m => m.id === newMarker.id ? newMarker : m));
            } else {
              setInstructorMarkers(prev => [newMarker, ...prev]);
            }
            setEditingInstructorMarker(null);

            // 지도를 새 마커 위치로 이동
            if (newMarker.latitude && newMarker.longitude && mapInstanceRef.current) {
              const newCenter = new window.kakao.maps.LatLng(newMarker.latitude, newMarker.longitude);
              mapInstanceRef.current.setCenter(newCenter);
              mapInstanceRef.current.setLevel(5);
            }
          } else {
            // 폴백: 마커 데이터가 없으면 기존처럼 전체 리로드
            loadMarkerData();
          }
        }}
        initialCoords={null}
        initialAddress={null}
        onRequestLocationChange={undefined}
      />

      {/* 마커 팝업 */}
      {selectedMarker && (
        <MarkerPopup
          type={selectedMarker.type}
          marker={selectedMarker.marker}
          position={selectedMarker.position}
          onClose={() => setSelectedMarker(null)}
          onEdit={(marker) => {
            setEditingTeacherMarker(marker);
            setSelectedMarker(null);
            useSidePanelStore.getState().openPanel('register');
          }}
          onEditInstructor={(marker) => {
            setEditingInstructorMarker(marker);
            setSelectedMarker(null);
            useSidePanelStore.getState().openPanel('instructor');
          }}
          onDelete={() => {
            setSelectedMarker(null);
            loadMarkerData();
          }}
        />
      )}

      {/* 왼쪽 패널 컨테이너: 로고 + 카드 목록 + 상세 패널 + 토글 버튼 (데스크톱 전용) */}
      <div
        className={`hidden md:flex absolute top-4 z-10 items-start transition-all duration-300 ease-in-out ${isPanelHidden ? '-left-[240px]' : 'left-4'
          }`}
      >
        {/* 왼쪽 패널: 로고 + 필터 + 공고 목록 (한 몸처럼) */}
        <div className="w-[240px] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-32px)]" data-panel="list">

          {/* 로고 영역 - 패널 최상단 (모바일에서 20% 축소) */}
          <div className="px-3 py-2 md:py-3 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => {
                // 필터 초기화
                setCascadingFilter({ primary: null, secondary: null, tertiary: null });
                setLocationSearchQuery('');
                setActiveLocationFilter(null);
                // 목록 펼치기
                setIsJobListCollapsed(false);
                // 선택된 공고 해제
                setSelectedJob(null);
                // 패널 열기
                setIsPanelHidden(false);
              }}
              className="relative flex items-center justify-center w-full hover:opacity-80 transition-opacity active:scale-[0.98]"
              aria-label="필터 초기화 및 홈으로"
              title="필터 초기화"
            >
              <img
                src="/picture/logo.png"
                alt="학교일자리"
                className="h-[46px] md:h-[68px] w-auto"
              />
            </button>
          </div>

          {/* 검색 영역 */}
          <div className="px-3 py-3 border-b border-gray-100 flex-shrink-0">
            {/* 검색 */}
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
                    placeholder="지역, 학교, 과목으로 검색"
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

          {/* 통합 목록 헤더 - 지도와 1:1 동기화 (탭 분리 없음) */}
          <div className="flex-shrink-0 border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">목록</span>
                <span className="text-xs text-blue-600 font-medium">
                  {unifiedVisibleItems.length}
                </span>
              </div>
              {/* 접기/펼치기 버튼 */}
              <button
                onClick={() => setIsJobListCollapsed(!isJobListCollapsed)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label={isJobListCollapsed ? '목록 펼치기' : '목록 접기'}
              >
                {isJobListCollapsed ? (
                  <ChevronDown size={16} strokeWidth={2} />
                ) : (
                  <ChevronUp size={16} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {/* ★ 통합 목록 - 지도와 1:1 동기화 (공고 + 구직자 + 강사 혼합) */}
          <div
            className={`overflow-y-auto transition-all duration-300 ease-in-out ${isJobListCollapsed ? 'max-h-0 opacity-0' : 'max-h-[420px] md:max-h-none md:flex-1 opacity-100'
              }`}
            style={{ minHeight: isJobListCollapsed ? 0 : undefined }}
          >
            {isJobsLoading ? (
              <ListSkeleton count={5} />
            ) : unifiedVisibleItems.length === 0 ? (
              <EmptyState
                type="filter"
                title="현재 지도에 마커가 없어요"
                description="지도를 이동하거나 필터를 조정해 보세요"
                size="sm"
              />
            ) : (
              <div className="divide-y divide-gray-100" ref={jobListContainerRef}>
                {(() => {
                  // 카드배너를 N번째마다 삽입한 통합 렌더 리스트 생성
                  const interval = cardBannerConfig?.isActive && cardBanners.length > 0
                    ? (cardBannerConfig.insertionInterval || 5) : 0;
                  const elements: React.ReactNode[] = [];
                  let bannerIdx = 0;

                  unifiedVisibleItems.forEach((item, itemIdx) => {
                    // 배너 삽입 (첫 번째 위치 제외, interval마다)
                    if (interval > 0 && itemIdx > 0 && itemIdx % interval === 0) {
                      const banner = cardBanners[bannerIdx % cardBanners.length];
                      elements.push(
                        <div key={`ad-${itemIdx}`} className="px-4 py-2">
                          <CardBannerItem banner={banner} />
                        </div>
                      );
                      bannerIdx++;
                    }

                    // 원본 아이템 렌더링
                    if (item.type === 'job') {
                      const job = item.data;
                      elements.push(
                      <div
                        key={`job-${job.id}`}
                        data-job-id={job.id}
                        className={`group relative p-4 cursor-pointer transition-all border-l-4 border-l-transparent ${selectedJob?.id === job.id
                          ? 'bg-blue-50 !border-l-[#5B6EF7]'
                          : 'hover:bg-gray-50'
                          }`}
                        onClick={() => handleCardClick(job)}
                      >
                        {/* 기관명 + D-day */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500 truncate flex-1">
                            {job.organization || '기관 정보 없음'}
                          </span>
                          {job.daysLeft !== undefined && job.daysLeft <= 5 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-1.5 ${job.daysLeft === 0
                              ? 'bg-red-500 text-white'
                              : job.daysLeft <= 3
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                              }`}>
                              {job.daysLeft === 0 ? 'D-Day' : `D-${job.daysLeft}`}
                            </span>
                          )}
                        </div>

                        {/* 제목 + 태그 */}
                        <h5 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-2">
                          {job.title}
                          {job.tags && job.tags.length > 0 && (
                            <span className="font-normal text-gray-500">
                              {' '}({job.tags.slice(0, 2).join(', ')}{job.tags.length > 2 ? ' 외' : ''})
                            </span>
                          )}
                        </h5>

                        {/* 상세 정보 */}
                        <div className="space-y-1 text-xs text-gray-600">
                          {job.location && (
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="truncate">{formatLocationDisplay(job.location, job.metropolitan_region)}</span>
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
                                const deadlineStr = job.deadline.replace(/^~\s*/, '').trim();
                                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                                const parts = deadlineStr.split('.');
                                if (parts.length >= 2) {
                                  const year = parts.length === 3 ? parseInt(parts[0]) : new Date().getFullYear();
                                  const month = parseInt(parts.length === 3 ? parts[1] : parts[0]) - 1;
                                  const day = parseInt(parts.length === 3 ? parts[2] : parts[1]);
                                  const date = new Date(year, month, day);
                                  if (!isNaN(date.getTime())) {
                                    return `${deadlineStr}(${dayNames[date.getDay()]})`;
                                  }
                                }
                                return deadlineStr;
                              })()}</span>
                            </div>
                          )}
                        </div>

                        {/* 호버 시 길찾기 버튼 */}
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
                    );
                  }

                  // 구직자 카드
                  if (item.type === 'teacher') {
                    const marker = item.data;
                    const isActive = marker.is_active !== false; // 기본값 true
                    const badgeColor = CATEGORY_MARKER_COLORS[marker.primary_category as PrimaryCategory] || '#68B2FF';
                    // 메인뱃지 로직: sub가 있으면 sub[0]이 메인, 없으면 primary가 메인
                    const hasSub = marker.sub_categories && marker.sub_categories.length > 0;
                    const mainBadgeText = hasSub ? marker.sub_categories![0] : (marker.primary_category || '');
                    const subBadgeText = hasSub ? marker.primary_category : '';
                    elements.push(
                      <div
                        key={`teacher-${marker.id}`}
                        className={`group relative p-3 cursor-pointer transition-all border-l-4 ${selectedTeacher?.id === marker.id
                          ? 'bg-sky-50/50'
                          : 'hover:bg-gray-50'
                          } ${!isActive ? 'opacity-60' : ''}`}
                        style={{
                          borderLeftColor: selectedTeacher?.id === marker.id ? '#0EA5E9' : 'transparent',
                        }}
                        onClick={() => {
                          if (selectedTeacher?.id === marker.id) {
                            setSelectedTeacher(null);
                            return;
                          }
                          setSelectedJob(null);
                          setSelectedInstructor(null);
                          setSelectedMarker(null);
                          setSelectedTeacher(marker);
                          const markerCoords = teacherMarkerCoordsRef.current.get(marker.id);
                          if (markerCoords) {
                            moveMapToCoords(markerCoords.lat, markerCoords.lng);
                          } else if (marker.latitude && marker.longitude) {
                            moveMapToCoords(marker.latitude, marker.longitude);
                          }
                        }}
                      >
                        {/* 행1: 프로필 이미지 + 닉네임 + 상태칩 */}
                        <div className="flex items-center gap-3 mb-1.5">
                          <div
                            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: getTeacherMarkerColor(marker.primary_category) }}
                          >
                            {marker.profile_image_url ? (
                              <img src={marker.profile_image_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              marker.nickname?.charAt(0) || 'T'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-800 truncate">
                                {marker.nickname || '익명'}
                              </span>
                              {isActive ? (
                                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                  구직중
                                </span>
                              ) : (
                                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                                  구직종료
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 행2: 메인뱃지 + 보조텍스트 */}
                        {mainBadgeText && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                              style={{ backgroundColor: badgeColor }}
                            >
                              {mainBadgeText}
                            </span>
                            {subBadgeText && (
                              <span className="text-[10px] text-gray-400">{subBadgeText}</span>
                            )}
                          </div>
                        )}

                        {/* 행3: 학교급 + 경력 (뱃지에 이미 표시된 sub[0] 제외) */}
                        <div className="text-xs text-gray-600 mb-1 truncate">
                          {(() => {
                            const parts: string[] = [];
                            // sub가 2개 이상이면 나머지 sub 표시
                            if (hasSub && marker.sub_categories!.length > 1) {
                              parts.push(marker.sub_categories!.slice(1, 3).join(', '));
                            }
                            const levels = marker.preferred_school_levels?.length
                              ? marker.preferred_school_levels
                              : marker.school_levels;
                            if (levels && levels.length > 0) {
                              parts.push(levels.map((l: string) => l.replace('학교', '')).join('/'));
                            }
                            if (marker.experience_years) {
                              parts.push(marker.experience_years);
                            }
                            return parts.join(' · ') || null;
                          })()}
                        </div>

                        {/* 행4: 활동지역 */}
                        {marker.available_regions && marker.available_regions.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{marker.available_regions.join(', ')}</span>
                          </div>
                        )}

                        {/* 행5: 자기소개 1줄 */}
                        {marker.introduction && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="truncate">{marker.introduction}</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 교원연수 강사 카드
                  if (item.type === 'instructor') {
                    const marker = item.data;
                    const isActive = marker.is_active !== false;
                    const mainSpecialty = marker.specialties?.[0] || '';
                    const isSelectedInstructor = selectedInstructor?.id === marker.id;

                    // 정보행
                    const infoParts: string[] = [];
                    if (marker.target_audience?.length > 0) infoParts.push(marker.target_audience[0]);
                    if (marker.experience_years) infoParts.push(marker.experience_years);

                    elements.push(
                      <div
                        key={`instructor-${marker.id}`}
                        className={`group relative p-3 cursor-pointer transition-all border-l-4 ${isSelectedInstructor
                          ? 'bg-sky-50/50'
                          : 'hover:bg-gray-50'
                          } ${!isActive ? 'opacity-60' : ''}`}
                        style={{
                          borderLeftColor: isSelectedInstructor ? '#0EA5E9' : 'transparent',
                        }}
                        onClick={() => {
                          if (selectedInstructor?.id === marker.id) {
                            setSelectedInstructor(null);
                            return;
                          }
                          setSelectedJob(null);
                          setSelectedTeacher(null);
                          setSelectedMarker(null);
                          setSelectedInstructor(marker);

                          const markerCoords = instructorMarkerCoordsRef.current.get(marker.id);
                          if (markerCoords) {
                            moveMapToCoords(markerCoords.lat, markerCoords.lng);
                          } else if (marker.latitude && marker.longitude) {
                            moveMapToCoords(marker.latitude, marker.longitude);
                          }
                        }}
                      >
                        {/* 행1: 프로필 이미지 + 이름 + 상태칩 */}
                        <div className="flex items-center gap-3 mb-1.5">
                          <div
                            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}
                          >
                            {marker.profile_image_url ? (
                              <img src={marker.profile_image_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              marker.display_name?.charAt(0) || 'I'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-gray-800 truncate">
                                {marker.display_name || '익명'}
                              </span>
                              {isActive ? (
                                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">
                                  활동중
                                </span>
                              ) : (
                                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                                  활동종료
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 행2: specialties[0] 메인뱃지 + 연수강사 보조 */}
                        {mainSpecialty && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                              style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}
                            >
                              {mainSpecialty}
                            </span>
                            <span className="text-[10px] text-gray-400">연수강사</span>
                          </div>
                        )}

                        {/* 행3: 연수대상 + 경력 */}
                        {infoParts.length > 0 && (
                          <div className="text-xs text-gray-600 mb-1 truncate">
                            {infoParts.join(' · ')}
                          </div>
                        )}

                        {/* 행4: 활동지역 */}
                        {marker.available_regions && marker.available_regions.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate">{marker.available_regions.join(', ')}</span>
                          </div>
                        )}

                        {/* 행5: 활동이력 1줄 */}
                        {marker.activity_history && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="truncate">{marker.activity_history}</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  });

                  return elements;
                })()}
              </div>
            )}
          </div>

        </div>

        {/* 상세 패널 - 카드 목록 옆에 배치 (flex 아이템) */}
        {selectedJob && (
          <div data-panel="detail">
            <JobDetailPanel
              job={selectedJob}
              isOpen={!!selectedJob}
              onClose={() => setSelectedJob(null)}
              onDirectionsClick={handleDirectionsClick}
              currentUserId={user?.id}
              onEdit={handleJobEdit}
              onDelete={handleJobDelete}
            />
          </div>
        )}

        {/* 구직자 상세 패널 - 카드 목록 옆에 배치 (flex 아이템) */}
        {selectedTeacher && (
          <div data-panel="teacher-detail">
            <TeacherDetailPanel
              teacher={selectedTeacher}
              isOpen={!!selectedTeacher}
              onClose={() => setSelectedTeacher(null)}
            />
          </div>
        )}

        {/* 강사 상세 패널 - 카드 목록 옆에 배치 (flex 아이템) */}
        {selectedInstructor && (
          <div data-panel="instructor-detail">
            <InstructorDetailPanel
              instructor={selectedInstructor}
              isOpen={!!selectedInstructor}
              onClose={() => setSelectedInstructor(null)}
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

      {/* 길찾기 패널 - 사이드 패널 방식 (상세 패널 옆에 위치) - 데스크톱만 */}
      <AnimatePresence>
        {directionsJob && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="hidden md:block absolute top-4 z-20"
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

      {/* ===== 모바일 전용 UI (768px 미만) ===== */}

      {/* 모바일 상단: 검색바 + 빠른 필터 */}
      <div
        className="md:hidden absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-white/95 to-transparent pb-4 overflow-visible"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <MobileSearchBar
          value={locationSearchQuery}
          onSearch={(query) => {
            setLocationSearchQuery(query);
            handleLocationSearch();
          }}
          onProfileClick={() => {
            if (user) {
              window.location.href = '/profile';
            } else {
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
            }
          }}
        />
        <MobileQuickFilters
          filter={cascadingFilter}
          onFilterChange={setCascadingFilter}
          onReset={() => {
            setCascadingFilter({ primary: null, secondary: null, tertiary: null });
          }}
          bottomSheetHeight={bottomSheetHeight}
        />
      </div>

      {/* 모바일 우측 사이드 버튼 그룹 (등록 3개 + 현재위치) */}
      <div className="md:hidden absolute right-3 top-[180px] z-20 flex flex-col gap-2">
        {/* 구직등록 버튼 */}
        <button
          onClick={() => {
            if (!user) {
              setPendingAction('register');
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            setIsFavoritesPanelOpen(false);
            setEditingTeacherMarker(null);
            useSidePanelStore.getState().bringToFront('register');
            useSidePanelStore.getState().togglePanel('register');
          }}
          className="w-12 h-12 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95 text-white"
          aria-label="구직등록"
        >
          <span className="text-[11px] font-bold leading-tight text-center">구직<br />등록</span>
        </button>

        {/* 공고등록 버튼 */}
        <button
          onClick={() => {
            if (!user) {
              setPendingAction('jobPost');
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            setIsFavoritesPanelOpen(false);
            useSidePanelStore.getState().bringToFront('jobPost');
            useSidePanelStore.getState().togglePanel('jobPost');
          }}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95 text-white"
          aria-label="공고등록"
        >
          <span className="text-[11px] font-bold leading-tight text-center">공고<br />등록</span>
        </button>

        {/* 강사등록 버튼 */}
        <button
          onClick={() => {
            if (!user) {
              setPendingAction('instructor');
              setAuthModalInitialTab('login');
              setIsAuthModalOpen(true);
              return;
            }
            setIsFavoritesPanelOpen(false);
            useSidePanelStore.getState().bringToFront('instructor');
            useSidePanelStore.getState().togglePanel('instructor');
          }}
          className="w-12 h-12 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95 text-white"
          aria-label="강사등록"
        >
          <span className="text-[11px] font-bold leading-tight text-center">강사<br />등록</span>
        </button>

        {/* 와글와글 버튼 */}
        <button
          onClick={() => {
            useChatStore.getState().closePanel();
            setIsFavoritesPanelOpen(false);
            useSidePanelStore.getState().closePanel();
            useSidePanelStore.getState().bringToFront('wagle');
            useWagleStore.getState().setDesktopPanelOpen(true);
          }}
          className="w-12 h-12 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 rounded-xl shadow-lg flex items-center justify-center transition-all active:scale-95 text-white"
          aria-label="와글와글"
        >
          <span className="text-[10px] font-bold leading-tight text-center">와글<br />와글</span>
        </button>

        {/* 현재위치 버튼 - 원형 플로팅 */}
        <button
          onClick={() => {
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
          }}
          disabled={isLocating}
          className="w-11 h-11 bg-white hover:bg-gray-50 rounded-full shadow-lg flex items-center justify-center border border-gray-200 disabled:opacity-50 mt-1"
          aria-label="현재위치"
        >
          {isLocating ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* 모바일 바텀시트 (통합 목록: 공고+구직자+강사) - 길찾기 시트 열려있으면 숨김 */}
      {!showDirectionsSheet && (
        <div className="md:hidden">
          <MobileBottomSheet
            height={bottomSheetHeight}
            onHeightChange={setBottomSheetHeight}
            itemCount={unifiedVisibleItems.length}
            isLoading={isJobsLoading}
            label={mobileBottomSheetLabel}
          >
            <div className="space-y-3 pb-20">
              {(() => {
                const elements: React.ReactNode[] = [];
                const interval = cardBannerConfig?.insertionInterval || 5;
                let cardIndex = 0;

                unifiedVisibleItems.forEach((item) => {
                  // 카드배너 삽입
                  if (
                    cardBannerConfig?.isActive &&
                    cardBanners.length > 0 &&
                    cardIndex > 0 &&
                    cardIndex % interval === 0
                  ) {
                    const bannerIdx = Math.floor(cardIndex / interval - 1) % cardBanners.length;
                    elements.push(
                      <CardBannerItem key={`card-banner-m-${cardIndex}`} banner={cardBanners[bannerIdx]} />
                    );
                  }

                  if (item.type === 'job') {
                    const job = item.data;
                    elements.push(
                      <MobileJobCard
                        key={`job-${job.id}`}
                        job={job}
                        isSelected={selectedJob?.id === job.id}
                        onClick={() => {
                          setSelectedJob(job);
                          setShowMobileDetail(true);
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
                        onDetailClick={() => {
                          setSelectedJob(job);
                          setShowMobileDetail(true);
                        }}
                        onDirectionsClick={() => handleDirectionsClick(job)}
                      />
                    );
                  } else if (item.type === 'teacher') {
                    const marker = item.data;
                    elements.push(
                      <MobileTeacherCard
                        key={`teacher-${marker.id}`}
                        teacher={marker}
                        isSelected={selectedTeacher?.id === marker.id}
                        onClick={() => {
                          setSelectedJob(null);
                          setSelectedInstructor(null);
                          setSelectedMarker(null);
                          setSelectedTeacher(marker);
                          setShowMobileTeacherDetail(true);
                        }}
                      />
                    );
                  } else if (item.type === 'instructor') {
                    const marker = item.data;
                    elements.push(
                      <MobileInstructorCard
                        key={`instructor-${marker.id}`}
                        instructor={marker}
                        isSelected={selectedInstructor?.id === marker.id}
                        onClick={() => {
                          setSelectedJob(null);
                          setSelectedTeacher(null);
                          setSelectedMarker(null);
                          setSelectedInstructor(marker);
                          setShowMobileInstructorDetail(true);
                        }}
                      />
                    );
                  }

                  cardIndex++;
                });

                return elements;
              })()}

              {!isJobsLoading && unifiedVisibleItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          </MobileBottomSheet>
        </div>
      )}

      {/* 모바일 상세보기 모달 - 공고 */}
      {showMobileDetail && selectedJob && (
        <div className="md:hidden">
          <MobileJobDetail
            job={selectedJob}
            onClose={() => setShowMobileDetail(false)}
            onDirections={() => {
              if (selectedJob) {
                handleDirectionsClick(selectedJob);
              }
            }}
          />
        </div>
      )}

      {/* 모바일 상세보기 모달 - 구직자 */}
      {showMobileTeacherDetail && selectedTeacher && (
        <div className="md:hidden">
          <MobileTeacherDetail
            teacher={selectedTeacher}
            onClose={() => setShowMobileTeacherDetail(false)}
          />
        </div>
      )}

      {/* 모바일 상세보기 모달 - 연수강사 */}
      {showMobileInstructorDetail && selectedInstructor && (
        <div className="md:hidden">
          <MobileInstructorDetail
            instructor={selectedInstructor}
            onClose={() => setShowMobileInstructorDetail(false)}
          />
        </div>
      )}

      {/* 모바일 길찾기 통합 시트 */}
      <div className="md:hidden">
        <DirectionsUnifiedSheet
          isOpen={showDirectionsSheet}
          onClose={() => {
            setShowDirectionsSheet(false);
            setDirectionsJob(null);
            setDirectionsResult(null);
            // ★ 길찾기 상태 완전 초기화
            setStartLocation(null);
            setEndLocation(null);
            // 라인 제거 등 초기화 로직 필요
            if (polylineRef.current) {
              polylineRef.current.setMap(null);
              polylineRef.current = null;
            }
          }}
          startLocation={startLocation}
          endLocation={endLocation}
          directionsResult={directionsResult}
          transportType={transportType}
          onTransportTypeChange={setTransportType}
          isLoading={isLoadingRoute}
          destinationName={directionsJob?.organization || ''}
          onSelectCurrentLocation={() => {
            // 현위치 선택 로직 (에러 핸들링 포함)
            if (navigator.geolocation) {
              setHasLocationPermission(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setStartLocation({
                    name: '현위치',
                    address: '내 위치',
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                  });
                },
                (error) => {
                  console.error('[Hero] 위치 획득 실패:', error);
                  alert('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
              );
            } else {
              alert('이 브라우저에서는 위치 기능을 지원하지 않습니다.');
            }
          }}
          onSelectSearchLocation={(location) => {
            // 검색 결과 선택 시 출발지로 설정
            setStartLocation({
              name: location.name,
              address: location.address,
              lat: location.lat,
              lng: location.lng
            });
          }}
          onSelectMapLocation={() => { }} // 지도 선택 로직 연동 필요
          onClearStartLocation={() => setStartLocation(null)}
          hasLocationPermission={hasLocationPermission}
          onRequestLocationPermission={() => {
            // 권한 요청 시 바로 위치 획득 시도
            if (navigator.geolocation) {
              setHasLocationPermission(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setStartLocation({
                    name: '현위치',
                    address: '내 위치',
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                  });
                },
                (error) => {
                  console.error('[Hero] 권한 요청 중 위치 획득 실패:', error);
                  setHasLocationPermission(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
              );
            }
          }}
        />
      </div>

      {/* 모바일 하단 네비게이션 (5개: 공고보기, 구직자보기, 강사보기, 채팅, 즐겨찾기) */}
      <MobileRegisterNav
        showJobLayer={showJobLayer}
        showSeekerLayer={showSeekerLayer}
        showInstructorLayer={showInstructorLayer}
        onJobLayerToggle={() => setShowJobLayer(prev => !prev)}
        onSeekerLayerToggle={() => setShowSeekerLayer(prev => !prev)}
        onInstructorLayerToggle={() => setShowInstructorLayer(prev => !prev)}
        onChatClick={() => {
          useWagleStore.getState().setDesktopPanelOpen(false);
          setIsFavoritesPanelOpen(false);
          useSidePanelStore.getState().closePanel();
          useSidePanelStore.getState().bringToFront('chat');
          useChatStore.getState().openPanel();
        }}
        onBookmarkClick={() => {
          if (!user) {
            setAuthModalInitialTab('login');
            setIsAuthModalOpen(true);
            return;
          }
          const nextOpen = !isFavoritesPanelOpen;
          if (nextOpen) {
            useWagleStore.getState().setDesktopPanelOpen(false);
            useChatStore.getState().closePanel();
            useSidePanelStore.getState().closePanel();
            useSidePanelStore.getState().bringToFront('favorites');
          }
          setIsFavoritesPanelOpen(nextOpen);
        }}
      />

      {/* 구현 예정 모달 */}
      <ComingSoonModal
        isOpen={isComingSoonOpen}
        onClose={() => setIsComingSoonOpen(false)}
        title={comingSoonFeature}
      />

      {/* 위치 권한 모달 (모바일만) */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAllow={() => {
          setShowLocationModal(false);
          localStorage.setItem('locationPermissionChoice', 'allowed');
          // 위치 가져오기
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                setUserLocation({ lat, lng });
              },
              (error) => console.error('위치 가져오기 실패:', error),
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
        }}
        onDeny={() => {
          setShowLocationModal(false);
          localStorage.setItem('locationPermissionChoice', 'denied');
        }}
      />
    </section>
  );
};

/** 와글와글 데스크탑 호버 서랍 래퍼 */
function DesktopWaglePanelWrapper() {
  return <DesktopWaglePanel />;
}

/** 1:1 채팅 데스크탑 호버 서랍 래퍼 */
function DesktopChatPanelWrapper() {
  return <DesktopChatPanel />;
}
