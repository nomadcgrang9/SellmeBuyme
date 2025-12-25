import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronLeft, Settings2 } from 'lucide-react';
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

export default function MobileSearch() {
  const inputRef = useRef<HTMLInputElement>(null);

  const { filters } = useSearchStore(); // Store에서 필터 가져오기

  const [searchInput, setSearchInput] = useState('');
  const [searchHistory, setSearchHistory] = useState(getSearchHistory());
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const popularKeywords = getPopularKeywords();

  // 페이지 진입 시 자동 포커스
  useEffect(() => {
    inputRef.current?.focus();
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
        return;
      }

      // 검색 시작
      setIsSearching(true);
      setHasSearched(true);
      setShowResults(true);

      try {
        // 검색 실행 - job 타입만 검색
        const response = await searchCards({
          searchQuery: keyword,
          filters, // 필터 전달
          viewType: 'job',
          limit: 20,
          offset: 0
        });

        if (!active) return;

        setSearchResults(response.cards);

        // 검색어 저장 (결과가 있을 때만)
        if (response.cards.length > 0) {
          addSearchHistory(keyword);
          setSearchHistory(getSearchHistory());
        }
      } catch (error) {
        if (!active) return;
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        if (!active) return;
        setIsSearching(false);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 검색 헤더 (고정) */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 p-3">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>

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

        {/* 필터 버튼 */}
        <button
          onClick={() => setIsFilterOpen(true)}
          className={`p-2 ml-1 rounded-full transition-colors relative ${filters.region.length + filters.schoolLevel.length + filters.subject.length > 0
            ? 'text-[#68B2FF] bg-[#68B2FF0D]'
            : 'text-gray-400 hover:bg-gray-100'
            }`}
        >
          <Settings2 className="w-6 h-6" />
          {(filters.region.length + filters.schoolLevel.length + filters.subject.length > 0) && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </div>

      {/* 검색 결과 */}
      {
        showResults && hasSearched ? (
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">
                {isSearching ? '검색 중...' : `검색 결과 ${searchResults.length}건`}
              </h2>
              {/* TODO: 정렬 옵션 추가 */}
            </div>

            {isSearching ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#68B2FF] rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-sm">검색 중입니다...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-3">
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
          <div className="px-4 py-4 space-y-6">
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
            <section>
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
        )
      }

      {/* 상세보기 모달 */}
      {
        selectedJob && (
          <JobDetailModal
            job={selectedJob}
            isOpen={!!selectedJob}
            onClose={() => setSelectedJob(null)}
          />
        )
      }
      {/* 필터 사이드바 */}
      <FilterSidebar
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />
    </div >
  );
}
