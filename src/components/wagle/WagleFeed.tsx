// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 피드 목록 (모바일/데스크탑 공용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useRef, useCallback } from 'react';
import { useWagleStore } from '@/stores/wagleStore';
import { useAuthStore } from '@/stores/authStore';
import WagleThreadCard from './WagleThreadCard';
import WaglePreviewGate from './WaglePreviewGate';
import { WagleHashtagFilter } from './WagleHashtags';

const PREVIEW_COUNT = 3;

interface WagleFeedProps {
  onThreadClick: (thread: import('@/types/wagle').WagleThread) => void;
  onLoginClick: () => void;
}

export default function WagleFeed({ onThreadClick, onLoginClick }: WagleFeedProps) {
  const {
    threads,
    isLoadingThreads,
    hasMoreThreads,
    activeHashtag,
    loadThreads,
    loadMoreThreads,
    filterByHashtag,
  } = useWagleStore();
  const { user } = useAuthStore();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 초기 로드
  useEffect(() => {
    loadThreads(true);
  }, [loadThreads]);

  // 무한 스크롤 (로그인 유저만)
  useEffect(() => {
    if (!user) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreThreads && !isLoadingThreads) {
          loadMoreThreads();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [user, hasMoreThreads, isLoadingThreads, loadMoreThreads]);

  const handleHashtagClick = useCallback(
    (tag: string) => {
      filterByHashtag(activeHashtag === tag ? null : tag);
    },
    [activeHashtag, filterByHashtag]
  );

  // 비회원: 미리보기 제한
  const visibleThreads = user ? threads : threads.slice(0, PREVIEW_COUNT);

  return (
    <div className="flex flex-col h-full">
      {/* 해시태그 필터 */}
      <WagleHashtagFilter activeHashtag={activeHashtag} onSelect={filterByHashtag} />

      {/* 피드 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingThreads && threads.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {visibleThreads.map((thread) => (
              <WagleThreadCard
                key={thread.id}
                thread={thread}
                onClick={onThreadClick}
                onHashtagClick={handleHashtagClick}
              />
            ))}

            {/* 비회원 차단 */}
            {!user && threads.length > PREVIEW_COUNT && (
              <WaglePreviewGate onLoginClick={onLoginClick} />
            )}

            {/* 무한 스크롤 센티넬 */}
            {user && hasMoreThreads && (
              <div ref={sentinelRef} className="py-4 flex items-center justify-center">
                {isLoadingThreads && (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
