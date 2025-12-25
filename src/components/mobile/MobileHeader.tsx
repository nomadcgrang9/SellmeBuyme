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
  isHomePage?: boolean; // 홈 페이지 여부 (false면 항상 스크롤된 상태로 고정)
}

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

export default function MobileHeader({
  onSearchClick,
  onNotificationClick,
  onBookmarkClick,
  notificationCount = 0,
  isScrolled = false,
  promoCards = [],
  isHomePage = true
}: MobileHeaderProps) {
  // 활성화된 첫 번째 프로모카드 찾기
  const activeCard = useMemo(
    () => promoCards.find((card) => card.isActive),
    [promoCards]
  );

  // 홈이 아닌 경우 항상 스크롤된 상태로 고정
  const effectiveIsScrolled = isHomePage ? isScrolled : true;

  // 아이콘 색상 클래스 (스크롤 상태에 따라 변경)
  const iconColorClass = effectiveIsScrolled ? 'text-gray-800' : 'text-white';
  const hoverClass = effectiveIsScrolled
    ? 'hover:bg-gray-100 active:bg-gray-200'
    : 'hover:bg-white/10 active:bg-white/20';

  // 로고 스타일 (스크롤 전: 흰색, 스크롤 후: 그라데이션)
  const logoStyle = effectiveIsScrolled
    ? 'text-lg font-bold bg-gradient-to-r from-[#4facfe] to-[#00f2fe] bg-clip-text text-transparent transition-all duration-300'
    : 'text-lg font-bold text-white transition-all duration-300';

  // 헤더 배경 스타일 - 스크롤 시에만 흰색, 아니면 투명 (부모 배경 사용)
  const headerBgStyle = effectiveIsScrolled
    ? { backgroundColor: 'rgb(255, 255, 255)' }
    : { backgroundColor: 'transparent' };

  return (
    <header
      className="w-full h-14 px-4 flex items-center justify-between transition-colors duration-300"
      style={headerBgStyle}
    >
      {/* 로고 - 스크롤 전: 흰색, 스크롤 후: 그라데이션 */}
      <h1
        className={`${logoStyle} mr-2 shrink-0`}
        style={{ letterSpacing: '-0.5px' }}
      >
        셀미바이미
      </h1>

      {/* 검색바 (Fake Input) */}
      <button
        onClick={onSearchClick}
        className={`flex-1 h-9 mx-1 flex items-center px-3 rounded-full transition-colors ${effectiveIsScrolled ? 'bg-gray-100' : 'bg-white/20'
          }`}
        aria-label="검색"
      >
        <IconSearch
          size={18}
          stroke={1.5}
          className={effectiveIsScrolled ? 'text-gray-500' : 'text-white/80'}
        />
        <span className={`ml-2 text-sm ${effectiveIsScrolled ? 'text-gray-400' : 'text-white/70'
          }`}>
          검색어를 입력하세요
        </span>
      </button>

      <div className="flex items-center gap-1 shrink-0">
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
