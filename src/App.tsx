import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import AIRecommendations from '@/components/ai/AIRecommendations';
import AIInsightBox from '@/components/ai/AIInsightBox';
import CardGrid from '@/components/cards/CardGrid';
import JobDetailModal from '@/components/cards/JobDetailModal';
import ExperienceDetailModal from '@/components/cards/ExperienceDetailModal';
import JobPostingEditModal from '@/components/forms/JobPostingEditModal';
import ExperienceEditModal from '@/components/forms/ExperienceEditModal';
import ProfileSetupModal, { ROLE_OPTIONS, type RoleOption } from '@/components/auth/ProfileSetupModal';
import ProfileViewModal from '@/components/auth/ProfileViewModal';
import SocialSignupModal, { type AuthProvider } from '@/components/auth/SocialSignupModal';
import ToastContainer from '@/components/common/ToastContainer';
import RegisterButtonsSection from '@/components/mobile/RegisterButtonsSection';
import StatisticsBanner from '@/components/mobile/StatisticsBanner';
import BottomNav from '@/components/mobile/BottomNav';
import PromoCardStack from '@/components/promo/PromoCardStack';
import IntegratedHeaderPromo from '@/components/mobile/IntegratedHeaderPromo';
import { searchCards, fetchRecommendationsCache, isCacheValid, hasProfileChanged, shouldInvalidateCache, fetchPromoCards, selectRecommendationCards, filterByTeacherLevel, filterByJobType, calculateSubjectScore, filterByExperience, generateRecommendations, fetchFreshJobs } from '@/lib/supabase/queries';
import { fetchUserProfile, type UserProfileRow } from '@/lib/supabase/profiles';
import { useSearchStore } from '@/stores/searchStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import type { Card, PromoCardSettings, JobPostingCard, ExperienceCard } from '@/types';
import { getRegisteredTalentFromLocalStorage, clearRegisteredTalentFromLocalStorage } from '@/lib/utils/landingTransform';
import { useGeolocation } from '@/lib/hooks/useGeolocation';

/**
 * 마감 지난 공고 필터링 함수
 * @param cards - 필터링할 카드 배열
 * @returns 마감 안 지난 유효한 카드만 반환
 */
function filterExpiredJobs(cards: Card[]): Card[] {
  const now = new Date();
  return cards.filter(card => {
    // 인력/체험 카드는 마감일 개념이 없으므로 통과
    if (card.type !== 'job') return true;

    const job = card as JobPostingCard;
    // 마감일 정보가 없으면 통과
    if (!job.deadline) return true;

    try {
      const deadline = new Date(job.deadline);
      // 마감일이 현재 시각 이후인 것만 포함
      return deadline.getTime() >= now.getTime();
    } catch {
      // 마감일 파싱 실패 시 안전하게 포함
      return true;
    }
  });
}

/**
 * 위치 기반 카드 정렬 함수
 * @param cards - 정렬할 카드 배열
 * @param userLocation - 사용자 위치 정보
 * @returns 거리 순으로 정렬된 카드 배열 (가까운 순)
 */
function sortCardsByLocation(
  cards: Card[],
  userLocation: { city: string; district: string } | null
): Card[] {
  if (!userLocation) return cards;

  // 도시 이름 정규화 (공백 제거, "시", "구" 제거)
  const normalizeCity = (city: string): string => {
    return city
      .replace(/\s+/g, '')
      .replace(/시$/, '')
      .replace(/구$/, '')
      .trim();
  };

  const userCity = normalizeCity(userLocation.city);
  const userDistrict = normalizeCity(userLocation.district);

  console.log('📍 [카드 정렬] 위치 기반 정렬 시작');
  console.log('  - 사용자 도시:', userCity);
  console.log('  - 사용자 구:', userDistrict);

  // 인접 지역 정의 (성남 기준 예시)
  const adjacentCities: Record<string, string[]> = {
    '성남': ['광주', '하남', '용인', '수원'],
    '수원': ['용인', '화성', '오산', '성남'],
    '용인': ['성남', '수원', '화성', '광주'],
    // 필요시 다른 도시도 추가
  };

  const getLocationScore = (card: Card): number => {
    let location = '';

    if (card.type === 'job') {
      location = (card as JobPostingCard).location || '';
    } else if (card.type === 'talent') {
      location = (card as any).location || '';
    }

    const normalizedLocation = normalizeCity(location);

    // 1순위: 같은 구 (예: 분당)
    if (userDistrict && normalizedLocation.includes(userDistrict)) {
      return 1000;
    }

    // 2순위: 같은 시 (예: 성남)
    if (normalizedLocation.includes(userCity)) {
      return 900;
    }

    // 3순위: 인접 도시 (예: 광주, 하남, 용인, 수원)
    const adjacentList = adjacentCities[userCity] || [];
    for (let i = 0; i < adjacentList.length; i++) {
      if (normalizedLocation.includes(adjacentList[i])) {
        return 800 - (i * 10); // 순서대로 점수 감소
      }
    }

    // 4순위: 경기도 (기타 지역)
    if (normalizedLocation.includes('경기') || normalizedLocation.length > 0) {
      return 100;
    }

    // 5순위: 기타 (location 정보 없음)
    return 0;
  };

  const sortedCards = [...cards].sort((a, b) => {
    const scoreA = getLocationScore(a);
    const scoreB = getLocationScore(b);
    return scoreB - scoreA; // 높은 점수 우선
  });

  console.log('✅ [카드 정렬] 완료');
  console.log('  - 정렬된 카드 샘플 (처음 5개):', sortedCards.slice(0, 5).map(c => ({
    type: c.type,
    location: c.type === 'job' ? (c as any).location : (c as any).location,
    score: getLocationScore(c)
  })));

  return sortedCards;
}

