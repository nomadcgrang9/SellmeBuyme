import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { JobFilters } from './components/JobFilters';
import { JobCard } from './components/JobCard';
import { Footer } from './components/Footer';
import { searchCards } from '@/lib/supabase/queries';
import { useSearchStore } from '@/stores/searchStore';
import type { JobPostingCard } from '@/types';

const JOBS_LIMIT = 20;

const App: React.FC = () => {
  // Zustand store에서 검색 상태 가져오기
  const {
    searchQuery,
    filters,
    offset,
    lastUpdatedAt,
    setSearchQuery,
    loadMore: storeLoadMore
  } = useSearchStore();

  const [jobs, setJobs] = useState<JobPostingCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 검색어 입력 핸들러 (디바운스 적용)
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchInput = (value: string) => {
    setInputValue(value);

    // 디바운스: 300ms 후에 실제 검색 실행
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  };

  // 검색 상태가 바뀔 때마다 공고 불러오기
  useEffect(() => {
    let active = true;

    async function fetchJobs() {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await searchCards({
          searchQuery,
          viewType: 'job',
          limit: JOBS_LIMIT,
          offset,
          filters
        });

        // 디버그 로그
        console.log('[App] searchCards 응답:');
        console.log('  - totalCount:', response.totalCount);
        console.log('  - cardsLength:', response.cards.length);
        console.log('  - filters.region:', filters.region);
        console.log('  - searchQuery:', searchQuery);

        if (!active) return;

        const jobCards = response.cards.filter(
          (card): card is JobPostingCard => card.type === 'job'
        );

        if (offset === 0) {
          setJobs(jobCards);
        } else {
          setJobs(prev => [...prev, ...jobCards]);
        }
        setTotalCount(response.totalCount);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        if (active) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    fetchJobs();

    return () => {
      active = false;
    };
  }, [searchQuery, filters, offset, lastUpdatedAt]);

  const canLoadMore = jobs.length < totalCount;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Spacer for fixed header (64px) */}
      <div className="h-[64px]"></div>

      <main className="flex-1">
        <Hero />

        <div className="max-w-6xl mx-auto px-4 pb-16">

            {/* Job List Section */}
            <section className="mt-2">
                {/* 제목 */}
                <div className="mb-4">
                    <h2 className="text-[22px] font-bold text-gray-900">따끈따끈 신규공고 전체보기</h2>
                </div>

                {/* 검색창 */}
                <div className="mb-6">
                    <div className="relative max-w-full">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            placeholder="학교명, 지역, 과목으로 검색해보세요 (예: 서울, 수학, 기간제)"
                            className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-[#5B6EF7] bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-[#5B6EF7]/20 transition-all text-gray-800 placeholder-gray-400 font-medium shadow-sm"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B6EF7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Filter Bar */}
                <JobFilters />

                {/* 공고 카드 목록 */}
                <div className="mt-6">
                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="bg-gray-100 rounded-lg h-[240px] animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 pb-4">
                          {jobs.map(job => (
                            <JobCard key={job.id} job={job} />
                          ))}
                        </div>

                        {/* 추가 로딩 중 표시 */}
                        {loadingMore && (
                          <div className="flex justify-center py-8">
                            <div className="flex items-center gap-2 text-gray-500">
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-sm">공고를 불러오는 중...</span>
                            </div>
                          </div>
                        )}

                        {/* 더 보기 버튼 */}
                        {canLoadMore && !loadingMore && (
                          <div className="flex justify-center py-8">
                            <button
                              onClick={() => storeLoadMore()}
                              className="px-8 py-3 bg-[#5B6EF7] text-white font-medium rounded-xl hover:bg-[#4A5DE6] transition-colors shadow-md hover:shadow-lg"
                            >
                              더 많은 공고 보기
                            </button>
                          </div>
                        )}

                        {/* 모든 공고 로드 완료 메시지 */}
                        {!canLoadMore && jobs.length > 0 && (
                          <div className="text-center py-4 text-gray-400 text-sm">
                            모든 공고를 불러왔습니다 ({jobs.length}개)
                          </div>
                        )}
                      </>
                    )}
                </div>
            </section>

            {/* 공간 확보용 */}
            <div className="h-[50px]" />

             {/* Bottom Promo Banner - Notification Service */}
             <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-800 to-blue-900 py-10 px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg !mt-12">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                      <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-blue-500/20 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-[-20px] left-[10%] w-24 h-24 bg-purple-500/20 rounded-full blur-xl"></div>
                      {/* Bell Icon Background */}
                      <svg className="absolute right-[5%] md:right-[10%] top-1/2 -translate-y-1/2 w-40 h-40 text-white/5 rotate-12" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                  </div>

                  <div className="relative z-10 text-white">
                      <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold mb-3 backdrop-blur-sm border border-white/10 text-blue-200">
                          🔔 스마트 알림 서비스
                      </div>
                      <h2 className="font-bold text-2xl md:text-3xl mb-2 leading-tight">
                          매일 검색하지 않아도 괜찮아요.<br/>
                          <span className="text-blue-300">원하는 공고</span>만 쏙쏙 알려드릴게요.
                      </h2>
                      <p className="text-slate-300 text-sm md:text-base mt-2">
                          희망 지역과 과목을 설정하면 신규 공고 업데이트 시<br className="sm:hidden" /> 가장 먼저 알림을 보내드립니다.
                      </p>
                  </div>
                  <div className="relative z-10 flex-shrink-0 w-full sm:w-auto">
                      <button className="group w-full sm:w-auto bg-blue-600 text-white font-bold py-3.5 px-8 rounded-full shadow-lg hover:bg-blue-500 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-blue-500/50">
                          무료 알림 받기
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                      </button>
                  </div>
             </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;
