// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MobileWagle - 모바일 와글와글 피드 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useState } from 'react';
import { ChevronLeft, Plus, MessagesSquare } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWagleStore } from '@/stores/wagleStore';
import { useWagleRealtime } from '@/hooks/useWagleRealtime';
import WagleFeed from '@/components/wagle/WagleFeed';
import WagleComposer from '@/components/wagle/WagleComposer';
import type { WagleThread } from '@/types/wagle';
import { supabase } from '@/lib/supabase/client';
import { useActivityTracking } from '@/lib/hooks/useActivityTracking';
import { useGeolocation } from '@/lib/hooks/useGeolocation';

export default function MobileWagle() {
  const { user, status, initialize } = useAuthStore();
  const { isComposerOpen, setComposerOpen, loadUnreadCount } = useWagleStore();

  // 지역별 접속 통계 수집
  useGeolocation();
  useActivityTracking();

  // 인증 초기화
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Realtime 구독
  useWagleRealtime();

  // 알림 카운트 로드
  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user, loadUnreadCount]);

  const handleBack = () => {
    window.location.href = '/';
  };

  const handleThreadClick = (thread: WagleThread) => {
    window.location.href = `/wagle/${thread.id}`;
  };

  const handleLoginClick = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/wagle`,
      },
    });
  };

  // 로딩 중
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={handleBack} className="p-1 text-gray-500 hover:text-gray-700">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-1.5">
            <MessagesSquare size={20} className="text-gray-800" />
            <span className="text-base font-semibold text-gray-800">와글와글</span>
          </div>
          <div className="w-8" /> {/* 좌우 균형용 */}
        </div>
      </header>

      {/* 피드 */}
      <div className="flex-1">
        <WagleFeed
          onThreadClick={handleThreadClick}
          onLoginClick={handleLoginClick}
        />
      </div>

      {/* 글쓰기 FAB */}
      {user && (
        <button
          onClick={() => setComposerOpen(true)}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-[#3B82F6] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
          aria-label="글쓰기"
        >
          <Plus size={24} />
        </button>
      )}

      {/* 글쓰기 화면 */}
      {isComposerOpen && (
        <WagleComposer onClose={() => setComposerOpen(false)} />
      )}
    </div>
  );
}
