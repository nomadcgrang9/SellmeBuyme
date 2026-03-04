// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 모바일 채팅방 전체화면 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import ChatRoomView from '@/components/chat/ChatRoom';
import { useActivityTracking } from '@/lib/hooks/useActivityTracking';

export default function MobileChatRoom() {
  const roomId = window.location.pathname.split('/chat/')[1];
  const { user, status } = useAuthStore();
  const { setActiveRoom, activeRoomId } = useChatStore();

  // 지역별 접속 통계 수집
  useActivityTracking();

  useEffect(() => {
    if (roomId && user && roomId !== activeRoomId) {
      setActiveRoom(roomId);
    }
  }, [roomId, user, activeRoomId, setActiveRoom]);

  const handleBack = () => {
    window.history.back();
  };

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-sm text-gray-600 mb-1">로그인이 필요합니다</p>
        <p className="text-xs text-gray-400 mb-4">채팅 기능을 사용하려면 먼저 로그인해주세요</p>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="px-4 py-2 bg-[#3B82F6] text-white text-sm rounded-lg"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <ChatRoomView onBack={handleBack} />
    </div>
  );
}
