import React, { useState, useEffect } from 'react';
import { searchCards, fetchJobsByBoardRegion } from '@/lib/supabase/queries';
import type { JobPostingCard } from '@/types';
import { JobCard } from './JobCard';

// 수도권 지역 키워드 (서울 + 경기도 주요 도시)
const SUDOGWON_REGIONS = [
  '서울',
  '수원', '성남', '고양', '용인', '부천', '안산', '안양', '남양주', '화성',
  '평택', '의정부', '시흥', '파주', '김포', '광명', '광주', '군포', '하남',
  '오산', '이천', '안성', '의왕', '양평', '여주', '과천', '구리', '포천',
  '동두천', '가평', '연천'
];

// 제외할 키워드 (광주광역시 등 수도권이 아닌 지역)
const SUDOGWON_EXCLUDE = ['광주광역시', '광주광역'];

const collections = [
  { id: 1, emoji: '🔥', title: '지금 가장 많이\n찾는 학교', color: 'bg-orange-50', themeColor: 'orange' as const, sort: '추천순' as const, keyword: '', region: [], useRegionBoard: false },
  { id: 2, emoji: '🏫', title: '수도권 위주\n공고 모아보기', color: 'bg-blue-50', themeColor: 'blue' as const, sort: '최신순' as const, keyword: '', region: [], useRegionBoard: true, regionKeywords: SUDOGWON_REGIONS, excludeKeywords: SUDOGWON_EXCLUDE },
  { id: 3, emoji: '⚡', title: '결원 보충!\n실시간 긴급 채용', color: 'bg-purple-50', themeColor: 'purple' as const, sort: '마감임박순' as const, keyword: '', region: [], useRegionBoard: false },
  { id: 4, emoji: '📋', title: '장기 근무\n기간제만 모아보기', color: 'bg-green-50', themeColor: 'green' as const, sort: '최신순' as const, keyword: '기간제', region: [], useRegionBoard: false },
];

export const CurationSection: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jobs, setJobs] = useState<JobPostingCard[]>([]);
  const [loading, setLoading] = useState(true);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % collections.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + collections.length) % collections.length);
  };

  // 테마 변경 시 해당 테마의 공고 불러오기
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const currentTheme = collections[currentIndex];

        let jobCards: JobPostingCard[];

        // 수도권 테마인 경우 board 기반 필터링 사용
        if (currentTheme.useRegionBoard && currentTheme.regionKeywords) {
          jobCards = await fetchJobsByBoardRegion(
            currentTheme.regionKeywords,
            10,
            currentTheme.excludeKeywords || []
          );
        } else {
          const response = await searchCards({
            viewType: 'job',
            limit: 10,
            searchQuery: currentTheme.keyword,
            filters: {
              sort: currentTheme.sort,
              region: currentTheme.region
            }
          });

          jobCards = response.cards.filter(
            (card): card is JobPostingCard => card.type === 'job'
          );
        }

        setJobs(jobCards);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [currentIndex]);

  return (
    <section className="pt-6 pb-2">
      <h2 className="text-[22px] font-bold text-gray-900 mb-4">테마별 공고 모아보기</h2>

      <div className="flex gap-8 items-start">
        {/* 왼쪽 - 겹쳐진 카드들 */}
        <div className="relative h-72 w-80 flex-shrink-0">
          {collections.map((item, index) => {
            const order = (index - currentIndex + collections.length) % collections.length;

            const styles: Record<number, string> = {
              0: 'z-40 rotate-3 left-0 top-4',
              1: 'z-30 -rotate-6 left-10 top-0',
              2: 'z-20 rotate-6 left-5 top-6',
              3: 'z-10 -rotate-3 left-14 top-2',
            };

            return (
              <div
                key={item.id}
                className={`absolute w-[230px] h-[230px] ${item.color} rounded-xl shadow-lg
                  flex flex-col items-center justify-center text-center p-5 cursor-pointer
                  transition-all duration-300 ${styles[order]}`}
                onClick={() => setCurrentIndex(index)}
              >
                <div className="text-5xl mb-3">{item.emoji}</div>
                <h4 className="font-bold text-gray-800 text-xl whitespace-pre-line leading-tight">
                  {item.title}
                </h4>
              </div>
            );
          })}

          {/* 화살표 버튼 */}
          <div className="absolute bottom-0 left-56 z-50 flex gap-2">
            <button
              onClick={prevSlide}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 오른쪽 - 공고 카드 가로 스크롤 */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="overflow-x-auto pb-4 overflow-y-hidden">
            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="w-[260px] h-[240px] bg-gray-100 rounded-lg animate-pulse flex-shrink-0" />
                ))
              ) : jobs.length > 0 ? (
                jobs.map((job) => (
                  <div key={job.id} className="w-[260px] flex-shrink-0">
                    <JobCard job={job} themeColor={collections[currentIndex].themeColor} />
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm py-10">해당 테마의 공고가 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
