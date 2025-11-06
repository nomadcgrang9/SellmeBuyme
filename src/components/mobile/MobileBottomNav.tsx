import { useState } from 'react';
import { Home, ArrowLeftRight, Plus, MessageCircle, User } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';

interface MobileBottomNavProps {
  currentTab: 'home' | 'chat' | 'profile' | null;
  onTabChange: (tab: 'home' | 'chat' | 'profile' | null) => void;
  onChatClick: () => void;
  onProfileClick: () => void;
  onRegisterClick: () => void;
}

export default function MobileBottomNav({
  currentTab,
  onTabChange,
  onChatClick,
  onProfileClick,
  onRegisterClick
}: MobileBottomNavProps) {
  const { viewType, setViewType } = useSearchStore();

  // 토글 버튼 클릭 핸들러
  const handleToggleView = () => {
    const viewOrder: Array<'job' | 'talent' | 'experience'> = ['job', 'talent', 'experience'];
    const currentIndex = viewOrder.indexOf(viewType as 'job' | 'talent' | 'experience');
    // viewType이 'all'이면 -1을 반환하므로, 첫 번째 항목(job)으로 시작
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % viewOrder.length;
    setViewType(viewOrder[nextIndex]);
  };

  // 토글 버튼 색상 결정
  const getToggleColor = () => {
    switch (viewType) {
      case 'job':
        return '#7aa3cc'; // 공고 색상
      case 'talent':
        return '#7db8a3'; // 인력 색상
      case 'experience':
        return '#f4c96b'; // 체험 색상
      default:
        return '#9ca3af'; // 회색
    }
  };

  // 버튼 공통 스타일
  const getButtonClass = (isActive: boolean) => {
    return `flex flex-col items-center justify-center gap-1 transition-colors ${
      isActive ? '' : 'text-gray-400'
    }`;
  };

  // 아이콘 스타일 (선택 시 그라데이션)
  const getIconClass = (isActive: boolean) => {
    return isActive
      ? 'bg-gradient-to-r from-[#4facfe] to-[#00f2fe] bg-clip-text text-transparent'
      : 'text-gray-400';
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {/* 1. 홈 버튼 */}
        <button
          onClick={() => onTabChange(currentTab === 'home' ? null : 'home')}
          className="flex items-center justify-center transition-colors"
          aria-label="홈"
        >
          <Home
            size={28}
            strokeWidth={1.5}
            className={currentTab === 'home' ? 'text-[#4facfe]' : 'text-gray-400'}
          />
        </button>

        {/* 2. 토글 버튼 (공고/인력/체험) */}
        <button
          onClick={handleToggleView}
          className="flex items-center justify-center transition-colors"
          aria-label="카드 타입 전환"
        >
          <ArrowLeftRight
            size={28}
            strokeWidth={1.5}
            style={{ color: getToggleColor() }}
          />
        </button>

        {/* 3. 등록 버튼 */}
        <button
          onClick={onRegisterClick}
          className="flex items-center justify-center transition-colors"
          aria-label="등록"
        >
          <Plus
            size={28}
            strokeWidth={1.5}
            className="text-gray-400"
          />
        </button>

        {/* 4. 채팅 버튼 */}
        <button
          onClick={() => {
            onTabChange('chat');
            onChatClick();
          }}
          className="flex items-center justify-center transition-colors"
          aria-label="채팅"
        >
          <MessageCircle
            size={28}
            strokeWidth={1.5}
            className={currentTab === 'chat' ? 'text-[#4facfe]' : 'text-gray-400'}
          />
        </button>

        {/* 5. 프로필 버튼 */}
        <button
          onClick={() => {
            onTabChange('profile');
            onProfileClick();
          }}
          className="flex items-center justify-center transition-colors"
          aria-label="프로필"
        >
          <User
            size={28}
            strokeWidth={1.5}
            className={currentTab === 'profile' ? 'text-[#4facfe]' : 'text-gray-400'}
          />
        </button>
      </div>
    </nav>
  );
}
