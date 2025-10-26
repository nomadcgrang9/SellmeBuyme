import { useState, useMemo, useEffect } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { createBadgeGradient, normalizeHex } from '@/lib/colorUtils';
import type { PromoCardSettings } from '@/types';

interface PromoCardStackProps {
  cards: PromoCardSettings[];
  className?: string;
}

const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

export default function PromoCardStack({ cards, className = '' }: PromoCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 활성화된 카드만 필터링
  const activeCards = useMemo(
    () => cards.filter((card) => card.isActive),
    [cards]
  );

  if (activeCards.length === 0) {
    return null;
  }

  const currentCard = activeCards[currentIndex];

  // 다음 카드로 전환 (페이드 아웃 → 인덱스 변경 → 페이드 인)
  const handleNext = () => {
    if (isTransitioning) return; // 전환 중에는 클릭 무시

    setIsTransitioning(true);

    // 500ms 후 카드 변경 (페이드 아웃 시간)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCards.length);
      setIsTransitioning(false);
    }, 300);
  };

  // 자동 재생 타이머
  useEffect(() => {
    // 카드가 1개 이하이거나 자동 재생이 꺼져있으면 타이머 설정 안 함
    if (activeCards.length <= 1 || !currentCard.autoPlay) {
      return;
    }

    // 전환 중에는 타이머 설정 안 함 (전환 완료 후 다시 설정됨)
    if (isTransitioning) {
      return;
    }

    const timer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % activeCards.length);
        setIsTransitioning(false);
      }, 300);
    }, currentCard.duration);

    return () => clearTimeout(timer);
  }, [currentIndex, activeCards.length, currentCard.autoPlay, currentCard.duration, isTransitioning]);

  // 배지 바 스타일
  const badgeBarStyle = currentCard.badgeColorMode === 'gradient'
    ? {
        backgroundImage: `linear-gradient(90deg, ${pickGradientValue(
          currentCard.badgeGradientStart,
          DEFAULT_BADGE_GRADIENT[0]
        )} 0%, ${pickGradientValue(
          currentCard.badgeGradientEnd,
          DEFAULT_BADGE_GRADIENT[1]
        )} 100%)`
      }
    : { backgroundImage: createBadgeGradient(currentCard.badgeColor) };

  // 배경 스타일
  const backgroundStyle = currentCard.backgroundColorMode === 'gradient'
    ? {
        backgroundImage: `linear-gradient(135deg, ${pickGradientValue(
          currentCard.backgroundGradientStart,
          '#6366f1'
        )} 0%, ${pickGradientValue(
          currentCard.backgroundGradientEnd,
          '#22d3ee'
        )} 100%)`
      }
    : { backgroundColor: currentCard.backgroundColor };

  const headlineStyle = {
    color: currentCard.fontColor,
    fontSize: `${currentCard.fontSize}px`
  };

  const clampedImageScale = Math.min(Math.max(currentCard.imageScale ?? 1, 0.5), 1.5);
  const imageWrapperStyle = {
    height: `${162 * clampedImageScale}px` // 180 → 162 (10% 축소)
  };

  const imageStyle = {
    maxHeight: `${153 * clampedImageScale}px`, // 170 → 153
    maxWidth: `${216 * clampedImageScale}px`  // 240 → 216
  };

  return (
    <div className={`relative w-[227px] h-[227px] ${className}`}>
      {/* 카드 */}
      <article
        onClick={handleNext}
        className="w-full h-full cursor-pointer border border-gray-200 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {/* 배지 바 */}
        <div className="w-full h-1.5" style={badgeBarStyle} />

        {/* 카드 내용 */}
        <div
          className="flex flex-col items-center justify-center gap-3 px-4 pt-6 pb-4 text-center h-[calc(100%-6px)] transition-opacity duration-300"
          style={{
            ...backgroundStyle,
            opacity: isTransitioning ? 0 : 1
          }}
        >
          <h3
            className="font-bold leading-tight whitespace-pre-line"
            style={headlineStyle}
          >
            {currentCard.headline}
          </h3>
          <div
            className="flex w-full items-center justify-center"
            style={imageWrapperStyle}
          >
            {currentCard.imageUrl ? (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/70 p-2">
                <img
                  src={currentCard.imageUrl}
                  alt={currentCard.headline}
                  className="w-auto object-contain drop-shadow"
                  style={imageStyle}
                  draggable={false}
                />
              </div>
            ) : (
              <div
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400"
                style={imageStyle}
              >
                <IconSparkles size={24} stroke={1.8} />
                <p className="mt-1 text-xs">이미지 없음</p>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* 인디케이터 (하단 점) */}
      {activeCards.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
          {activeCards.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 w-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
