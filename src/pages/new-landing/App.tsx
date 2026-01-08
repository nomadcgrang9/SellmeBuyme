import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { JobFilters } from './components/JobFilters';
import { CurationSection } from './components/CurationSection';
import { JobCard } from './components/JobCard';
import { Footer } from './components/Footer';
import { searchCards } from '@/lib/supabase/queries';
import type { JobPostingCard } from '@/types';

const JOBS_LIMIT = 50; // 한번에 불러올 공고 수

const App: React.FC = () => {
  const [jobs, setJobs] = useState<JobPostingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const bottomBannerRef = useRef<HTMLDivElement>(null);
  const stickyContentRef = useRef<HTMLDivElement>(null);

  // 스크롤 시 제목+필터 고정 여부 체크
  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current && bottomBannerRef.current) {
        const sectionRect = sectionRef.current.getBoundingClientRect();
        const bannerRect = bottomBannerRef.current.getBoundingClientRect();
        const headerHeight = 128; // 헤더 높이

        // 섹션이 헤더에 닿으면 sticky 시작
        const shouldStartSticky = sectionRect.top <= headerHeight;

        // sticky 콘텐츠 높이 계산 (고정된 영역의 실제 높이)
        const stickyContentHeight = stickyContentRef.current?.offsetHeight || 500;

        // 배너가 sticky 영역 아래에 닿으면 해제
        // 배너 top이 (헤더높이 + sticky콘텐츠높이) 이하가 되면 해제
        const shouldEndSticky = bannerRect.top <= headerHeight + stickyContentHeight;

        if (shouldStartSticky && !shouldEndSticky) {
          setIsSticky(true);
        } else {
          setIsSticky(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 초기 상태 체크
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 공고 불러오기 함수
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);

      const response = await searchCards({
        viewType: 'job',
        limit: JOBS_LIMIT,
        offset: 0,
        filters: {
          sort: '최신순'
        }
      });

      // Filter only job type cards
      const jobCards = response.cards.filter(
        (card): card is JobPostingCard => card.type === 'job'
      );

      setJobs(jobCards);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로딩
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Spacer for fixed header (128px) */}
      <div className="h-[128px]"></div>

      <main className="flex-1">
        <Hero />

        <div className="max-w-6xl mx-auto px-4 pt-3 pb-16">

            {/* Curation Section */}
            <CurationSection />

            {/* Middle Promo Banner - Site Value Proposition */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 py-8 px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg mt-8">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-30px] left-[-30px] w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-[-20px] right-[15%] w-32 h-32 bg-indigo-400/20 rounded-full blur-xl"></div>
                    {/* Search Icon Background */}
                    <svg className="absolute right-[3%] md:right-[8%] top-1/2 -translate-y-1/2 w-36 h-36 text-white/5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="relative z-10 text-white">
                    <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold mb-3 backdrop-blur-sm border border-white/10 text-indigo-200">
                        🎯 쌤찾기z만의 특별함
                    </div>
                    <h2 className="font-bold text-xl md:text-2xl mb-2 leading-tight">
                        전국 학교 채용 공고,<br/>
                        <span className="text-indigo-200">한 곳에서 한눈에</span> 확인하세요.
                    </h2>
                    <p className="text-indigo-100/80 text-sm md:text-base mt-2">
                        여러 사이트 돌아다닐 필요 없이, 원하는 공고만 빠르게 찾아보세요.
                    </p>
                </div>
                <div className="relative z-10 flex-shrink-0 w-full sm:w-auto">
                    <button className="group w-full sm:w-auto bg-white text-indigo-600 font-bold py-3 px-6 rounded-full shadow-lg hover:bg-indigo-50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        공고 검색하기
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Job List Section */}
            <section ref={sectionRef} className={`mt-8 ${isSticky ? 'min-h-[700px]' : ''}`}>
                {/* Sticky 제목 + 필터 + 공고 목록 영역 */}
                <div
                  ref={stickyContentRef}
                  className={`transition-all duration-200 ${
                    isSticky
                      ? 'fixed top-[128px] left-0 right-0 z-30 bg-white shadow-md'
                      : ''
                  }`}
                >
                  {/* 제목 + 필터 */}
                  <div className="max-w-6xl mx-auto w-full px-4 py-3">
                    <div className="mb-4">
                        <h2 className="text-[22px] font-bold text-gray-900">따끈따끈 신규공고 전체보기</h2>
                    </div>

                    {/* Filter Bar */}
                    <JobFilters />
                  </div>

                  {/* 공고 카드 세로 스크롤 영역 */}
                  <div className="mt-6 overflow-y-auto overflow-x-hidden max-h-[500px] px-4">
                    <div className="max-w-6xl mx-auto">
                      {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-gray-100 rounded-lg h-[240px] animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10 pb-4">
                          {jobs.map(job => (
                            <JobCard key={job.id} job={job} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

            </section>

            {/* 공간 확보용 placeholder - sticky 해제 후 아래 콘텐츠 표시를 위한 공간 */}
            <div className="h-[100px]" />

             {/* Bottom Promo Banner - Notification Service */}
             <div ref={bottomBannerRef} className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-800 to-blue-900 py-10 px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg !mt-12">
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
