'use client';

import { useState, useEffect } from 'react';

const banners = [
  {
    type: 'event',
    title: '[이벤트] 신규 회원 가입 시 프리미엄 1개월 무료!',
    link: '/event/signup',
  },
  {
    type: 'notice',
    title: '[안내] 10월 20일 02:00~04:00 시스템 정기 점검',
    link: '/notice/123',
  },
  {
    type: 'review',
    title: '[성공사례] "3일 만에 원하는 강사님을 구했어요!"',
    link: '/review/456',
  }
];

export default function StripeBanner() {
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-white border-y border-gray-200">
      <div className="max-w-container mx-auto px-6 h-[80px] flex items-center">
        {/* Left: Stats & Keywords */}
        <div className="w-[60%] h-full flex flex-col justify-center py-3 border-r border-gray-200 pr-6">
            <div className="text-sm font-semibold text-gray-700">
                <span>📊 오늘 신규 공고 23건</span>
                <span className="mx-2">|</span>
                <span>마감임박 5건</span>
                <span className="mx-2">|</span>
                <span>신규 인력 12명</span>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                <span className='font-semibold'>🔥 인기:</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full">#코딩강사</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full">#영어강사</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full">#방과후</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full">#수원</span>
            </div>
        </div>

        {/* Right: Banner Slider */}
        <div className="w-[40%] h-full flex items-center pl-6">
            <div className="relative w-full h-full flex items-center cursor-pointer group" onClick={() => window.location.href = banners[currentBanner].link}>
                <div className="font-bold text-orange-500 text-sm">{banners[currentBanner].type.toUpperCase()}</div>
                <p className="text-base font-medium text-gray-800 ml-4 truncate group-hover:underline">
                    {banners[currentBanner].title}
                </p>
                <span className="absolute right-0 text-gray-400 group-hover:text-orange-500 transition-colors">→</span>
            </div>
        </div>
      </div>
    </section>
  );
}
