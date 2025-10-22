import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import AIRecommendations from '@/components/ai/AIRecommendations';
import AIInsightBox from '@/components/ai/AIInsightBox';
import CardGrid from '@/components/cards/CardGrid';
import ProfileSetupModal, { ROLE_OPTIONS, type RoleOption } from '@/components/auth/ProfileSetupModal';
import ProfileViewModal from '@/components/auth/ProfileViewModal';
import ToastContainer from '@/components/common/ToastContainer';
import { searchCards, fetchRecommendationsCache, fetchPromoCardSettings } from '@/lib/supabase/queries';
import { fetchUserProfile, type UserProfileRow } from '@/lib/supabase/profiles';
import { useSearchStore } from '@/stores/searchStore';
import { useAuthStore } from '@/stores/authStore';
import type { Card, PromoCardSettings } from '@/types';

export default function App() {
  const {
    searchQuery,
    filters,
    viewType,
    limit,
    offset,
    lastUpdatedAt,
    loadMore
  } = useSearchStore((state) => ({
    searchQuery: state.searchQuery,
    filters: state.filters,
    viewType: state.viewType,
    limit: state.limit,
    offset: state.offset,
    lastUpdatedAt: state.lastUpdatedAt,
    loadMore: state.loadMore
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
  const [recommendationHeadline, setRecommendationHeadline] = useState<string>('추천을 준비 중이에요');
  const [recommendationDescription, setRecommendationDescription] = useState<string>('프로필 정보를 기반으로 맞춤 카드를 정리하고 있습니다.');
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [recommendationReloadKey, setRecommendationReloadKey] = useState(0);
  const [promoCard, setPromoCard] = useState<PromoCardSettings | null>(null);

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
    sessionStorage.removeItem('profileSetupPending');
    setProfileModalOpen(false);
    setEditMode(false);
    setProfileInitialData(null);
  };

  const handleProfileComplete = () => {
    sessionStorage.removeItem('profileSetupPending');
    setProfileModalOpen(false);
    setRecommendationReloadKey((prev) => prev + 1);
    if (isEditMode) {
      setProfileViewOpen(true);
    }
    setEditMode(false);
  };

  const handleOpenProfileView = () => {
    if (status !== 'authenticated' || !user?.id) {
      return;
    }
    setProfileViewOpen(true);
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

    async function loadPromoCard() {
      try {
        const data = await fetchPromoCardSettings({ onlyActive: true });
        if (!cancelled) {
          setPromoCard(data);
        }
      } catch (promoError) {
        if (!cancelled) {
          console.error('프로모 카드 불러오기 실패:', promoError);
          setPromoCard(null);
        }
      }
    }

    void loadPromoCard();

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
        const cache = await fetchRecommendationsCache(targetUserId);
        if (cancelled) return;

        if (cache && cache.cards.length > 0) {
          setRecommendationCards(cache.cards);
          const headline = cache.aiComment?.headline ?? `${targetUserEmail ?? '회원님'}을 위한 추천을 준비했어요`;
          const description = cache.aiComment?.description ?? '프로필 기반으로 최근 카드들을 정리했습니다.';
          setRecommendationHeadline(headline);
          setRecommendationDescription(description);
        } else {
          setRecommendationCards([]);
          setRecommendationHeadline('추천을 준비 중이에요');
          setRecommendationDescription('프로필을 최신 상태로 저장하면 맞춤 추천을 받을 수 있어요.');
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

        setCards((prev) => (offset === 0 ? nextCards : [...prev, ...nextCards]));
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
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      {/* 헤더 */}
      <Header onProfileClick={handleOpenProfileView} />

      {/* AI 추천 섹션 */}
      <AIRecommendations
        cards={recommendationCards}
        userName={user?.user_metadata?.full_name ?? userEmail ?? undefined}
        loading={recommendationLoading}
        headlineOverride={recommendationHeadline}
        descriptionOverride={recommendationDescription}
        promoCard={promoCard}
      />

      {/* 메인 콘텐츠 */}
      <main className="bg-gradient-to-b from-[#edf0f5] via-[#e2e5ec] to-[#d9dce3]">
        <div className="max-w-container mx-auto px-6 pt-4 pb-10">
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
              <CardGrid cards={cards} />

              <div ref={sentinelRef} className="h-1" aria-hidden />

              {loadingMore && (
                <div className="flex justify-center mt-10">
                  <div className="text-sm text-gray-500">결과를 불러오는 중...</div>
                </div>
              )}

              {!canLoadMore && cards.length > 0 && (
                <div className="flex justify-center mt-10">
                  <div className="text-sm text-gray-400">모든 결과를 확인했습니다.</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-6">
        <div className="max-w-container mx-auto px-6 text-center text-gray-500 text-xs">
          <p>© 2025 셀미바이미. All rights reserved.</p>
          <p className="mt-1">교육 인력 매칭 플랫폼</p>
        </div>
      </footer>

      <ProfileSetupModal
        isOpen={isProfileModalOpen}
        onClose={handleProfileClose}
        onComplete={handleProfileComplete}
        userEmail={user?.email ?? null}
        userId={user?.id}
        mode={isEditMode ? 'edit' : 'create'}
        initialData={profileInitialData ?? undefined}
      />
      <ProfileViewModal
        isOpen={isProfileViewOpen}
        onClose={() => setProfileViewOpen(false)}
        userId={user?.id}
        userEmail={user?.email}
        onRequestEdit={(profileData) => {
          if (!user?.id) {
            return;
          }

          if (profileData) {
            normalizeProfileForEdit(profileData);
            setEditMode(true);
            setProfileViewOpen(false);
            setProfileModalOpen(true);
            return;
          }

          void fetchUserProfile(user.id).then(({ data }) => {
            normalizeProfileForEdit(data ?? null);
            setEditMode(true);
            setProfileViewOpen(false);
            setProfileModalOpen(true);
          });
        }}
      />
    </div>
  );
}
