// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MobileWagleThread - 모바일 와글와글 쓰레드 상세 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWagleStore } from '@/stores/wagleStore';
import { useWagleRealtime } from '@/hooks/useWagleRealtime';
import WagleThreadDetail from '@/components/wagle/WagleThreadDetail';
import WagleReplyInput from '@/components/wagle/WagleReplyInput';

export default function MobileWagleThread() {
  const threadId = window.location.pathname.split('/wagle/')[1];
  const { user, initialize } = useAuthStore();
  const {
    activeThread,
    replies,
    isLoadingReplies,
    loadThread,
    loadReplies,
  } = useWagleStore();

  const [replyTarget, setReplyTarget] = useState<{
    parentId: string | null;
    depth: number;
    mentionUserId?: string;
    mentionUserName?: string;
  } | null>(null);

  // 인증 초기화
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Realtime 구독
  useWagleRealtime();

  // 쓰레드 + 답글 로드
  useEffect(() => {
    if (threadId) {
      loadThread(threadId);
      loadReplies(threadId);
    }
  }, [threadId, loadThread, loadReplies]);

  const handleBack = () => {
    window.location.href = '/wagle';
  };

  const handleReplyTo = (parentId: string | null, depth: number, mentionUserId?: string, mentionUserName?: string) => {
    setReplyTarget({ parentId, depth, mentionUserId, mentionUserName });
  };

  // 로딩 중
  if (!activeThread) {
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
        <div className="flex items-center px-4 py-3">
          <button onClick={handleBack} className="p-1 text-gray-500 hover:text-gray-700 mr-2">
            <ChevronLeft size={24} />
          </button>
          <span className="text-base font-semibold text-gray-800">와글와글</span>
        </div>
      </header>

      {/* 쓰레드 상세 */}
      <div className="flex-1 overflow-y-auto pb-20">
        <WagleThreadDetail
          thread={activeThread}
          replies={replies}
          isLoading={isLoadingReplies}
          onReplyTo={handleReplyTo}
        />
      </div>

      {/* 답글 입력 */}
      {user && (
        <WagleReplyInput
          threadId={threadId}
          replyTarget={replyTarget}
          onClearReplyTarget={() => setReplyTarget(null)}
        />
      )}
    </div>
  );
}
