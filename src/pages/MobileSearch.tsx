import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Settings2 } from 'lucide-react';
import CompactJobCard from '@/components/cards/CompactJobCard';
import JobDetailModal from '@/components/cards/JobDetailModal';
import FilterSidebar from '@/components/search/FilterSidebar';
import { useSearchStore } from '@/stores/searchStore';
import { searchCards } from '@/lib/supabase/queries';
import {
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory,
  getPopularKeywords,
  RECOMMENDED_KEYWORDS
} from '@/lib/utils/searchHistory';
import type { Card, JobPostingCard } from '@/types';
import { useActivityTracking } from '@/lib/hooks/useActivityTracking';
import { useGeolocation } from '@/lib/hooks/useGeolocation';

const ITEMS_PER_PAGE = 20;

export default function MobileSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { filters } = useSearchStore();

  // 지역별 접속 통계 수집
  useGeolocation();
  useActivityTracking();

  const [searchInput, setSearchInput] = useState('');
  const [searchHistory, setSearchHistory] = useState(getSearchHistory());
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);

  const popularKeywords = getPopularKeywords();

  // URL 쿼리 파라미터 확인 및 초기 검색
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (query) {
      setSearchInput(query);
      // 검색 로직은 searchInput 변경 감지 useEffect에서 처리됨
    } else {
      // 쿼리가 없으면 인풋에 포커스 (모바일에서만)
      if (window.innerWidth < 768) {
        inputRef.current?.focus();
      }
    }
  }, []);

  // 실시간 검색 (메인페이지와 동일한 로직)
  useEffect(() => {
    let active = true;

    const performSearch = async () => {
      const keyword = searchInput.trim();

      // 검색어가 없으면 검색 결과 숨김
      if (!keyword) {
        setShowResults(false);
        setHasSearched(false);
        setSearchResults([]);
        setTotalCount(0);
        setCurrentOffset(0);
        return;
      }

      // 검색 시작
      setIsSearching(true);
      setHasSearched(true);
      setShowResults(true);
      setCurrentOffset(0); // 새 검색 시 offset 초기화

      try {
        // 검색 실행 - job 타입만 검색
        const response = await searchCards({
          searchQuery: keyword,
          filters, // 필터 전달
          viewType: 'job',
          limit: ITEMS_PER_PAGE,
          offset: 0
        });

        if (!active) return;

        setSearchResults(response.cards);
        setTotalCount(response.totalCount);

        // 검색어 저장 (결과가 있을 때만)
        if (response.cards.length > 0) {
          addSearchHistory(keyword);
          setSearchHistory(getSearchHistory());
        }
      } catch (error) {
        if (!active) return;
        console.error('Search failed:', error);
        setSearchResults([]);
        setTotalCount(0);
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    };

    // 300ms 디바운스
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [searchInput, filters]); // filters 변경 시에도 재검색

  // 더 많은 결과 로드 함수
  const loadMoreResults = useCallback(async () => {
    const keyword = searchInput.trim();
    if (!keyword || isLoadingMore || isSearching) return;

    const nextOffset = currentOffset + ITEMS_PER_PAGE;
    if (nextOffset >= totalCount) return; // 더 이상 로드할 데이터 없음

    setIsLoadingMore(true);

    try {
      const response = await searchCards({
        searchQuery: keyword,
        filters,
        viewType: 'job',
        limit: ITEMS_PER_PAGE,
        offset: nextOffset
      });

      setSearchResults(prev => [...prev, ...response.cards]);
      setCurrentOffset(nextOffset);
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [searchInput, filters, currentOffset, totalCount, isLoadingMore, isSearching]);

  // 무한 스크롤 - IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const hasMore = searchResults.length < totalCount;
    if (!hasMore || isSearching || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMoreResults();
        }
      },
      { rootMargin: '200px 0px 0px 0px', threshold: 0.1 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [searchResults.length, totalCount, isSearching, isLoadingMore, loadMoreResults]);

  // 검색어 클릭 (검색은 useEffect에서 자동 실행)
  const handleKeywordClick = (keyword: string) => {
    setSearchInput(keyword);
  };

  // 최근 검색어 삭제
  const handleRemoveHistory = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSearchHistory(keyword);
    setSearchHistory(getSearchHistory());
  };

  // 전체 삭제
  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
  };

  // 입력 초기화
  const handleClearInput = () => {
    setSearchInput('');
    setShowResults(false);
    setHasSearched(false);
    inputRef.current?.focus();
    // URL 파라미터도 제거 (선택적)
    window.history.pushState({}, '', '/search');
  };

  // 카드 클릭 핸들러
  const handleCardClick = async (card: Card) => {
    if (card.type !== 'job') return;

    // 검색 결과는 이미 전체 데이터를 가지고 있음
    const hasFullData = 'attachment_url' in card || 'source_url' in card || 'structured_content' in card;

    if (hasFullData) {
      setSelectedJob(card as JobPostingCard);
    } else {
      // 혹시 모를 경우 전체 데이터 조회
      try {
        const response = await searchCards({
          searchQuery: searchInput,
          viewType: 'job',
          limit: 1000,
          offset: 0
        });

        const fullCard = response.cards.find(c => c.id === card.id);
        if (fullCard && fullCard.type === 'job') {
          setSelectedJob(fullCard as JobPostingCard);
        } else {
          setSelectedJob(card as JobPostingCard);
        }
      } catch (error) {
        console.error('카드 데이터 조회 실패:', error);
        setSelectedJob(card as JobPostingCard);
      }
    }
  };

  const activeFilterCount = filters.region.length + filters.schoolLevel.length + filters.subject.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-10">
      {/* 검색 헤더 (모바일 전용) */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 md:hidden">
        <div className="flex items-center gap-2 p-3">
          {/* 로고 - 홈으로 이동 */}
          <a href="/" className="shrink-0">
            <h1
              className="text-sm font-extrabold bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] bg-clip-text text-transparent"
              style={{ letterSpacing: '-0.5px' }}
            >
              셀바
            </h1>
          </a>

          {/* 검색 입력창 */}
          <div className="flex-1 relative">
            <div className="flex items-center bg-gray-50 rounded-full px-4 py-2.5 border border-gray-200">
              <Search className="w-5 h-5 text-gray-400 mr-2" />
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="수원 중등 영어 등 원하는 키워드로 검색해보세요"
                className="flex-1 bg-transparent outline-none text-sm placeholder-gray-400"
              />
              {searchInput && (
                <button
                  onClick={handleClearInput}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 필터 버튼 (모바일 헤더 내) */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className={`p-2 ml-1 rounded-full transition-colors relative absolute right-3 top-3 ${activeFilterCount > 0
            ? 'text-[#68B2FF] bg-[#68B2FF0D]'
            : 'text-gray-400 hover:bg-gray-100'
            }`}
        >
          <Settings2 className="w-6 h-6" />
          {activeFilterCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* 데스크탑 콘텐츠 컨테이너 */}
      <div className="max-w-container mx-auto px-4 md:px-6 md:pt-8">

        {/* 데스크탑 상단 영역 (로고 + 검색 결과 타이틀 및 필터 버튼) */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* 로고 - 홈으로 이동 */}
            <a href="/" className="shrink-0">
              <h1
                className="text-xl font-extrabold bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] bg-clip-text text-transparent"
                style={{ letterSpacing: '-0.5px' }}
              >
                셀미바이미
              </h1>
            </a>
            <h2 className="text-xl font-bold text-gray-900">
              {searchInput ? `'${searchInput}' 검색 결과` : '검색어를 입력해주세요'}
            </h2>
          </div>

          <button
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${activeFilterCount > 0
              ? 'border-[#68B2FF] text-[#68B2FF] bg-[#68B2FF0D]'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Settings2 className="w-5 h-5" />
            <span>필터 설정</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* 검색 결과 */}
        {showResults && hasSearched ? (
          <div className="py-4 md:py-0">
            {/* 모바일용 결과 카운트 (데스크탑은 상단에 포함됨) */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <h2 className="text-base font-bold text-gray-900 px-4">
                {isSearching ? '검색 중...' : `검색 결과 ${totalCount}건`}
              </h2>
            </div>

            {isSearching ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#68B2FF] rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm">검색 중입니다...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="space-y-3 px-4 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
                  {searchResults
                    .filter((card): card is JobPostingCard => card.type === 'job')
                    .map((job) => (
                      <CompactJobCard
                        key={job.id}
                        job={job}
                        onClick={() => handleCardClick(job)}
                      />
                    ))}
                </div>

                {/* 무한 스크롤 sentinel 및 로딩 인디케이터 */}
                {searchResults.length < totalCount && (
                  <div ref={sentinelRef} className="py-8 text-center">
                    {isLoadingMore && (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-gray-200 border-t-[#68B2FF] rounded-full animate-spin"></div>
                        <span className="text-sm text-gray-500">더 불러오는 중...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 모든 결과 로드 완료 메시지 */}
                {searchResults.length >= totalCount && searchResults.length > 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm text-gray-400">모든 검색 결과를 불러왔습니다</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">검색 결과가 없습니다</p>
                <p className="text-sm text-gray-400 mb-6">다른 검색어로 시도해보세요</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {popularKeywords.slice(0, 4).map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => handleKeywordClick(keyword)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-[#68B2FF] hover:bg-[#68B2FF0D] transition-colors"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 검색 전 화면 */
          <div className="px-4 py-4 space-y-6 md:px-0">
            {/* 최근 검색어 */}
            {searchHistory.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-700">📝 최근 검색어</h2>
                  <button
                    onClick={handleClearHistory}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    전체삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((item) => (
                    <button
                      key={item.keyword}
                      onClick={() => handleKeywordClick(item.keyword)}
                      className="group inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-[#68B2FF] hover:bg-[#68B2FF0D] transition-colors"
                    >
                      {item.keyword}
                      <X
                        className="w-3 h-3 text-gray-400 group-hover:text-gray-600"
                        onClick={(e) => handleRemoveHistory(item.keyword, e)}
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 인기/추천 검색어 영역 - 데스크탑에서는 그리드로 배치 */}
            <div className="md:grid md:grid-cols-2 md:gap-8">
              {/* 인기 검색어 */}
              <section>
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
                  🔥 인기 검색어
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {popularKeywords.map((keyword, index) => (
                    <button
                      key={keyword}
                      onClick={() => handleKeywordClick(keyword)}
                      className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-left hover:border-[#68B2FF] hover:bg-[#68B2FF0D] transition-colors"
                    >
                      <span className="text-xs font-medium text-gray-400 w-5">
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                      <span className="text-sm text-gray-900">{keyword}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 추천 검색어 */}
              <section className="mt-6 md:mt-0">
                <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
                  ✨ 추천 검색어
                </h2>
                <div className="space-y-4">
                  {/* 학교급 */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 mb-2">📚 학교급</h3>
                    <div className="flex flex-wrap gap-2">
                      {RECOMMENDED_KEYWORDS.schoolLevel.map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleKeywordClick(keyword)}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm hover:border-[#68B2FF] hover:bg-[#68B2FF0D] transition-colors"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 지역 */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 mb-2">📍 지역</h3>
                    <div className="flex flex-wrap gap-2">
                      {RECOMMENDED_KEYWORDS.regions.map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleKeywordClick(keyword)}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm hover:border-[#68B2FF] hover:bg-[#68B2FF0D] transition-colors"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 교과목 */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 mb-2">📖 교과목</h3>
                    <div className="flex flex-wrap gap-2">
                      {RECOMMENDED_KEYWORDS.subjects.map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleKeywordClick(keyword)}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm hover:border-[#68B2FF] hover:bg-[#68B2FF0D] transition-colors"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 공고유형 */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 mb-2">💼 공고유형</h3>
                    <div className="flex flex-wrap gap-2">
                      {RECOMMENDED_KEYWORDS.jobTypes.map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleKeywordClick(keyword)}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm hover:border-[#68B2FF] hover:bg-[#68B2FF0D] transition-colors"
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* 상세보기 모달 */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
      {/* 필터 사이드바 */}
      <FilterSidebar
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </div>
  );
}
