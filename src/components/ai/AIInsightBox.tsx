'use client';

import { IconTrendingUp, IconClock, IconUserPlus, IconChevronRight } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import {
  getStripeBannerConfig,
  getActiveBanners,
  getAutoStatistics,
  getTodayStripeStatistics,
  getActivePopularKeywords
} from '@/lib/supabase/stripe-banner';
import type { StripeBanner, PopularKeyword } from '@/types/index';

interface BannerData {
  type: 'event' | 'notice' | 'review';
  title: string;
  description: string;
  link: string;
}

interface AIInsightBoxProps {
  resultCount: number;
  searchQuery?: string;
  topResultIndex?: number;
}

export default function AIInsightBox({
  resultCount,
  searchQuery = '수원 코딩강사',
  topResultIndex = 1
}: AIInsightBoxProps) {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [banners, setBanners] = useState<StripeBanner[]>([]);
  const [rotationSpeed, setRotationSpeed] = useState(3);
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [urgentJobsCount, setUrgentJobsCount] = useState(0);
  const [newTalentsCount, setNewTalentsCount] = useState(0);
  const [keywords, setKeywords] = useState<PopularKeyword[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        // 1. 설정 로드
        const config = await getStripeBannerConfig();
        if (config) {
          setIsActive(config.isActive);
          setRotationSpeed(config.rotationSpeed);
        }

        // 2. 배너 로드
        const bannersData = await getActiveBanners();
        if (bannersData && bannersData.length > 0) {
          setBanners(bannersData);
        }

        // 3. 통계 로드 (auto/manual 모드에 따라 분기)
        if (config?.statsMode === 'manual') {
          // 수동 모드: DB에 저장된 통계 데이터 사용
          const manualStats = await getTodayStripeStatistics();
          if (manualStats) {
            setNewJobsCount(manualStats.newJobsCount);
            setUrgentJobsCount(manualStats.urgentJobsCount);
            setNewTalentsCount(manualStats.newTalentsCount);
          } else {
            // 수동 모드인데 데이터가 없으면 0으로 표시
            setNewJobsCount(0);
            setUrgentJobsCount(0);
            setNewTalentsCount(0);
          }
        } else {
          // 자동 모드: 실시간 집계
          const stats = await getAutoStatistics();
          setNewJobsCount(stats.newJobsCount);
          setUrgentJobsCount(stats.urgentJobsCount);
          setNewTalentsCount(stats.newTalentsCount);
        }

        // 4. 인기 키워드 로드
        const keywordsData = await getActivePopularKeywords();
        if (keywordsData && keywordsData.length > 0) {
          setKeywords(keywordsData);
        }
      } catch (error) {
        console.error('Failed to load stripe banner data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // 배너 자동 회전
  useEffect(() => {
    if (!isActive || banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, rotationSpeed * 1000);

    return () => clearInterval(interval);
  }, [banners.length, rotationSpeed, isActive]);

  // 띠지배너 비활성화 시 렌더링 안 함
  if (!isActive || isLoading || banners.length === 0) {
    return null;
  }

  const currentBannerData = banners[currentBanner];
  const bannerColors = {
    event: 'from-orange-400 to-yellow-500',
    notice: 'from-[#a8c5e0] to-[#8fb4d6]',
    review: 'from-[#9fd5bf] to-[#6fb59b]'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 mb-4 flex gap-4 h-[96px] items-center">
      {/* 좌측: 띠지 (50%) */}
      <div className="basis-1/2 space-y-2">
        {/* 실시간 통계 */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <IconTrendingUp size={20} stroke={1.5} className="text-[#7db8a3]" />
            <span className="font-semibold text-gray-800">오늘 신규 공고 {newJobsCount}건</span>
          </div>
          <div className="text-gray-300 text-xl leading-none">·</div>
          <div className="flex items-center gap-1.5">
            <IconClock size={20} stroke={1.5} className="text-orange-600" />
            <span className="text-gray-700">마감임박 {urgentJobsCount}건</span>
          </div>
          <div className="text-gray-300 text-xl leading-none">·</div>
          <div className="flex items-center gap-1.5">
            <IconUserPlus size={20} stroke={1.5} className="text-[#7aa3cc]" />
            <span className="text-gray-700">신규 인력 {newTalentsCount}명 등록</span>
          </div>
        </div>

        {/* 인기 검색어 */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-medium text-gray-700">인기:</span>
          {keywords.slice(0, 5).map((kw) => (
            <span
              key={kw.id}
              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded cursor-pointer hover:bg-gray-200 transition-colors"
            >
              {kw.keyword}
            </span>
          ))}
        </div>
      </div>
      
      {/* 우측: 배너 (50%) */}
      <div className="basis-1/2 h-full">
        <div
          className="h-full rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] flex flex-col justify-center"
          style={{
            background: `linear-gradient(to right, ${currentBannerData.bgColor}, ${currentBannerData.bgColor})`,
            color: currentBannerData.textColor,
            cursor: currentBannerData.link ? 'pointer' : 'default'
          }}
          onClick={() => {
            if (currentBannerData.link) {
              window.location.href = currentBannerData.link;
            }
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold">{currentBannerData.title}</h3>
            <div className="flex gap-1">
              {banners.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentBanner ? 'bg-white w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm opacity-90">{currentBannerData.description || ''}</p>
            {currentBannerData.link && <IconChevronRight size={16} stroke={2} className="ml-2 flex-shrink-0" />}
          </div>
        </div>
      </div>
    </div>
  );
}
