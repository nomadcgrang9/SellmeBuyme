import { IconSearch, IconBell, IconHeart, IconSparkles } from '@tabler/icons-react';
import { useState, useMemo, useEffect } from 'react';
import { createBadgeGradient, normalizeHex } from '@/lib/colorUtils';
import type { PromoCardSettings } from '@/types';

interface IntegratedHeaderPromoProps {
  promoCards: PromoCardSettings[];
  onSearchClick: () => void;
  onNotificationClick: () => void;
  onBookmarkClick: () => void;
  notificationCount?: number;
}

const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

export default function IntegratedHeaderPromo({
  promoCards,
  onSearchClick,
  onNotificationClick,
  onBookmarkClick,
  notificationCount = 0
}: IntegratedHeaderPromoProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 활성화된 카드만 필터링
  const activeCards = useMemo(
    () => promoCards.filter((card) => card.isActive),
    [promoCards]
  );

  const hasPromoCards = activeCards.length > 0;
  const currentCard = hasPromoCards ? activeCards[currentIndex] : null;

  // 자동 재생 타이머
  useEffect(() => {
    if (!currentCard || activeCards.length <= 1 || !currentCard.autoPlay || isTransitioning) {
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
  }, [currentIndex, activeCards.length, currentCard, isTransitioning]);

  // 다음 카드로 전환
  const handleNext = () => {
    if (isTransitioning || activeCards.length <= 1) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCards.length);
      setIsTransitioning(false);
    }, 300);
  };

  // 배지 바 스타일
  const badgeBarStyle = currentCard && currentCard.badgeColorMode === 'gradient'
    ? {
        backgroundImage: `linear-gradient(90deg, ${pickGradientValue(
          currentCard.badgeGradientStart,
          DEFAULT_BADGE_GRADIENT[0]
        )} 0%, ${pickGradientValue(
          currentCard.badgeGradientEnd,
          DEFAULT_BADGE_GRADIENT[1]
        )} 100%)`
      }
    : currentCard ? { backgroundImage: createBadgeGradient(currentCard.badgeColor) } : {};

  // 배경 스타일
  const backgroundStyle = currentCard && currentCard.backgroundColorMode === 'gradient'
    ? {
        backgroundImage: `linear-gradient(135deg, ${pickGradientValue(
          currentCard.backgroundGradientStart,
          '#6366f1'
        )} 0%, ${pickGradientValue(
          currentCard.backgroundGradientEnd,
          '#22d3ee'
        )} 100%)`
      }
    : currentCard ? { backgroundColor: currentCard.backgroundColor } : {
        backgroundImage: 'linear-gradient(to bottom right, #9DD2FF, #68B2FF)'
      };

  const headlineStyle = currentCard ? {
    color: currentCard.fontColor,
    fontSize: `${currentCard.fontSize}px`
  } : {};

  const clampedImageScale = currentCard ? Math.min(Math.max(currentCard.imageScale ?? 1, 0.5), 1.5) : 1;
  const imageWrapperStyle = {
    height: `${162 * clampedImageScale}px`
  };

  const imageStyle = {
    maxHeight: `${153 * clampedImageScale}px`,
    maxWidth: `${216 * clampedImageScale}px`
  };

  // 디버깅용 로그 - promoCards 전체를 의존성으로 추가
  useEffect(() => {
    console.log('[IntegratedHeaderPromo] 렌더링됨');
    console.log('  - promoCards:', promoCards);
    console.log('  - promoCards 개수:', promoCards.length);
    console.log('  - activeCards 개수:', activeCards.length);
    console.log('  - hasPromoCards:', hasPromoCards);
    console.log('  - currentCard:', currentCard?.headline || 'null');
  }, [promoCards, activeCards.length, hasPromoCards, currentCard]);

  return (
    <section
      className="relative w-full min-h-[56px] z-20"
      style={backgroundStyle}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-bold text-white" style={{ letterSpacing: '-0.5px' }}>
          셀미바이미
        </h1>

        <div className="flex items-center gap-3">
          {/* 검색 아이콘 */}
          <button
            onClick={onSearchClick}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="검색"
          >
            <IconSearch size={22} stroke={1.5} className="text-white" />
          </button>

          {/* 알림 아이콘 */}
          <button
            onClick={onNotificationClick}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="알림"
          >
            <IconBell size={22} stroke={1.5} className="text-white" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {/* 북마크 아이콘 */}
          <button
            onClick={onBookmarkClick}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="북마크"
          >
            <IconHeart size={22} stroke={1.5} className="text-white" />
          </button>
        </div>
      </div>

      {/* 프로모카드 (있을 경우) */}
      {hasPromoCards && currentCard && (
        <div
          onClick={handleNext}
          className="w-full cursor-pointer px-4 pb-4"
        >
          {/* 배지 바 */}
          <div className="w-full h-1.5 rounded-t-lg" style={badgeBarStyle} />

          {/* 카드 내용 */}
          <div
            className="flex flex-col items-center justify-center gap-3 px-4 pt-6 pb-4 text-center bg-white/10 backdrop-blur-sm rounded-b-lg border border-white/20 shadow-lg transition-opacity duration-300"
            style={{
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
                  className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/30 text-white/60"
                  style={imageStyle}
                >
                  <IconSparkles size={24} stroke={1.8} />
                  <p className="mt-1 text-xs">이미지 없음</p>
                </div>
              )}
            </div>
          </div>

          {/* 인디케이터 (하단 점) */}
          {activeCards.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
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
      )}

      {/* 프로모카드 없을 때 최소 높이 확보 */}
      {!hasPromoCards && (
        <div className="h-12" />
      )}
    </section>
  );
}
