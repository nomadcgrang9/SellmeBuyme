import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import AIRecommendations from '@/components/ai/AIRecommendations';
import AIInsightBox from '@/components/ai/AIInsightBox';
import CardGrid from '@/components/cards/CardGrid';
import { aiRecommendations } from '@/lib/dummyData';
import { fetchJobPostings } from '@/lib/supabase/queries';
import type { Card } from '@/types';

export default function App() {
  const [mainCards, setMainCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      const jobs = await fetchJobPostings(20);
      setMainCards(jobs);
      setLoading(false);
    }
    loadJobs();
  }, []);

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
          resultCount={mainCards.length}
          searchQuery="전체"
          topResultIndex={1}
        />

        {/* 로딩 상태 */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-gray-500">공고를 불러오는 중...</div>
          </div>
        ) : (
          /* 카드 그리드 */
          <CardGrid cards={mainCards} />
        )}

        {/* 무한 스크롤 로딩 표시 (더미) */}
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-400 text-sm">
            스크롤하여 더 많은 결과 보기...
          </div>
        </div>
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