export default function App() {
  const {
    searchQuery,
    filters,
    viewType,
    limit,
    offset,
    lastUpdatedAt,
    loadMore,
    hasActiveSearch,
    setFilters
  } = useSearchStore((state) => ({
    searchQuery: state.searchQuery,
    filters: state.filters,
    viewType: state.viewType,
    limit: state.limit,
    offset: state.offset,
    lastUpdatedAt: state.lastUpdatedAt,
    loadMore: state.loadMore,
    hasActiveSearch: state.hasActiveSearch(),
    setFilters: state.setFilters
  }));

  const { initialize, status, user } = useAuthStore((state) => ({
    initialize: state.initialize,
    status: state.status,
    user: state.user
  }));

  // 위치 기반 자동 추천 (익명 사용자용)
  const { address, loading: locationLoading, permissionDenied } = useGeolocation();
  const [userLocation, setUserLocation] = useState<{ city: string; district: string } | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isProfileViewOpen, setProfileViewOpen] = useState(false);
  const [isEditMode, setEditMode] = useState(false);
  const [profileInitialData, setProfileInitialData] = useState<{
    displayName: string | null;
    roles: RoleOption[] | null;
    primaryRegion: string | null;
    interestRegions: string[] | null;
    experienceYears: number | null;
    receiveNotifications: boolean | null;
    intro: string | null;
    agreeTerms: boolean | null;
    agreePrivacy: boolean | null;
    agreeMarketing: boolean | null;
  } | null>(null);
  const [recommendationCards, setRecommendationCards] = useState<Card[]>([]);
  const [recommendationHeadline, setRecommendationHeadline] = useState<string | undefined>(undefined);
  const [recommendationDescription, setRecommendationDescription] = useState<string | undefined>(undefined);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [recommendationReloadKey, setRecommendationReloadKey] = useState(0);
  const [promoCards, setPromoCards] = useState<PromoCardSettings[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<UserProfileRow | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login'>('signup');
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [editingJob, setEditingJob] = useState<JobPostingCard | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceCard | null>(null);
  const [isExperienceEditOpen, setIsExperienceEditOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceCard | null>(null);
  const [highlightTalentId, setHighlightTalentId] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // AI 추천 카드 클릭 시 전체 데이터 조회
  const handleCardClick = async (card: Card) => {
    console.log('카드 클릭:', card);

    // 체험 카드 처리
    if (card.type === 'experience') {
      setSelectedExperience(card as ExperienceCard);
      return;
    }

    if (card.type !== 'job') return;

    // 이미 완전한 데이터를 가지고 있는지 확인 (하단 카드는 모든 필드가 있음)
    const hasFullData = 'attachment_url' in card || 'source_url' in card || 'structured_content' in card;

    if (hasFullData) {
      // 하단 카드 - 이미 전체 데이터를 가지고 있음
      setSelectedJob(card as JobPostingCard);
    } else {
      // AI 추천 카드 - DB에서 전체 데이터 조회 필요
      console.log('AI 추천 카드 - 전체 데이터 조회 중...');
      try {
        const response = await searchCards({
          limit: 1000,
          offset: 0,
          viewType: 'job'
        });

        // ID가 일치하는 카드 찾기
        const fullCard = response.cards.find(c => c.id === card.id);
        if (fullCard && fullCard.type === 'job') {
          console.log('전체 데이터 조회 완료:', fullCard);
          setSelectedJob(fullCard as JobPostingCard);
        } else {
          // 검색으로 못 찾으면 원본 카드라도 표시
          console.warn('전체 데이터 조회 실패, 원본 카드 사용');
          setSelectedJob(card as JobPostingCard);
        }
      } catch (error) {
        console.error('카드 데이터 조회 실패:', error);
        // 에러 시에도 원본 카드라도 표시
        setSelectedJob(card as JobPostingCard);
      }
    }
  };

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // 주소 정규화 함수 (캐시된 데이터도 처리)
  const normalizeAddress = (addr: { city: string; district: string }) => {
    // "성남시 분당구" → "성남" 형태로 변환
    // 1. 먼저 "시", "구" 제거
    // 2. 그 다음 공백 제거
    // 3. 첫 번째 단어만 추출 (예: "성남시 분당구" → "성남")
    const cityParts = addr.city.replace(/시/g, '').replace(/구/g, '').trim().split(/\s+/);
    const city = cityParts[0] || '';

    const districtParts = addr.district.replace(/시/g, '').replace(/구/g, '').trim().split(/\s+/);
    const district = districtParts[0] || '';

    return { city, district };
  };

  // 위치 기반 정렬을 위한 사용자 위치 저장
  // - 익명 사용자: 브라우저 geolocation 사용
  // - 로그인 사용자: 프로필 interest_regions 사용
  useEffect(() => {
    console.log('🔍 [위치 기반 정렬] useEffect 실행');
    console.log('  - user:', user);
    console.log('  - userProfile:', userProfile);
    console.log('  - permissionDenied:', permissionDenied);
    console.log('  - hasActiveSearch:', hasActiveSearch);
    console.log('  - address (브라우저):', address);

    // 사용자가 수동으로 필터를 설정한 경우 자동 적용 안 함
    if (hasActiveSearch) {
      console.log('  ⏭️ 수동 검색/필터 활성화 - 위치정렬 비활성화');
      setUserLocation(null);
      return;
    }

    // 로그인 사용자: 프로필의 interest_regions 사용
    if (user && userProfile) {
      const profileRegion = userProfile.interest_regions?.[0];
      if (profileRegion) {
        console.log('  ✅ 로그인 사용자 - 프로필 지역 사용:', profileRegion);
        // 프로필 지역도 정규화 (혹시 "성남시" 형태로 저장되었을 수 있음)
        const normalized = {
          city: profileRegion.replace(/시$/, ''),
          district: ''  // 프로필에는 시/군 단위만 저장
        };
        console.log('  - 정규화된 지역:', normalized);
        setUserLocation(normalized);
        console.log(`📍 [정렬 모드] 프로필 선호 지역(${normalized.city})을 기준으로 카드를 정렬합니다.`);
        return;
      } else {
        console.log('  ⏭️ 로그인 사용자 - 프로필에 선호 지역 없음');
        setUserLocation(null);
        return;
      }
    }

    // 익명 사용자: 브라우저 geolocation 사용
    if (!user) {
      // 위치 권한 거부 시 전체 공고 표시
      if (permissionDenied) {
        console.log('  ⏭️ 익명 사용자 - 위치 권한 거부');
        setUserLocation(null);
        return;
      }

      // 위치 정보 획득 성공 시 userLocation state 업데이트
      if (address && address.city) {
        console.log('  ✅ 익명 사용자 - 브라우저 위치 사용');
        console.log('  - 감지된 도시 (원본):', address.city);
        console.log('  - 감지된 구 (원본):', address.district);

        // 중요: 캐시된 데이터도 정규화 처리
        const normalized = normalizeAddress(address);
        console.log('  - 정규화된 도시:', normalized.city);
        console.log('  - 정규화된 구:', normalized.district);

        setUserLocation(normalized);

        console.log(`📍 [정렬 모드] 현재 위치(${normalized.city})를 기준으로 카드를 정렬합니다.`);
        console.log('✅ 모든 지역 카드를 표시하되, 가까운 지역 우선 정렬합니다!');
      } else {
        console.log('  ⏭️ 익명 사용자 - 위치 정보 없음');
        setUserLocation(null);
      }
    }
  }, [address, user, userProfile, permissionDenied, hasActiveSearch]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setProfileModalOpen(false);
      return;
    }

    const currentUserId = user?.id;

    if (!currentUserId) {
      return;
    }

    let cancelled = false;

    async function ensureProfile(targetUserId: string) {
      try {
        const { data, error } = await fetchUserProfile(targetUserId);

        if (cancelled) return;

        if (error) {
          console.error('프로필 확인 실패:', error.message);
        }

        if (data) {
          sessionStorage.removeItem('profileSetupPending');
          setProfileModalOpen(false);
        } else {
          sessionStorage.setItem('profileSetupPending', 'true');
          setProfileModalOpen(true);
        }
      } catch (profileError) {
        if (cancelled) return;
        console.error('프로필 조회 중 예기치 못한 오류:', profileError);
      }
    }

    void ensureProfile(currentUserId);

    return () => {
      cancelled = true;
    };
  }, [status, user?.id]);

  // 랜딩페이지에서 등록한 인력카드 하이라이트
  useEffect(() => {
    const registeredInfo = getRegisteredTalentFromLocalStorage();

    if (!registeredInfo) return;

    const { id, registered_at } = registeredInfo;
    const registeredTime = new Date(registered_at).getTime();
    const now = Date.now();

    // 10분 이내 등록이면 하이라이트
    if (now - registeredTime < 10 * 60 * 1000) {
      setHighlightTalentId(id);

      // 인력카드 토글을 talent로 자동 전환
      useSearchStore.setState({ viewType: 'talent' });

      // 5초 후 하이라이트 제거
      const timeout = setTimeout(() => {
        setHighlightTalentId(null);
        clearRegisteredTalentFromLocalStorage();
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      // 10분 초과 시 LocalStorage 정리
      clearRegisteredTalentFromLocalStorage();
    }
  }, []);

  const handleProfileClose = () => {
    console.log('[DEBUG] handleProfileClose 호출됨');
    sessionStorage.removeItem('profileSetupPending');
    sessionStorage.removeItem('awarenessModalShown');
    setProfileModalOpen(false);
    setEditMode(false);
    setProfileInitialData(null);
    console.log('[DEBUG] handleProfileClose 종료');
  };

  const handleProfileViewClose = () => {
    console.log('[DEBUG] handleProfileViewClose 호출됨');
    setProfileViewOpen(false);
    console.log('[DEBUG] handleProfileViewClose 종료');
  };

  const handleProfileComplete = () => {
    console.log('[DEBUG] handleProfileComplete 호출됨', { isEditMode });
    sessionStorage.removeItem('profileSetupPending');
    console.log('[DEBUG] profileSetupPending 제거됨');
    setProfileModalOpen(false);
    console.log('[DEBUG] setProfileModalOpen(false) 실행');
    setRecommendationReloadKey((prev) => prev + 1);
    console.log('[DEBUG] setRecommendationReloadKey 실행');
    setEditMode(false);
    console.log('[DEBUG] handleProfileComplete 종료');
  };

  const handleOpenProfileView = () => {
    if (status !== 'authenticated' || !user?.id) {
      return;
    }
    setProfileViewOpen(true);
  };

  const handleLoginClick = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleSignupClick = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const handleSelectProvider = async (provider: AuthProvider) => {
    try {
      setLoadingProvider(provider);
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === 'kakao' ? { prompt: 'login' } : undefined
        } as Record<string, unknown>
      });

      if (error) {
        console.error('소셜 로그인 오류:', error.message);
      }
    } catch (error) {
      console.error('소셜 로그인 처리 중 오류:', error);
    } finally {
      setLoadingProvider(null);
      setIsAuthModalOpen(false);
    }
  };

  const handleJobEditClick = (card: Card) => {
    if (card.type !== 'job') return;
    setEditingJob(card as JobPostingCard);
    setIsEditFormOpen(true);
    // 상세보기 모달 닫기
    setSelectedJob(null);
  };

  const handleEditFormClose = () => {
    setIsEditFormOpen(false);
    setEditingJob(null);
  };

  const handleEditFormSuccess = (updatedJob: JobPostingCard) => {
    // 카드 목록 업데이트
    setCards(prevCards =>
      prevCards.map(card =>
        card.id === updatedJob.id && card.type === 'job'
          ? updatedJob
          : card
      )
    );
    // 상세보기 모달도 업데이트
    if (selectedJob?.id === updatedJob.id) {
      setSelectedJob(updatedJob);
    }
    handleEditFormClose();
  };

  const handleEditFormDelete = (jobId: string) => {
    // 목록에서 제거
    setCards((prev) => prev.filter((c) => !(c.type === 'job' && c.id === jobId)));
    // 상세보기 상태 초기화
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
    }
    handleEditFormClose();
  };

  const handleExperienceEditClick = (card: Card) => {
    if (card.type !== 'experience') return;
    setEditingExperience(card as ExperienceCard);
    setIsExperienceEditOpen(true);
  };

  const handleExperienceEditClose = () => {
    setIsExperienceEditOpen(false);
    setEditingExperience(null);
  };

  const handleExperienceEditSuccess = (updatedExperience: ExperienceCard) => {
    // 카드 목록 업데이트
    setCards(prevCards =>
      prevCards.map(card =>
        card.id === updatedExperience.id && card.type === 'experience'
          ? updatedExperience
          : card
      )
    );
    handleExperienceEditClose();
  };

  const handleExperienceEditDelete = (experienceId: string) => {
    // 목록에서 제거
    setCards((prev) => prev.filter((c) => !(c.type === 'experience' && c.id === experienceId)));
    handleExperienceEditClose();
  };

  const handleExperienceDeleteClick = (card: Card) => {
    if (card.type !== 'experience') return;
    if (!confirm('정말로 삭제하시겠어요? 삭제 후 복구할 수 없습니다.')) {
      return;
    }
    // ExperienceEditModal의 handleDelete와 동일한 로직
    setEditingExperience(card as ExperienceCard);
    setIsExperienceEditOpen(true);
    // 모달에서 삭제 버튼 클릭 시 처리됨
  };

  const normalizeProfileForEdit = (data: UserProfileRow | null | undefined) => {
    if (!data) {
      setProfileInitialData(null);
      return;
    }

    const roleList = Array.isArray(data.roles)
      ? data.roles.filter((role): role is RoleOption => ROLE_OPTIONS.includes(role as RoleOption))
      : [];

    setProfileInitialData({
      displayName: data.display_name,
      roles: roleList,
      primaryRegion: data.primary_region,
      interestRegions: data.interest_regions,
      experienceYears: data.experience_years,
      receiveNotifications: data.receive_notifications,
      intro: data.intro,
      agreeTerms: data.agree_terms,
      agreePrivacy: data.agree_privacy,
      agreeMarketing: data.agree_marketing
    });
  };

  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadPromoCards() {
      try {
        const data = await fetchPromoCards({ onlyActive: true });
        if (!cancelled) {
          setPromoCards(data);
        }
      } catch (promoError) {
        if (!cancelled) {
          console.error('프로모 카드 불러오기 실패:', promoError);
          setPromoCards([]);
        }
      }
    }

    void loadPromoCards();

    return () => {
      cancelled = true;
    };
  }, [recommendationReloadKey]);

  useEffect(() => {
    if (status !== 'authenticated' || !userId) {
      setRecommendationCards([]);
      setRecommendationHeadline('추천을 준비 중이에요');
      setRecommendationDescription('로그인 후 프로필을 저장하면 맞춤 추천을 볼 수 있어요.');
      setRecommendationLoading(false);
      return;
    }

    const targetUserId = userId;
    const targetUserEmail = userEmail;
    let cancelled = false;
    async function loadRecommendations() {
      setRecommendationLoading(true);
      try {
        // 프로필, 캐시, 신규 공고 동시 조회 (Phase 2: 하이브리드 전략)
        const [cacheResult, profileResult, freshJobs] = await Promise.all([
          fetchRecommendationsCache(targetUserId),
          fetchUserProfile(targetUserId),
          fetchFreshJobs(6, 10)  // 최근 6시간 신규 공고 최대 10개
        ]);

        if (cancelled) return;

        const cache = cacheResult;
        const profile = profileResult.data;
        
        // 프로필 상태 업데이트
        if (profile) {
          setUserProfile(profile);
        }

        // 스마트 캐시 무효화 검사 (Phase 2 개선)
        const cacheData = cache ? {
          cards: cache.cards,
          updated_at: cache.updatedAt,
          profile_snapshot: cache.profileSnapshot as Record<string, unknown>
        } : null;

        const needsInvalidation = shouldInvalidateCache(cacheData, profile as Record<string, unknown>);

        if (!needsInvalidation && cache && cache.cards.length > 0) {
          // 캐시가 유효하고 프로필이 변경되지 않았으면 캐시 사용 + 신규 공고 병합
          let sourceCards = cache.cards;

          // Phase 2: 신규 공고를 캐시 앞에 병합 (최대 3개)
          if (freshJobs && freshJobs.length > 0) {
            const freshJobIds = new Set(freshJobs.map(j => j.id));
            const uniqueFreshJobs = freshJobs.filter((_, idx) => idx < 3);  // 최대 3개
            const cachedWithoutDuplicates = sourceCards.filter(c => !freshJobIds.has(c.id));
            sourceCards = [...uniqueFreshJobs, ...cachedWithoutDuplicates];
          }

          // Edge Function이 이미 프로필 기반 최적화를 수행했으므로
          // 프론트엔드에서는 마감 지난 공고만 제거
          const filteredCards = filterExpiredJobs(sourceCards);

          // 최종 카드 설정 (최대 6개)
          const finalCards = filteredCards.slice(0, 6);
          setRecommendationCards(finalCards);
          setRecommendedIds(new Set(finalCards.map((c) => c.id)));
          // Edge Function에서 생성한 AI 코멘트 사용
          setRecommendationHeadline(cache.aiComment?.headline);
          setRecommendationDescription(cache.aiComment?.description);
        } else {
          // 캐시가 무효하거나 없음 → Edge Function을 호출하여 추천 생성
          const gen = await generateRecommendations();
          if (gen && Array.isArray(gen.cards) && gen.cards.length > 0) {
            const sourceCards = gen.cards;

            // Edge Function이 이미 프로필 기반 최적화를 수행했으므로
            // 프론트엔드에서는 마감 지난 공고만 제거
            const filteredCards = filterExpiredJobs(sourceCards);

            // 최종 카드 설정 (최대 6개)
            const finalCards = filteredCards.slice(0, 6);
            setRecommendationCards(finalCards);
            setRecommendedIds(new Set(finalCards.map((c) => c.id)));
            // Edge Function에서 생성한 AI 코멘트 사용
            setRecommendationHeadline(gen.aiComment?.headline);
            setRecommendationDescription(gen.aiComment?.description);
          } else {
            // 생성 실패 시 최소한 기본 상태 유지
            setRecommendationCards([]);
            setRecommendationHeadline(undefined);
            setRecommendationDescription(undefined);
          }
        }
      } catch (loadError) {
        console.error('추천 캐시 조회 실패:', loadError);
        if (!cancelled) {
          setRecommendationCards([]);
          setRecommendationHeadline('추천을 준비 중이에요');
          setRecommendationDescription('추천 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        if (!cancelled) {
          setRecommendationLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [status, userId, userEmail, recommendationReloadKey]);

  useEffect(() => {
    let active = true;

    async function loadCards() {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      console.log('🔍 [카드 검색] searchCards 호출');
      console.log('  - searchQuery:', searchQuery);
      console.log('  - filters:', filters);
      console.log('  - viewType:', viewType);
      console.log('  - limit:', limit);
      console.log('  - offset:', offset);

      try {
        const { cards: nextCards, totalCount: nextTotalCount } = await searchCards({
          searchQuery,
          filters,
          viewType,
          limit,
          offset
        });

        console.log('✅ [카드 검색 결과]');
        console.log('  - 반환된 카드 수:', nextCards.length);
        console.log('  - 전체 개수:', nextTotalCount);
        console.log('  - 카드 샘플 (처음 3개):', nextCards.slice(0, 3).map(c => ({
          id: c.id,
          type: c.type,
          title: c.type === 'job' ? (c as any).title : c.type === 'talent' ? (c as any).name : (c as any).programTitle,
          location: c.type === 'job' ? (c as any).location : c.type === 'talent' ? (c as any).location : undefined
        })));

        if (!active) return;

        // 위치 기반 정렬 (첫 페이지만)
        // - 익명 사용자: 브라우저 geolocation 기반
        // - 로그인 사용자: 프로필 interest_regions 기반
        let sortedCards = nextCards;
        if (userLocation && offset === 0) {
          sortedCards = sortCardsByLocation(nextCards, userLocation);
        }

        // 추천 ID 우선 정렬: 상단 추천과 동일 카드가 하단에서도 위로 오도록
        const promote = (arr: typeof sortedCards) => {
          if (!recommendedIds || recommendedIds.size === 0) return arr;
          const withScore = arr.map((c) => ({ c, s: recommendedIds.has(c.id) ? 1 : 0 }));
          withScore.sort((a, b) => b.s - a.s);
          return withScore.map((x) => x.c);
        };

        const promoted = promote(sortedCards);
        setCards((prev) => (offset === 0 ? promoted : [...prev, ...promoted]));
        setTotalCount(nextTotalCount);
      } catch (fetchError) {
        if (!active) return;
        console.error('카드 검색 실패:', fetchError);
        setError('데이터를 불러오는 중 문제가 발생했습니다.');
      } finally {
        if (!active) return;
        if (offset === 0) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    }

    loadCards();

    return () => {
      active = false;
    };
  }, [searchQuery, filters, viewType, limit, offset, lastUpdatedAt, userLocation, user]);

  const searchSummary = useMemo(() => {
    if (!searchQuery.trim()) {
      return '전체';
    }
    return searchQuery.trim();
  }, [searchQuery]);

  const canLoadMore = cards.length < totalCount;

  // 디버깅: 화면 너비 및 모바일/PC 렌더링 확인
  useEffect(() => {
    console.log('[App] 화면 정보:');
    console.log('  - window.innerWidth:', window.innerWidth);
    console.log('  - md 브레이크포인트 (768px) 이상:', window.innerWidth >= 768);
    console.log('  - IntegratedHeaderPromo 렌더링 (md:hidden):', window.innerWidth < 768);
    console.log('  - 기존 Header 렌더링 (hidden md:block):', window.innerWidth >= 768);
    console.log('  - promoCards 개수:', promoCards.length);
  }, [promoCards.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) return;
    if (!canLoadMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px 0px 0px 0px', threshold: 0.1 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [canLoadMore, loading, loadingMore, loadMore]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <ToastContainer />

      {/* 모바일: 통합 헤더-프로모카드 */}
      <div className="md:hidden">
        <IntegratedHeaderPromo
          promoCards={promoCards}
          onSearchClick={() => setIsSearchModalOpen(true)}
          onNotificationClick={() => alert('알림 기능 준비 중입니다')}
          onBookmarkClick={() => alert('북마크 기능 준비 중입니다')}
          notificationCount={0}
        />
      </div>

      {/* PC: 기존 헤더 */}
      <div className="hidden md:block">
        <Header onProfileClick={handleOpenProfileView} />
      </div>

      {/* 등록 버튼 섹션 (모바일) - PC에서만 표시 (추후 플로팅 메뉴로 대체 예정) */}
      <div className="hidden md:block">
        <RegisterButtonsSection />
      </div>

      {/* AI 추천 섹션 - 검색 중이 아닐 때만 표시 */}
      {!hasActiveSearch && (
        <AIRecommendations
          cards={recommendationCards}
          userName={user?.user_metadata?.full_name ?? userEmail ?? undefined}
          loading={recommendationLoading}
          headlineOverride={recommendationHeadline}
          descriptionOverride={recommendationDescription}
          promoCards={promoCards}
          profile={userProfile}
          onCardClick={handleCardClick}
        />
      )}

      {/* 통계 배너 - 모바일에서는 표시 안 함 */}
      {/* <StatisticsBanner
        newJobsCount={15}
        urgentJobsCount={8}
        newTalentsCount={23}
        popularKeywords={['수원', '중등', '기간제', '방과후']}
      /> */}

      {/* 프로모 배너: AIRecommendations 컴포넌트 내부에서 처리 (중복 제거) */}

      {/* 메인 콘텐츠 */}
      <main className="bg-white pb-20 md:pb-10">
        <div className="max-w-container mx-auto px-6 pt-4">
          {/* 위치 기반 정렬 안내 */}
          {userLocation && !hasActiveSearch && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      {user ? '프로필 기반 위치 정렬' : '현재 위치 기반 정렬'}
                    </p>
                    <p className="text-sm text-blue-700">
                      {userLocation.city} {userLocation.district && `${userLocation.district} `}지역을 중심으로 가까운 순서로 정렬하고 있습니다
                      {user && ' (프로필 선호 지역 기준)'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setUserLocation(null);
                    localStorage.removeItem('user_location');
                  }}
                  className="ml-4 text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                >
                  정렬 해제
                </button>
              </div>
            </div>
          )}

          {/* 위치 확인 중 로딩 (익명 사용자만) */}
          {!user && locationLoading && !hasActiveSearch && (
            <div className="bg-gray-50 border border-gray-200 p-4 mb-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600">
                  📍 현재 위치를 확인하고 있습니다...
                </p>
              </div>
            </div>
          )}

          {/* AI 검색 결과 메시지 - 모바일에서는 숨김 */}
          <div className="hidden md:block">
            <AIInsightBox
              resultCount={totalCount}
              searchQuery={searchSummary}
              topResultIndex={1}
            />
          </div>

          {/* 로딩 상태 */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-gray-500">공고를 불러오는 중...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-16 gap-3 text-sm text-gray-600">
              <span>{error}</span>
              <button
                onClick={() => useSearchStore.getState().resetAll()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
              >
                다시 시도
              </button>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2 text-center text-gray-500">
              <p>조건에 맞는 결과가 없습니다.</p>
              <p className="text-sm">필터를 조정하거나 다른 검색어를 입력해 주세요.</p>
            </div>
          ) : (
            <>
              <CardGrid
                cards={cards}
                onCardClick={handleCardClick}
                onJobEditClick={handleJobEditClick}
                onExperienceEditClick={handleExperienceEditClick}
                onExperienceDeleteClick={handleExperienceDeleteClick}
                highlightTalentId={highlightTalentId}
              />

              <div ref={sentinelRef} className="h-1" aria-hidden />

              {loadingMore && (
                <div className="flex justify-center mt-10">
                  <div className="text-sm text-gray-500">결과를 불러오는 중...</div>
                </div>
              )}

              {!canLoadMore && cards.length > 0 && (
                <div className="flex justify-center mt-10 pb-10">
                  <div className="text-sm text-gray-400">모든 결과를 확인했습니다.</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-container mx-auto px-6 text-center text-gray-500 text-xs">
          <p>© 2025 셀미바이미. All rights reserved.</p>
          <p className="mt-1">교육 인력 매칭 플랫폼</p>
        </div>
      </footer>

      {/* 모바일 하단 네비게이션 */}
      <BottomNav
        onProfileClick={handleOpenProfileView}
        onLoginClick={handleLoginClick}
      />

      <ProfileSetupModal
        isOpen={isProfileModalOpen}
        onClose={handleProfileClose}
        onComplete={handleProfileComplete}
        userEmail={user?.email ?? null}
        userId={user?.id}
        mode={isEditMode ? 'edit' : 'create'}
        key={`${isEditMode ? 'edit' : 'create'}-${isProfileModalOpen}`}
      />
      <ProfileViewModal
        isOpen={isProfileViewOpen}
        onClose={handleProfileViewClose}
        userId={user?.id}
        userEmail={user?.email}
        onRequestEdit={(profileData) => {
          if (!user?.id) {
            return;
          }

          console.log('[App] onRequestEdit 호출됨:', {
            hasProfileData: !!profileData,
            currentEditMode: isEditMode,
            currentProfileModalOpen: isProfileModalOpen
          });

          if (profileData) {
            console.log('[App] 프로필 데이터 있음 - 즉시 모달 열기');
            normalizeProfileForEdit(profileData);
            setEditMode(true);
            console.log('[App] setEditMode(true) 완료');
            setProfileViewOpen(false);
            setProfileModalOpen(true);
            console.log('[App] setProfileModalOpen(true) 완료');
            return;
          }

          console.log('[App] 프로필 데이터 없음 - 프로필 재로드');
          void fetchUserProfile(user.id).then(({ data }) => {
            normalizeProfileForEdit(data ?? null);
            setEditMode(true);
            console.log('[App] setEditMode(true) 완료 (비동기)');
            setProfileViewOpen(false);
            setProfileModalOpen(true);
            console.log('[App] setProfileModalOpen(true) 완료 (비동기)');
          });
        }}
      />

      {/* 통합 상세보기 모달 */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          onEditClick={handleJobEditClick}
        />
      )}

      {/* 체험 상세보기 모달 */}
      {selectedExperience && (
        <ExperienceDetailModal
          experience={selectedExperience}
          isOpen={!!selectedExperience}
          onClose={() => setSelectedExperience(null)}
          onEditClick={handleExperienceEditClick}
          onDeleteClick={handleExperienceDeleteClick}
        />
      )}

      {/* 공고 수정 모달 */}
      {editingJob && (
        <JobPostingEditModal
          job={editingJob}
          isOpen={isEditFormOpen}
          onClose={handleEditFormClose}
          onSuccess={handleEditFormSuccess}
          onDelete={handleEditFormDelete}
        />
      )}

      {/* 체험 수정 모달 */}
      {editingExperience && (
        <ExperienceEditModal
          experience={editingExperience}
          isOpen={isExperienceEditOpen}
          onClose={handleExperienceEditClose}
          onSuccess={handleExperienceEditSuccess}
          onDelete={handleExperienceEditDelete}
        />
      )}

      {/* 소셜 로그인/회원가입 모달 */}
      <SocialSignupModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (!loadingProvider) {
            setIsAuthModalOpen(false);
          }
        }}
        onSelectProvider={handleSelectProvider}
        loadingProvider={loadingProvider}
        mode={authModalMode}
      />
    </div>
  );
}
