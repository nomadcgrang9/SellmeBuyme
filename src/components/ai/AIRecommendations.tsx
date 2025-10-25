'use client';

import type { Card, PromoCardSettings } from '@/types';
import type { UserProfileRow } from '@/lib/supabase/profiles';
import { IconChevronLeft, IconChevronRight, IconSparkles, IconFileText, IconHeartHandshake, IconRocket } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import { createBadgeGradient } from '@/lib/colorUtils';
import CompactJobCard from '../cards/CompactJobCard';
import CompactTalentCard from '../cards/CompactTalentCard';

interface AIRecommendationsProps {
  cards: Card[];
  userName?: string;
  loading?: boolean;
  headlineOverride?: string;
  descriptionOverride?: string;
  promoCard?: PromoCardSettings | null;
  profile?: UserProfileRow | null;
  onCardClick?: (card: Card) => void;
}

export default function AIRecommendations({
  cards,
  userName = '방문자',
  loading = false,
  headlineOverride,
  descriptionOverride,
  promoCard,
  profile,
  onCardClick
}: AIRecommendationsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const [activeSection, setActiveSection] = useState<'comment' | 'job' | 'talent' | 'experience' | null>(null);
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

  type CarouselMetaItem = { id: string; type: 'promo' | 'placeholder' };

  const visibleCards = cards.slice(0, 8);
  const primaryCard = visibleCards[0];
  const effectiveInsertPosition = promoCard?.insertPosition ?? 3;
  const computeInsertIndex = (length: number) => {
    const zeroBased = Math.max(effectiveInsertPosition - 1, 0);
    return Math.min(zeroBased, length);
  };
  const shouldIncludePromo = Boolean(promoCard) && (!loading || visibleCards.length === 0);
  const promoCardMeta: CarouselMetaItem | null = shouldIncludePromo ? { id: 'promo-card', type: 'promo' } : null;
  const placeholderCard: CarouselMetaItem = { id: 'placeholder-card', type: 'placeholder' };
  const shouldShowPlaceholder = !loading && visibleCards.length === 0;
  const carouselItems: (Card | CarouselMetaItem)[] = shouldShowPlaceholder
    ? (() => {
        const working: (Card | CarouselMetaItem)[] = [placeholderCard];
        if (promoCardMeta) {
          const insertIndex = computeInsertIndex(working.length);
          working.splice(insertIndex, 0, promoCardMeta);
        }
        return working;
      })()
    : (() => {
        const working: (Card | CarouselMetaItem)[] = [...visibleCards];
        if (promoCardMeta) {
          const insertIndex = computeInsertIndex(working.length);
          working.splice(insertIndex, 0, promoCardMeta);
        }
        return promoCardMeta ? working : visibleCards;
      })();
  const totalItems = carouselItems.length;
  const maxIndex = Math.max(totalItems - visibleCount, 0);
  const promoHeadline = promoCard?.headline ?? '셀바, 학교와 교육자원을 연결하겠습니다';
  const promoBackground = promoCard?.backgroundColor ?? '#f7c6d9';
  const promoFontColor = promoCard?.fontColor ?? '#1f2937';
  const promoFontSize = promoCard?.fontSize ?? 24;
  const promoImageSrc = promoCard?.imageUrl ?? '/picture/section%20right%20ad2.png';
  const promoImageScale = Math.min(Math.max(promoCard?.imageScale ?? 1, 0.5), 1.5);
  const promoImageWrapperStyle = {
    height: `${180 * promoImageScale}px`
  } as const;
  const promoImageStyle = {
    maxHeight: `${170 * promoImageScale}px`,
    maxWidth: `${240 * promoImageScale}px`
  } as const;

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [cards.length, effectiveInsertPosition]);

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < maxIndex;

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

  // Edge Function의 AI 코멘트 직접 사용
  const headline = loading
    ? '추천을 준비 중이에요'
    : headlineOverride ?? '맞춤 추천을 준비했어요';
  const description = loading
    ? 'AI가 프로필을 분석해 맞춤 카드를 정리하고 있어요.'
    : descriptionOverride ?? `${userName}님의 프로필을 분석해 추천 카드를 준비했습니다.`;

  return (
    <section className="bg-white pt-6 pb-4">
      <div className="max-w-container mx-auto px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:h-[260px]">
          {/* 좌측 사이드바: AI 코멘트 + 등록 버튼 (세로 4등분) */}
          <aside className="flex min-h-[200px] flex-col gap-2 shrink-0 lg:h-full lg:w-[160px] lg:min-w-[160px] lg:max-w-[180px]">

            {/* 1. AI 코멘트 박스 (그래디언트 배경) */}
            <button
              onClick={() => setActiveSection(activeSection === 'comment' ? null : 'comment')}
              className="flex-1 flex flex-col rounded-2xl p-4 transition-all duration-200 cursor-pointer border border-gray-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-purple-50 shadow-md"
            >
              <div className="flex items-center justify-center mb-2">
                <IconSparkles size={28} stroke={1.5} className="text-amber-500" />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-center">
                  <span className="block text-[12px] font-semibold leading-snug text-gray-900">
                    선생님을 위해 셀바가 열심히 찾아봤어요
                  </span>
                </p>
              </div>
            </button>

            {/* 2. 공고 등록 버튼 */}
            <button
              onClick={() => setActiveSection(activeSection === 'job' ? null : 'job')}
              className={`h-[48px] rounded-xl px-3 transition-all duration-200 flex items-center justify-center gap-1.5 font-semibold text-xs ${
                activeSection === 'job'
                  ? 'bg-blue-50 text-blue-900 shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconFileText size={18} stroke={1.5} />
              <span>공고 등록</span>
            </button>

            {/* 3. 인력 등록 버튼 */}
            <button
              onClick={() => setActiveSection(activeSection === 'talent' ? null : 'talent')}
              className={`h-[48px] rounded-xl px-3 transition-all duration-200 flex items-center justify-center gap-1.5 font-semibold text-xs ${
                activeSection === 'talent'
                  ? 'bg-green-50 text-green-900 shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconHeartHandshake size={18} stroke={1.5} />
              <span>인력 등록</span>
            </button>

            {/* 4. 체험 등록 버튼 */}
            <button
              onClick={() => setActiveSection(activeSection === 'experience' ? null : 'experience')}
              className={`h-[48px] rounded-xl px-3 transition-all duration-200 flex items-center justify-center gap-1.5 font-semibold text-xs ${
                activeSection === 'experience'
                  ? 'bg-orange-50 text-orange-900 shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <IconRocket size={18} stroke={1.5} />
              <span>체험 등록</span>
            </button>

          </aside>

          {/* 우측 카드 슬라이더 */}
          <div className="relative flex-1 min-w-0 h-[210px] lg:h-full">
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
                {carouselItems.map((card) => (
                  <div 
                    key={card.id}
                    className="flex-shrink-0"
                    style={{ 
                      width: `calc((100% - ${(visibleCount - 1) * 14}px) / ${visibleCount})`,
                      height: '100%'
                    }}
                  >
                    {card.type === 'job' ? (
                      <CompactJobCard
                        job={card}
                        onClick={() => onCardClick?.(card)}
                      />
                    ) : card.type === 'talent' ? (
                      <CompactTalentCard
                        talent={card}
                        onClick={() => onCardClick?.(card)}
                      />
                    ) : card.type === 'placeholder' ? (
                      <article className="card-interactive bg-white border border-dashed border-gray-300 rounded-lg animate-slide-up overflow-hidden h-full flex items-center justify-center p-4 text-center">
                        <p className="text-sm text-gray-500 leading-relaxed">
                          프로필 정보를 저장하면 맞춤 추천이 여기에 표시됩니다.
                        </p>
                      </article>
                    ) : (
                      <article
                        className="card-interactive border border-gray-200 rounded-lg animate-slide-up overflow-hidden h-full flex flex-col"
                        style={{ backgroundColor: promoBackground }}
                      >
                        <div className="flex flex-col h-full">
                          <div
                            className="w-full flex-shrink-0"
                            style={{
                              height: '2px',
                              backgroundImage: createBadgeGradient(promoCard?.badgeColor),
                              backgroundSize: '100% 100%',
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: '0 0'
                            }}
                          />
                          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 py-6 text-center">
                          <h3
                            className="font-semibold leading-tight whitespace-pre-line"
                            style={{ color: promoFontColor, fontSize: `${promoFontSize}px` }}
                          >
                            {promoHeadline}
                          </h3>
                          <div className="flex w-full flex-1 items-center justify-center" style={promoImageWrapperStyle}>
                            {promoImageSrc ? (
                              <img
                                src={promoImageSrc}
                                alt={promoHeadline}
                                className="w-auto object-contain drop-shadow"
                                style={promoImageStyle}
                                draggable={false}
                              />
                            ) : (
                              <div
                                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400"
                                style={promoImageStyle}
                              >
                                <span className="text-xs">이미지 없음</span>
                              </div>
                            )}
                          </div>
                          </div>
                        </div>
                      </article>
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
