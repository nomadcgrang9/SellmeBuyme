'use client';

import type { Card, PromoCardSettings } from '@/types';
import type { UserProfileRow } from '@/lib/supabase/profiles';
import { IconChevronLeft, IconChevronRight, IconSparkles, IconMessageCircle } from '@tabler/icons-react';
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

  const getAiComment = () => {
    if (!primaryCard) {
      return {
        headline: '추천을 준비 중이에요',
        description: '관심 조건을 분석해 맞춤 카드를 정리해둘게요.'
      };
    }

    // 프로필 정보 추출
    const displayName = profile?.display_name || userName;
    const regionText = profile?.interest_regions?.[0] || '관심 지역';
    const capableSubject = profile?.capable_subjects?.[0];
    const teacherLevel = profile?.teacher_level;

    // 과목에서 학교급 제거 (예: "초등 과학" → "과학")
    const subjectClean = capableSubject?.replace(/초등|중등|유치원|특수/g, '').trim() || '과목';

    if (primaryCard.type === 'job') {
      const trimmedLocation = primaryCard.location?.split(/[ ,]/).filter(Boolean).slice(0, 2).join(' ') || '지역';
      const cardCount = cards.length;

      // 프로필이 있으면 맞춤 코멘트
      if (profile && capableSubject) {
        // 긴급 공고 확인
        const isUrgent = primaryCard.isUrgent ||
          (primaryCard.deadline && new Date(primaryCard.deadline).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000);

        if (isUrgent) {
          return {
            headline: '마감 임박 공고 있어요!',
            description: `${displayName}님 조건에 맞는 공고 중 곧 마감되는 것부터 보여드려요. 서두르세요!`
          };
        }

        // 완벽 매칭 (지역 + 과목 일치)
        if (trimmedLocation.includes(regionText) || regionText.includes(trimmedLocation.split(' ')[0])) {
          return {
            headline: `${displayName}님 딱 맞춤! ${regionText} ${subjectClean} 공고예요`,
            description: `선생님이 찾던 조건 그대로예요. ${regionText} 지역 ${subjectClean} 공고 ${cardCount}건, 모두 최근 올라온 거라 경쟁률도 낮을 거예요.`
          };
        }

        // 지역 확대
        return {
          headline: `${regionText} 외 인근 지역도 함께 살펴봤어요`,
          description: `${regionText}에 신규 공고가 적어서 걱정하실까봐 인근 지역도 포함했어요. ${cardCount}건 중에 마음에 드는 학교 있으시면 좋겠네요!`
        };
      }

      // 프로필 없으면 기본 코멘트
      const mainTag = primaryCard.tags?.[0];
      return {
        headline: `${trimmedLocation} 인근 공고를 먼저 모았어요`,
        description: `${userName}님 관심 조건과 ${mainTag || '최근 키워드'}를 우선으로 최신 공고를 추렸어요.`
      };
    }

    if (primaryCard.type === 'talent') {
      const trimmedLocation = Array.isArray(primaryCard.location)
        ? (primaryCard.location as string[]).slice(0, 2).join(', ')
        : primaryCard.location?.split(/[ ,]/).filter(Boolean).slice(0, 2).join(', ');

      // 프로필이 있으면 맞춤 코멘트
      if (profile) {
        return {
          headline: `${regionText} 지역 인재를 골라봤어요`,
          description: `${displayName}님이 찾는 조건의 전문가를 우선 추천드려요. 전문 강사 ${cards.length}명 정리했어요.`
        };
      }

      // 프로필 없으면 기본 코멘트
      const mainTag = primaryCard.tags?.[0];
      return {
        headline: `${primaryCard.specialty} 인재를 골라봤어요`,
        description: `${trimmedLocation || primaryCard.location}에서 활동 중인 ${mainTag ?? '전문'} 강사를 우선 추천드려요.`
      };
    }

    return {
      headline: '추천을 준비 중이에요',
      description: '필요한 조건을 분석해 맞춤 카드를 준비하고 있어요.'
    };
  };

  const baseComment = getAiComment();
  const headline = loading
    ? '추천을 준비 중이에요'
    : headlineOverride ?? baseComment.headline;
  const description = loading
    ? 'AI가 프로필을 분석해 맞춤 카드를 정리하고 있어요.'
    : descriptionOverride ?? baseComment.description;

  return (
    <section className="bg-gradient-to-b from-[#f4f5f7] via-[#eef0f2] to-[#e2e4e7] pt-2 pb-6">
      <div className="max-w-container mx-auto px-6">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-2 mb-2">
          <IconSparkles size={18} stroke={1.5} className="text-primary" />
          <h2 className="text-base font-bold text-gray-900">셀바 AI</h2>
        </div>

        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-stretch lg:h-[260px]">
          {/* 좌측 탭메뉴: AI 코멘트 */}
          <aside className="flex min-h-[200px] flex-col justify-between rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-100 via-blue-50 to-white p-4 shadow-md shrink-0 lg:h-full lg:w-[220px] lg:min-w-[220px] lg:max-w-[240px]">
            <div className="space-y-2.5 flex-1">
              <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <IconMessageCircle size={16} stroke={1.5} className="text-primary" />
                <span>AI 코멘트</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="block text-[17px] font-semibold text-gray-900 leading-snug mb-1">
                  {headline}
                </span>
                <span className="block line-clamp-3 break-words whitespace-pre-line text-[13px] leading-relaxed text-gray-600">
                  {description}
                </span>
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
