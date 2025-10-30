import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import AIRecommendations from '@/components/ai/AIRecommendations';
import AIInsightBox from '@/components/ai/AIInsightBox';
import CardGrid from '@/components/cards/CardGrid';
import JobDetailModal from '@/components/cards/JobDetailModal';
import JobPostingEditModal from '@/components/forms/JobPostingEditModal';
import ProfileSetupModal, { ROLE_OPTIONS, type RoleOption } from '@/components/auth/ProfileSetupModal';
import ProfileViewModal from '@/components/auth/ProfileViewModal';
import SocialSignupModal, { type AuthProvider } from '@/components/auth/SocialSignupModal';
import ToastContainer from '@/components/common/ToastContainer';
import RegisterButtonsSection from '@/components/mobile/RegisterButtonsSection';
import StatisticsBanner from '@/components/mobile/StatisticsBanner';
import BottomNav from '@/components/mobile/BottomNav';
import PromoCardStack from '@/components/promo/PromoCardStack';
import { searchCards, fetchRecommendationsCache, isCacheValid, hasProfileChanged, fetchPromoCards, selectRecommendationCards, filterByTeacherLevel, filterByJobType, calculateSubjectScore, filterByExperience, generateRecommendations } from '@/lib/supabase/queries';
import { fetchUserProfile, type UserProfileRow } from '@/lib/supabase/profiles';
import { useSearchStore } from '@/stores/searchStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import type { Card, PromoCardSettings, JobPostingCard } from '@/types';

export default function App() {
  const {
    searchQuery,
    filters,
    viewType,
    limit,
    offset,
    lastUpdatedAt,
    loadMore,
    hasActiveSearch
  } = useSearchStore((state) => ({
    searchQuery: state.searchQuery,
    filters: state.filters,
    viewType: state.viewType,
    limit: state.limit,
    offset: state.offset,
    lastUpdatedAt: state.lastUpdatedAt,
    loadMore: state.loadMore,
    hasActiveSearch: state.hasActiveSearch()
  }));

  const { initialize, status, user } = useAuthStore((state) => ({
    initialize: state.initialize,
    status: state.status,
    user: state.user
  }));

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

  // AI 추천 카드 클릭 시 전체 데이터 조회
  const handleCardClick = async (card: Card) => {
    console.log('카드 클릭:', card);
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
        // 프로필과 캐시 동시 조회
        const [cacheResult, profileResult] = await Promise.all([
          fetchRecommendationsCache(targetUserId),
          fetchUserProfile(targetUserId)
        ]);
        
        if (cancelled) return;

        const cache = cacheResult;
        const profile = profileResult.data;
        
        // 프로필 상태 업데이트
        if (profile) {
          setUserProfile(profile);
        }

        // 캐시 유효성 검사 및 프로필 변경 감지
        const { isCacheValid, hasProfileChanged } = await import('@/lib/supabase/queries');
        
        const isCacheStillValid = cache && isCacheValid(cache.updatedAt);
        const profileHasChanged = cache && profile && hasProfileChanged(cache.profileSnapshot as Record<string, unknown>, profile as Record<string, unknown>);
        
        if (isCacheStillValid && !profileHasChanged && cache && cache.cards.length > 0) {
          // 캐시가 유효하고 프로필이 변경되지 않았으면 캐시 사용
          const sourceCards = cache.cards;
          let filteredCards = selectRecommendationCards(sourceCards, profile?.roles);
          
          // 교사급 필터링
          if (profile?.teacher_level) {
            filteredCards = filterByTeacherLevel(filteredCards, profile.teacher_level);
          }
          
          // 직종 필터링
          if (profile?.preferred_job_types && profile.preferred_job_types.length > 0) {
            filteredCards = filterByJobType(filteredCards, profile.preferred_job_types);
          }
          
          // 과목 가중치 적용 (정렬)
          if (profile?.preferred_subjects && profile.preferred_subjects.length > 0) {
            filteredCards = filteredCards.sort((a, b) => {
              const scoreA = calculateSubjectScore(a, profile.preferred_subjects);
              const scoreB = calculateSubjectScore(b, profile.preferred_subjects);
              return scoreB - scoreA;
            });
          }

          // 경력 필터링
          if (typeof profile?.experience_years === 'number') {
            filteredCards = filterByExperience(filteredCards, profile.experience_years);
          }
          
          // 필터링 결과가 비면 원본 추천으로 폴백
          const finalCards = (filteredCards.length > 0 ? filteredCards : selectRecommendationCards(sourceCards, profile?.roles)).slice(0, 6);
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
            let filteredCards = selectRecommendationCards(sourceCards, profile?.roles);

            if (profile?.teacher_level) {
              filteredCards = filterByTeacherLevel(filteredCards, profile.teacher_level);
            }
            if (profile?.preferred_job_types && profile.preferred_job_types.length > 0) {
              filteredCards = filterByJobType(filteredCards, profile.preferred_job_types);
            }
            if (profile?.preferred_subjects && profile.preferred_subjects.length > 0) {
              filteredCards = filteredCards.sort((a, b) => {
                const scoreA = calculateSubjectScore(a, profile.preferred_subjects);
                const scoreB = calculateSubjectScore(b, profile.preferred_subjects);
                return scoreB - scoreA;
              });
            }
            if (typeof profile?.experience_years === 'number') {
              filteredCards = filterByExperience(filteredCards, profile.experience_years);
            }

            const finalCards = (filteredCards.length > 0 ? filteredCards : selectRecommendationCards(sourceCards, profile?.roles)).slice(0, 6);
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

      try {
        const { cards: nextCards, totalCount: nextTotalCount } = await searchCards({
          searchQuery,
          filters,
          viewType,
          limit,
          offset
        });

        if (!active) return;

        // 추천 ID 우선 정렬: 상단 추천과 동일 카드가 하단에서도 위로 오도록
        const promote = (arr: typeof nextCards) => {
          if (!recommendedIds || recommendedIds.size === 0) return arr;
          const withScore = arr.map((c) => ({ c, s: recommendedIds.has(c.id) ? 1 : 0 }));
          withScore.sort((a, b) => b.s - a.s);
          return withScore.map((x) => x.c);
        };

        const promoted = promote(nextCards);
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
  }, [searchQuery, filters, viewType, limit, offset, lastUpdatedAt]);

  const searchSummary = useMemo(() => {
    if (!searchQuery.trim()) {
      return '전체';
    }
    return searchQuery.trim();
  }, [searchQuery]);

  const canLoadMore = cards.length < totalCount;

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
      {/* 헤더 (sticky 검색창 포함) */}
      <Header onProfileClick={handleOpenProfileView} />

      {/* 등록 버튼 섹션 (모바일) */}
      <RegisterButtonsSection />

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

      {/* 프로모 배너 (모바일 전용, DB 연동) */}
      {promoCards.length > 0 && (
        <section className="md:hidden bg-white py-3 border-b border-gray-200">
          <div className="max-w-container mx-auto px-6">
            <PromoCardStack
              cards={promoCards}
              className="w-full h-[227px]"
            />
          </div>
        </section>
      )}

      {/* 메인 콘텐츠 */}
      <main className="bg-white pb-20 md:pb-10">
        <div className="max-w-container mx-auto px-6 pt-4">
          {/* AI 검색 결과 메시지 */}
          <AIInsightBox
            resultCount={totalCount}
            searchQuery={searchSummary}
            topResultIndex={1}
          />

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
