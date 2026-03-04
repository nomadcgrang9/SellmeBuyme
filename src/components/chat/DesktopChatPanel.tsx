// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데스크톱 1:1 채팅 사이드 패널 (와글와글 패널과 독립)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useRef } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useSidePanelStore } from '@/stores/sidePanelStore';
import { useChatGlobalRealtime } from '@/hooks/useChatRealtime';
import ChatRoomList from './ChatRoomList';
import ChatRoomView from './ChatRoom';
import ChatUserSearch from './ChatUserSearch';
import type { ChatRoom } from '@/types/chat';
import { supabase } from '@/lib/supabase/client';

export default function DesktopChatPanel() {
  const { user } = useAuthStore();
  const {
    isDesktopPanelOpen: isOpen,
    view,
    loadRooms,
    loadUnreadCount,
    setActiveRoom,
    backToList,
    openChat,
    closePanel,
  } = useChatStore();

  const chatZ = useSidePanelStore((s) => s.panelZ['chat'] ?? 30);
  const panelRef = useRef<HTMLDivElement>(null);

  // 글로벌 알림 구독
  useChatGlobalRealtime();

  useEffect(() => {
    if (isOpen && user) {
      loadRooms();
      loadUnreadCount();
    }
  }, [isOpen, user, loadRooms, loadUnreadCount]);

  // ESC 키로 닫기 + 바깥 클릭으로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    // 다음 틱에 등록하여 열기 이벤트가 즉시 닫기를 트리거하지 않도록
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closePanel]);

  const handleRoomClick = (room: ChatRoom) => {
    setActiveRoom(room.id, room);
  };

  const handleSearchSelect = async (userId: string) => {
    await openChat(userId);
  };

  const handleLoginClick = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 md:hidden"
          style={{ zIndex: chatZ - 1 }}
          onClick={closePanel}
        />
      )}
      {isOpen && (
        <motion.div
          ref={panelRef}
          key="panel"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 h-[70vh] flex flex-col bg-white rounded-t-3xl overflow-hidden md:absolute md:inset-auto md:top-4 md:bottom-4 md:right-[128px] md:w-[420px] md:rounded-2xl md:h-auto"
          style={{
            zIndex: chatZ,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* 드래그 핸들 (모바일만) */}
          <div className="flex justify-center pt-2 pb-1 md:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* 비로그인 */}
          {!user ? (
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <MessageCircle size={17} className="text-blue-500" />
                  <h2 className="text-[15px] font-bold text-gray-900">채팅</h2>
                </div>
                <button onClick={closePanel} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <p className="text-sm text-gray-600 mb-1">로그인이 필요합니다</p>
                <p className="text-xs text-gray-400 mb-4">
                  채팅 기능을 사용하려면 먼저 로그인해주세요
                </p>
                <button
                  onClick={handleLoginClick}
                  className="px-4 py-2 bg-[#3B82F6] text-white text-sm rounded-lg hover:bg-[#2563EB] transition-colors"
                >
                  로그인하기
                </button>
              </div>
            </>
          ) : view === 'room' ? (
            /* 채팅방 상세 */
            <ChatRoomView onBack={backToList} />
          ) : (
            /* 채팅방 목록 */
            <>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageCircle size={17} className="text-blue-500" />
                  <h2 className="text-[15px] font-bold text-gray-900">채팅</h2>
                </div>
                <button onClick={closePanel} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <ChatUserSearch onSelectUser={handleSearchSelect} />
              <div className="border-b border-gray-100" />
              <ChatRoomList onRoomClick={handleRoomClick} />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
