'use client';

import type { ViewType } from '@/types';
import { useSearchStore } from '@/stores/searchStore';
import { useAuthStore } from '@/stores/authStore';

interface BottomNavProps {
  onProfileClick?: () => void;
  onLoginClick?: () => void;
}

export default function BottomNav({ onProfileClick, onLoginClick }: BottomNavProps) {
  const viewType = useSearchStore((state) => state.viewType);
  const setViewType = useSearchStore((state) => state.setViewType);
  const { status, user } = useAuthStore((state) => ({
    status: state.status,
    user: state.user
  }));

  const isAuthenticated = status === 'authenticated' && user;

  const tabs = [
    {
      id: 'profile' as const,
      icon: '/icon/mobile_profile.ico',
      label: isAuthenticated ? '프로필' : '로그인',
      active: false,
      onClick: () => {
        if (isAuthenticated) {
          onProfileClick?.();
        } else {
          onLoginClick?.();
        }
      }
    },
    {
      id: 'job' as ViewType,
      icon: '/icon/noti.ico',
      label: '공고보기',
      active: viewType === 'job',
      onClick: () => setViewType('job')
    },
    {
      id: 'talent' as ViewType,
      icon: '/icon/people.ico',
      label: '인력보기',
      active: viewType === 'talent',
      onClick: () => setViewType('talent')
    },
    {
      id: 'experience' as ViewType,
      icon: '/icon/play.ico',
      label: '체험보기',
      active: viewType === 'experience',
      onClick: () => setViewType('experience')
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex h-full max-w-container mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={tab.onClick}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              tab.active
                ? 'text-primary'
                : 'text-gray-500 active:text-gray-700'
            }`}
          >
            {/* 아이콘 표시 - 항상 색깔 표시 */}
            <img
              src={tab.icon}
              alt={tab.label}
              className="w-6 h-6"
            />
            {/* 라벨 (작게) */}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
