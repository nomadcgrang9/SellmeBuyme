import { useState, useMemo, useEffect } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { createBadgeGradient, normalizeHex } from '@/lib/colorUtils';
import type { PromoCardSettings } from '@/types';

interface MobilePromoSectionProps {
  promoCards: PromoCardSettings[];
  currentCardIndex?: number;
  onCardChange?: (index: number) => void;
}

const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

export default function MobilePromoSection({
  promoCards,
  currentCardIndex: externalIndex,
  onCardChange
}: MobilePromoSectionProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 활성화된 카드만 필터링
  const activeCards = useMemo(
    () => promoCards.filter((card) => card.isActive),
    [promoCards]
  );

  const hasPromoCards = activeCards.length > 0;

  // 외부에서 제어하는 경우 외부 인덱스 사용, 아니면 내부 상태 사용
  const currentIndex = externalIndex !== undefined ? externalIndex : internalIndex;
  const currentCard = hasPromoCards ? activeCards[currentIndex] : null;

  // 자동 재생 타이머
  useEffect(() => {
    if (!currentCard || activeCards.length <= 1 || !currentCard.autoPlay || isTransitioning) {
      return;
    }

    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        const nextIndex = (currentIndex + 1) % activeCards.length;
        if (externalIndex !== undefined && onCardChange) {
          onCardChange(nextIndex);
        } else {
          setInternalIndex(nextIndex);
        }
        setIsTransitioning(false);
      }, 300);
    }, currentCard.duration);

    return () => clearTimeout(timer);
  }, [currentIndex, activeCards.length, currentCard, isTransitioning, externalIndex, onCardChange]);

  // 다음 카드로 전환
  const handleNext = () => {
    if (isTransitioning || activeCards.length <= 1) return;

    setIsTransitioning(true);
    setTimeout(() => {
      const nextIndex = (currentIndex + 1) % activeCards.length;
      if (externalIndex !== undefined && onCardChange) {
        onCardChange(nextIndex);
      } else {
        setInternalIndex(nextIndex);
      }
      setIsTransitioning(false);
    }, 300);
  };

  if (!hasPromoCards || !currentCard) {
    return null;
  }

  const headlineStyle = {
    color: currentCard.fontColor,
    fontSize: `${currentCard.fontSize}px`
  };

  const clampedImageScale = Math.min(Math.max(currentCard.imageScale ?? 1, 0.5), 1.5);

  return (
    <div className="w-full min-h-[240px] flex items-center justify-center">
      <div
        onClick={handleNext}
        className="w-full cursor-pointer px-4 pb-4"
      >
        {/* 카드 내용 */}
        <div
          className="flex flex-col items-center gap-3 px-4 pt-0 pb-4 text-center transition-opacity duration-300"
          style={{
            opacity: isTransitioning ? 0 : 1
          }}
        >
          {/* 이미지 - 동그란 흰색 배경 (3분의 2 크기) */}
          <div className="flex items-center justify-center w-32 h-32">
            {currentCard.imageUrl ? (
              <div className="flex items-center justify-center rounded-full bg-white p-3 w-full h-full shadow-lg">
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.headline}
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-full bg-white/90 w-full h-full">
                <IconSparkles size={32} stroke={1.8} className="text-gray-400" />
                <p className="mt-1 text-xs text-gray-500">이미지 없음</p>
              </div>
            )}
          </div>

          {/* 글귀 - 이미지 아래 */}
          <h3
            className="font-bold leading-tight whitespace-pre-line flex items-center justify-center px-2"
            style={headlineStyle}
          >
            {currentCard.headline}
          </h3>
        </div>
      </div>
    </div>
  );
}
