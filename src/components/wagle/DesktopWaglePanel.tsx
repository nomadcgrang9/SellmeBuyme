// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데스크탑 와글와글 호버 서랍 (우측 사이드바 옆)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, PenSquare, Send, X, MessagesSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWagleStore } from '@/stores/wagleStore';
import { useAuthStore } from '@/stores/authStore';
import { useSidePanelStore } from '@/stores/sidePanelStore';
import { useWagleRealtime } from '@/hooks/useWagleRealtime';
import WagleFeed from './WagleFeed';
import WagleThreadDetail from './WagleThreadDetail';
import WagleReplyInput from './WagleReplyInput';
import WagleComposer from './WagleComposer';
import type { WagleThread } from '@/types/wagle';
import { supabase } from '@/lib/supabase/client';

export default function DesktopWaglePanel() {
  const { user } = useAuthStore();
  const wagleZ = useSidePanelStore((s) => s.panelZ['wagle'] ?? 30);
  const {
    isDesktopPanelOpen: isOpen,
    activeThread,
    replies,
    isLoadingReplies,
    isComposerOpen,
    setActiveThread,
    loadThread,
    loadReplies,
    loadUnreadCount,
    setComposerOpen,
  } = useWagleStore();

  const [replyTarget, setReplyTarget] = useState<{
    parentId: string | null;
    depth: number;
    mentionUserId?: string;
    mentionUserName?: string;
  } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // 하단 인라인 글쓰기
  const [quickContent, setQuickContent] = useState('');
  const [isQuickSending, setIsQuickSending] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Realtime
  useWagleRealtime();

  useEffect(() => {
    if (isOpen && user) {
      loadUnreadCount();
    }
  }, [isOpen, user, loadUnreadCount]);

  const closeWagle = useCallback(() => useWagleStore.getState().setDesktopPanelOpen(false), []);

  // ESC 키로 닫기 + 바깥 클릭으로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWagle();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeWagle();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeWagle]);

  const handleThreadClick = (thread: WagleThread) => {
    setActiveThread(thread);
    loadThread(thread.id);
    loadReplies(thread.id);
  };

  const handleBackToFeed = () => {
    setActiveThread(null);
    setReplyTarget(null);
  };

  const handleReplyTo = (parentId: string | null, depth: number, mentionUserId?: string, mentionUserName?: string) => {
    setReplyTarget({ parentId, depth, mentionUserId, mentionUserName });
  };

  const handleLoginClick = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleQuickSubmit = async () => {
    if (!quickContent.trim() || isQuickSending) return;
    setIsQuickSending(true);
    try {
      await useWagleStore.getState().createThread(quickContent.trim(), []);
      setQuickContent('');
    } finally {
      setIsQuickSending(false);
    }
  };

  const profileImage = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 md:hidden"
          style={{ zIndex: wagleZ - 1 }}
          onClick={() => useWagleStore.getState().setDesktopPanelOpen(false)}
        />
      )}
      {isOpen && (
        <motion.div
          ref={panelRef}
          key="panel"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed top-[60px] left-3 right-3 bottom-[76px] flex flex-col bg-white rounded-2xl overflow-hidden md:absolute md:inset-auto md:top-4 md:bottom-4 md:right-[128px] md:w-[420px]"
          style={{
            zIndex: wagleZ,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* 헤더 - 미니멀 */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {activeThread && (
                <button
                  onClick={handleBackToFeed}
                  className="p-1 -ml-1 text-gray-400 hover:text-gray-800 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <MessagesSquare size={17} className="text-purple-500" />
                <h2 className="text-[15px] font-bold text-gray-900">와글와글</h2>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!activeThread && (
                <button
                  onClick={() => user ? setComposerOpen(true) : handleLoginClick()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <PenSquare size={15} />
                  글쓰기
                </button>
              )}
              <button
                onClick={closeWagle}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {activeThread ? (
              <>
                <div className="flex-1 overflow-y-auto">
                  <WagleThreadDetail
                    thread={activeThread}
                    replies={replies}
                    isLoading={isLoadingReplies}
                    onReplyTo={handleReplyTo}
                  />
                </div>
                {user && (
                  <WagleReplyInput
                    threadId={activeThread.id}
                    replyTarget={replyTarget}
                    onClearReplyTarget={() => setReplyTarget(null)}
                    inline
                  />
                )}
              </>
            ) : (
              <>
                <div className="flex-1 overflow-hidden">
                  <WagleFeed
                    onThreadClick={handleThreadClick}
                    onLoginClick={handleLoginClick}
                  />
                </div>

                {/* 하단 고정 인라인 글쓰기 바 */}
                <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {user && profileImage ? (
                      <img src={profileImage} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                    )}
                    <input
                      ref={quickInputRef}
                      value={quickContent}
                      onChange={(e) => setQuickContent(e.target.value)}
                      onFocus={() => { if (!user) { handleLoginClick(); quickInputRef.current?.blur(); } }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickSubmit(); } }}
                      placeholder="선생님들과 이야기 나눠보세요..."
                      className="flex-1 text-sm text-gray-800 bg-gray-100 rounded-full px-4 py-2 outline-none placeholder:text-gray-400 focus:bg-gray-50 focus:ring-1 focus:ring-blue-200 transition-colors"
                      maxLength={1000}
                      readOnly={!user}
                    />
                    <button
                      onClick={() => user ? handleQuickSubmit() : handleLoginClick()}
                      disabled={!quickContent.trim() || isQuickSending}
                      className={`p-2 rounded-full transition-colors ${
                        quickContent.trim() && !isQuickSending
                          ? 'text-blue-500 hover:bg-blue-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 글쓰기 모달 */}
          {isComposerOpen && (
            <WagleComposer onClose={() => setComposerOpen(false)} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
