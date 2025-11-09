'use client';

import type { Card, PromoCardSettings } from '@/types';
import type { UserProfileRow } from '@/lib/supabase/profiles';
import { IconChevronLeft, IconChevronRight, IconSparkles } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import CompactJobCard from '../cards/CompactJobCard';
import CompactTalentCard from '../cards/CompactTalentCard';
import TextType from '../common/TextType';
import JobPostingForm from '../forms/JobPostingForm';
import TalentRegistrationForm from '../forms/TalentRegistrationForm';
import { createTalent, createExperience } from '@/lib/supabase/queries';
import type { TalentRegistrationFormData, ExperienceRegistrationFormData } from '@/lib/validation/formSchemas';
import ExperienceRegistrationForm from '../forms/ExperienceRegistrationForm';
import PromoCardStack from '../promo/PromoCardStack';
import { useSearchStore } from '@/stores/searchStore';

interface AIRecommendationsProps {
  cards: Card[];
  userName?: string;
  loading?: boolean;
  headlineOverride?: string;
  descriptionOverride?: string;
  promoCards?: PromoCardSettings[];
  profile?: UserProfileRow | null;
  onCardClick?: (card: Card) => void;
}

export default function AIRecommendations({
  cards,
  userName = '방문자',
  loading = false,
  headlineOverride,
  descriptionOverride,
  promoCards = [],
  profile,
  onCardClick
}: AIRecommendationsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const [activeSection, setActiveSection] = useState<'job' | 'talent' | 'experience' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setViewType, setFilter } = useSearchStore();

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

  type CarouselMetaItem = { id: string; type: 'placeholder' };

  const visibleCards = cards.slice(0, 8);
  const placeholderCard: CarouselMetaItem = { id: 'placeholder-card', type: 'placeholder' };
  const shouldShowPlaceholder = !loading && visibleCards.length === 0;

  // 프로모는 캐러셀에서 제외 - 순수하게 카드만
  const carouselItems: (Card | CarouselMetaItem)[] = shouldShowPlaceholder
    ? [placeholderCard]
    : visibleCards;

  const totalItems = carouselItems.length;
  const maxIndex = Math.max(totalItems - visibleCount, 0);

  // 프로모카드 스택 표시 여부
  const shouldIncludePromo = promoCards.length > 0;

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [cards.length]);

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

  return (
    <section className="bg-white pt-0 md:pt-6 pb-2">
      <div className="max-w-container mx-auto px-6">
        {/* 3단 그리드: 등록버튼 | AI코멘트+카드 | 프로모 */}
        <div className="flex flex-col gap-4 lg:flex-row lg:h-[280px]">

          {/* 1. 좌측: 등록 버튼 3개 - 데스크톱만 표시 */}
          <aside className="hidden lg:flex flex-col gap-1 shrink-0 lg:w-[140px] lg:pt-[72px]">
            {/* 공고 등록 */}
            <button
              onClick={() => setActiveSection(activeSection === 'job' ? null : 'job')}
              className={`h-[50px] rounded-xl px-3 transition-all duration-200 flex items-center justify-center gap-1.5 font-semibold text-base border ${
                activeSection === 'job'
                  ? 'bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] text-white shadow-md border-gray-300'
                  : 'text-gray-900 hover:opacity-80 border-gray-300'
              }`}
            >
              <img src="/icon/noti.ico" alt="공고" className="w-[29px] h-[29px]" />
              <span>공고 등록</span>
            </button>

            {/* 인력 등록 */}
            <button
              onClick={() => setActiveSection(activeSection === 'talent' ? null : 'talent')}
              className={`h-[50px] rounded-xl px-3 transition-all duration-200 flex items-center justify-center gap-1.5 font-semibold text-base border ${
                activeSection === 'talent'
                  ? 'bg-gradient-to-r from-[#7db8a3] to-[#6fb59b] text-white shadow-md border-gray-300'
                  : 'text-gray-900 hover:opacity-80 border-gray-300'
              }`}
            >
              <img src="/icon/people.ico" alt="인력" className="w-[29px] h-[29px]" />
              <span>인력 등록</span>
            </button>

            {/* 체험 등록 */}
            <button
              onClick={() => setActiveSection(activeSection === 'experience' ? null : 'experience')}
              className={`h-[50px] rounded-xl px-3 transition-all duration-200 flex items-center justify-center gap-1.5 font-semibold text-base border ${
                activeSection === 'experience'
                  ? 'bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] text-gray-900 shadow-md border-gray-300'
                  : 'text-gray-900 hover:opacity-80 border-gray-300'
              }`}
            >
              <img src="/icon/play.ico" alt="체험" className="w-[29px] h-[29px]" />
              <span>체험 등록</span>
            </button>
          </aside>

          {/* 2. 중앙: AI 코멘트 띠지 + 카드 캐러셀 OR 등록 폼 */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 lg:h-full">
            {activeSection === 'job' ? (
              // 공고 등록 폼
              <JobPostingForm onClose={() => setActiveSection(null)} />
            ) : activeSection === 'talent' ? (
              // 인력 등록 폼
              <TalentRegistrationForm
                onClose={() => setActiveSection(null)}
                onSubmit={async (form: TalentRegistrationFormData) => {
                  const card = await createTalent(form);
                  alert('인력 등록이 완료되었습니다.');
                  // 인력 뷰로 전환하여 새로 등록된 카드 표시
                  setTimeout(() => {
                    setViewType('talent');
                    // 카드 목록 강제 새로고침을 위해 lastUpdatedAt 업데이트
                    setFilter('sort', '최신순');
                    setActiveSection(null);
                  }, 500);
                }}
              />
            ) : activeSection === 'experience' ? (
              // 체험 등록 폼
              <ExperienceRegistrationForm
                onClose={() => setActiveSection(null)}
                onSubmit={async (form: ExperienceRegistrationFormData) => {
                  const timestamp = new Date().toISOString();
                  console.log(`[AIRecommendations ${timestamp}] ✅ 체험 등록 시작:`, form);
                  try {
                    const result = await createExperience(form);
                    console.log(`[AIRecommendations ${timestamp}] 체험 등록 성공:`, result);
                    alert('체험 등록이 완료되었습니다.');
                    // 체험 뷰로 전환하여 새로 등록된 카드 표시
                    setTimeout(() => {
                      console.log(`[AIRecommendations ${timestamp}] 체험 뷰로 전환`);
                      setViewType('experience');
                      // 카드 목록 강제 새로고침을 위해 lastUpdatedAt 업데이트
                      setFilter('sort', '최신순');
                      setActiveSection(null);
                    }, 500);
                  } catch (error) {
                    console.error(`[AIRecommendations ${timestamp}] 체험 등록 실패:`, error);
                    throw error; // ExperienceRegistrationForm의 catch로 전달
                  }
                }}
              />
            ) : (
              <>
                {/* AI 코멘트 띠지 */}
                <div className="h-[60px] rounded-xl p-3 flex items-center gap-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-purple-50 shadow-sm">
                  <div className="flex items-center justify-center flex-shrink-0">
                    <IconSparkles size={24} stroke={1.5} className="text-amber-500" />
                  </div>
                  {/* 모든 화면에서 동일한 텍스트 */}
                  <div>
                    <TextType
                      text="선생님을 위해 셀바가 열심히 찾아봤어요"
                      as="p"
                      className="text-[0.9rem] font-semibold text-gray-900 leading-snug"
                      typingSpeed={60}
                      loop={false}
                      showCursor={false}
                      initialDelay={300}
                    />
                  </div>
                </div>

                {/* 카드 캐러셀 */}
                <div className="relative flex-1 min-h-[235px]">
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
                    className="overflow-hidden h-full px-1"
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
                          className="flex-shrink-0 min-h-[235px]"
                          style={{
                            width: `calc((100% - ${(visibleCount - 1) * 10}px - 8px) / ${visibleCount})`,
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
                          ) : card.id === 'anonymous-info-card' ? (
                            <article className="card-interactive bg-white border border-gray-200 rounded-lg animate-slide-up overflow-hidden h-full min-h-[235px] flex items-center justify-center p-6 text-center shadow-sm">
                              <p className="text-sm text-gray-500 leading-relaxed">
                                위치기반으로만<br/>
                                추천중,<br/>
                                로그인 하면<br/>
                                선생님 상황에 맞는<br/>
                                카드로만 골라서<br/>
                                추천해드립니다
                              </p>
                            </article>
                          ) : (
                            <article className="card-interactive bg-white border border-gray-200 rounded-lg animate-slide-up overflow-hidden h-full min-h-[235px] flex items-center justify-center p-4 text-center shadow-sm">
                              <p className="text-sm text-gray-500 leading-relaxed">
                                위치기반으로만<br/>
                                추천중,<br/>
                                로그인 하면<br/>
                                선생님 상황에 맞는<br/>
                                카드로만 골라서<br/>
                                추천해드립니다
                              </p>
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
              </>
            )}
          </div>

          {/* 3. 우측: 프로모카드 스택 (독립 영역) - 등록 폼 활성화 시 숨김, 모바일에서는 숨김 */}
          {shouldIncludePromo && !activeSection && (
            <aside className="hidden lg:flex shrink-0 lg:w-[280px] lg:h-[280px] items-center justify-center">
              <PromoCardStack cards={promoCards} />
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
