import { IconSearch, IconBell, IconHeart } from '@tabler/icons-react';
import { useMemo } from 'react';
import { normalizeHex } from '@/lib/colorUtils';
import type { PromoCardSettings } from '@/types';

interface MobileHeaderProps {
  onSearchClick: () => void;
  onNotificationClick: () => void;
  onBookmarkClick: () => void;
  notificationCount?: number;
  isScrolled?: boolean;
  promoCards?: PromoCardSettings[];
}

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

export default function MobileHeader({
  onSearchClick,
  onNotificationClick,
  onBookmarkClick,
  notificationCount = 0,
  isScrolled = false,
  promoCards = []
}: MobileHeaderProps) {
  // 활성화된 첫 번째 프로모카드 찾기
  const activeCard = useMemo(
    () => promoCards.find((card) => card.isActive),
    [promoCards]
  );
  // 아이콘 색상 클래스 (스크롤 상태에 따라 변경)
  const iconColorClass = isScrolled ? 'text-gray-800' : 'text-white';
  const hoverClass = isScrolled
    ? 'hover:bg-gray-100 active:bg-gray-200'
    : 'hover:bg-white/10 active:bg-white/20';

  // 로고 스타일 (스크롤 전: 흰색, 스크롤 후: 그라데이션)
  const logoStyle = isScrolled
    ? 'text-lg font-bold bg-gradient-to-r from-[#4facfe] to-[#00f2fe] bg-clip-text text-transparent transition-all duration-300'
    : 'text-lg font-bold text-white transition-all duration-300';

  // 헤더 배경 스타일 - 스크롤 시에만 흰색, 아니면 투명 (부모 배경 사용)
  const headerBgStyle = isScrolled
    ? { backgroundColor: 'rgb(255, 255, 255)' }
    : { backgroundColor: 'transparent' };

  return (
    <header
      className="w-full h-14 px-4 flex items-center justify-between transition-colors duration-300"
      style={headerBgStyle}
    >
      {/* 로고 - 스크롤 전: 흰색, 스크롤 후: 그라데이션 */}
      <h1
        className={logoStyle}
        style={{ letterSpacing: '-0.5px' }}
      >
        셀미바이미
      </h1>

      <div className="flex items-center gap-3">
        {/* 검색 아이콘 */}
        <button
          onClick={onSearchClick}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${hoverClass}`}
          aria-label="검색"
        >
          <IconSearch size={22} stroke={1.5} className={iconColorClass} />
        </button>

        {/* 알림 아이콘 */}
        <button
          onClick={onNotificationClick}
          className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-colors ${hoverClass}`}
          aria-label="알림"
        >
          <IconBell size={22} stroke={1.5} className={iconColorClass} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* 북마크 아이콘 */}
        <button
          onClick={onBookmarkClick}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${hoverClass}`}
          aria-label="북마크"
        >
          <IconHeart size={22} stroke={1.5} className={iconColorClass} />
        </button>
      </div>
    </header>
  );
}
