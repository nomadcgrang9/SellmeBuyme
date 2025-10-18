import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/layout/Header';
import AIRecommendations from '@/components/ai/AIRecommendations';
import AIInsightBox from '@/components/ai/AIInsightBox';
import CardGrid from '@/components/cards/CardGrid';
import { aiRecommendations } from '@/lib/dummyData';
import { searchCards } from '@/lib/supabase/queries';
import { useSearchStore } from '@/stores/searchStore';
import type { Card } from '@/types';

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

  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      {/* 헤더 */}
      <Header />

      {/* AI 추천 섹션 */}
      <AIRecommendations cards={aiRecommendations} userName="방문자" />

      {/* 메인 콘텐츠 */}
      <main className="max-w-container mx-auto px-6 pt-4 pb-10">
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

        {/* 무한 스크롤 로딩 표시 (더미) */}
        {!loading && !error && cards.length === 0 && (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-400 text-sm">검색 결과가 없습니다.</div>
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-16 py-6">
        <div className="max-w-container mx-auto px-6 text-center text-gray-500 text-xs">
          <p>© 2025 셀미바이미. All rights reserved.</p>
          <p className="mt-1">교육 인력 매칭 플랫폼</p>
        </div>
      </footer>
    </div>
  );
}
