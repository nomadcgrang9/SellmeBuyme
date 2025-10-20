'use client';

import { IconTrendingUp, IconClock, IconUserPlus, IconChevronRight } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

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

  const banners: BannerData[] = [
    {
      type: 'event',
      title: '신규 회원 가입 이벤트',
      description: '프리미엄 1개월 무료!',
      link: '/event/signup'
    },
    {
      type: 'notice',
      title: '시스템 점검 안내',
      description: '10/20 02:00-04:00',
      link: '/notice/123'
    },
    {
      type: 'review',
      title: '성공 사례',
      description: '3일 만에 강사 구했어요!',
      link: '/review/456'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners.length]);

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
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <IconTrendingUp size={16} stroke={1.5} className="text-[#7db8a3]" />
            <span className="font-semibold text-gray-800">오늘 신규 공고 {resultCount}건</span>
          </div>
          <div className="text-gray-300 text-lg leading-none">·</div>
          <div className="flex items-center gap-1.5">
            <IconClock size={16} stroke={1.5} className="text-orange-600" />
            <span className="text-gray-700">마감임박 5건</span>
          </div>
          <div className="text-gray-300 text-lg leading-none">·</div>
          <div className="flex items-center gap-1.5">
            <IconUserPlus size={16} stroke={1.5} className="text-[#7aa3cc]" />
            <span className="text-gray-700">신규 인력 12명 등록</span>
          </div>
        </div>
        
        {/* 인기 검색어 */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-gray-700">인기:</span>
          {['#코딩강사', '#영어강사', '#방과후', '#수원', '#성남'].map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded cursor-pointer hover:bg-gray-200 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      {/* 우측: 배너 (50%) */}
      <div className="basis-1/2 h-full">
        <div 
          className={`h-full bg-gradient-to-r ${bannerColors[currentBannerData.type]} text-white rounded-lg px-4 py-3 shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]`}
          onClick={() => window.location.href = currentBannerData.link}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase">
              {currentBannerData.type === 'event' ? '이벤트' : currentBannerData.type === 'notice' ? '공지' : '후기'}
            </span>
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
          <h3 className="text-sm font-bold mb-0.5">{currentBannerData.title}</h3>
          <p className="text-xs opacity-90 mb-2">{currentBannerData.description}</p>
          <div className="flex items-center justify-end">
            <IconChevronRight size={14} stroke={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
