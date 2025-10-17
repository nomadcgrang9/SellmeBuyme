'use client';

import { Card } from '@/types';
import { IconChevronLeft, IconChevronRight, IconSparkles, IconMessageCircle } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import CompactJobCard from '../cards/CompactJobCard';
import CompactTalentCard from '../cards/CompactTalentCard';

interface AIRecommendationsProps {
  cards: Card[];
  userName?: string;
}

export default function AIRecommendations({ cards, userName = '방문자' }: AIRecommendationsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 반응형 카드 개수 설정
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < cards.length - visibleCount;

  const handlePrev = () => {
    if (canGoLeft) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoRight) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const primaryCard = cards[0];

  const getAiComment = () => {
    if (!primaryCard) {
      return {
        headline: '추천을 준비 중이에요',
        description: '관심 지역과 조건을 파악해 곱 맞춤 카드를 보여드릴게요.'
      };
    }

    if (primaryCard.type === 'job') {
      const mainTag = primaryCard.tags[0];
      const subTag = primaryCard.tags[1];
      const tagPhrase = [mainTag, subTag].filter(Boolean).join(', ');

      return {
        headline: `${primaryCard.location} 근처 ${mainTag ?? '공고'}를 먼저 챙겼어요`,
        description: `${userName}님이 관심 보인 지역과 ${tagPhrase || '최근 확인한 조건'}을 기준으로 긴급 공고부터 정리해봤어요.`
      };
    }

    if (primaryCard.type === 'talent') {
      const mainTag = primaryCard.tags[0];
      return {
        headline: `${primaryCard.specialty} 인재를 골라봤어요`,
        description: `${userName}님 학교와 가까운 ${primaryCard.location} 지역의 ${mainTag ?? '핵심 역량'}을 가진 선생님을 추천드려요.`
      };
    }

    return {
      headline: '추천을 준비 중이에요',
      description: '필요한 조건을 분석해 맞춤 카드를 곱 보여드릴게요.'
    };
  };

  const { headline, description } = getAiComment();

  return (
    <section className="bg-gradient-to-b from-[#f0f6fa] to-gray-50 pt-4 pb-1">
      <div className="max-w-container mx-auto px-6">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <IconSparkles size={18} stroke={1.5} className="text-primary" />
          <h2 className="text-base font-bold text-gray-900">셀바 AI</h2>
        </div>

        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-stretch lg:h-[260px]">
          {/* 좌측 탭메뉴: AI 코멘트 */}
          <aside className="flex w-full min-h-[200px] flex-col justify-between rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-100 via-blue-50 to-white p-4 shadow-md lg:w-[300px] lg:h-full">
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <IconMessageCircle size={16} stroke={1.5} className="text-primary" />
                <span>AI 코멘트</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="block text-sm font-semibold text-gray-900 leading-snug mb-1">
                  {headline}
                </span>
                {description}
              </p>
            </div>
            <div className="mt-3.5 flex gap-1.5">
              <button className="btn-interactive flex-1 rounded-md bg-[#7aa3cc] text-white shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-[42px] flex-col items-center justify-center gap-0.5">
                  <span className="text-[11px] font-semibold">공고</span>
                  <span className="text-[10px] font-semibold tracking-tight">등록</span>
                </div>
              </button>
              <button className="btn-interactive flex-1 rounded-md bg-[#7db8a3] text-white shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-[42px] flex-col items-center justify-center gap-0.5">
                  <span className="text-[11px] font-semibold">인력</span>
                  <span className="text-[10px] font-semibold tracking-tight">등록</span>
                </div>
              </button>
              <button className="btn-interactive flex-1 rounded-md bg-[#f4c96b] text-[#7a5520] shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-[42px] flex-col items-center justify-center gap-0.5">
                  <span className="text-[11px] font-semibold">체험</span>
                  <span className="text-[10px] font-semibold tracking-tight">등록</span>
                </div>
              </button>
            </div>
          </aside>

          {/* 우측 카드 슬라이더 */}
          <div className="relative flex-1 h-[210px] lg:h-full lg:max-w-[760px]">
            {/* 좌측 버튼 */}
            <button
              onClick={handlePrev}
              disabled={!canGoLeft}
              className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center transition-all ${
                canGoLeft 
                  ? 'hover:border-gray-400 hover:shadow-lg cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              aria-label="이전 추천 보기"
            >
              <IconChevronLeft size={14} stroke={1.5} />
            </button>

            {/* 카드 그리드 */}
            <div 
              ref={scrollRef}
              className="overflow-hidden h-full"
            >
              <div 
                className="flex h-full gap-2.5 transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${currentIndex * (100 / visibleCount)}%)`
                }}
              >
                {cards.map((card) => (
                  <div 
                    key={card.id}
                    className="flex-shrink-0"
                    style={{ 
                      width: `calc((100% - ${(visibleCount - 1) * 14}px) / ${visibleCount})`,
                      height: '100%'
                    }}
                  >
                    {card.type === 'job' ? (
                      <CompactJobCard job={card} />
                    ) : (
                      <CompactTalentCard talent={card} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 우측 버튼 */}
            <button
              onClick={handleNext}
              disabled={!canGoRight}
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center transition-all ${
                canGoRight 
                  ? 'hover:border-gray-400 hover:shadow-lg cursor-pointer' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              aria-label="다음 추천 보기"
            >
              <IconChevronRight size={14} stroke={1.5} />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
