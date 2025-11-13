import { useEffect, useState } from 'react';
import { ChevronLeft, MessageCircle, User, UserPlus } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import BottomNav from '@/components/mobile/BottomNav';
import UserSearchModal from '@/components/chat/UserSearchModal';
import type { ChatRoom } from '@/types/chat';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MobileChat - 모바일 채팅 목록 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function MobileChat() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const { user, status, initialize } = useAuthStore((state) => ({
    user: state.user,
    status: state.status,
    initialize: state.initialize,
  }));
  const { rooms, isLoadingRooms, loadChatRooms, totalUnreadCount } = useChatStore((state) => ({
    rooms: state.rooms,
    isLoadingRooms: state.isLoadingRooms,
    loadChatRooms: state.loadChatRooms,
    totalUnreadCount: state.totalUnreadCount,
  }));

  // 인증 초기화
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Realtime 구독 (전역 - 모든 채팅방)
  useChatRealtime({
    enableTyping: false, // 목록 페이지에서는 타이핑 불필요
    enablePresence: true, // 온라인 상태는 표시
  });

  // 페이지 로드 시 채팅방 목록 불러오기
  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user, loadChatRooms]);

  // 뒤로가기
  const handleBack = () => {
    window.history.back();
  };

  // 채팅방 클릭
  const handleRoomClick = (room: ChatRoom) => {
    window.location.href = `/chat/${room.id}`;
  };

  // 인증 확인 중
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">채팅</h1>
            <div className="w-10" /> {/* 중앙 정렬용 */}
          </div>
        </div>

        {/* 로딩 중 */}
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#68B2FF] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 text-center">확인 중...</p>
        </div>

        {/* 하단 네비게이션 */}
        <BottomNav />
      </div>
    );
  }

  // 로그인 필요
  if (status === 'unauthenticated' || !user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">채팅</h1>
            <div className="w-10" /> {/* 중앙 정렬용 */}
          </div>
        </div>

        {/* 로그인 필요 메시지 */}
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500 text-center mb-2">로그인이 필요한 서비스입니다</p>
          <p className="text-sm text-gray-400 text-center">
            채팅 기능을 사용하려면 로그인해주세요
          </p>
        </div>

        {/* 하단 네비게이션 */}
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">채팅</h1>
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="사용자 검색"
            title="사용자 검색"
          >
            <UserPlus className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* 채팅방 목록 */}
      <div className="bg-white">
        {isLoadingRooms ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#68B2FF] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 text-sm">불러오는 중...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center mb-2">아직 채팅방이 없습니다</p>
            <p className="text-sm text-gray-400 text-center">
              인력 또는 체험 카드에서 채팅을 시작해보세요
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rooms.map((room) => (
              <ChatRoomItem key={room.id} room={room} onClick={handleRoomClick} />
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <BottomNav />

      {/* 사용자 검색 모달 */}
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ChatRoomItem - 채팅방 항목 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ChatRoomItemProps {
  room: ChatRoom;
  onClick: (room: ChatRoom) => void;
}

function ChatRoomItem({ room, onClick }: ChatRoomItemProps) {
  // 시간 포맷
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    // 7일 이상은 날짜 표시
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}월 ${day}일`;
  };

  // 마지막 메시지 내용 포맷
  const getLastMessagePreview = () => {
    if (!room.last_message_content) {
      if (room.last_message_type === 'file') return '📎 파일';
      return '메시지가 없습니다';
    }

    if (room.last_message_type === 'system') {
      return `🔔 ${room.last_message_content}`;
    }

    return room.last_message_content;
  };

  return (
    <button
      onClick={() => onClick(room)}
      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      {/* 프로필 이미지 */}
      <div className="relative flex-shrink-0">
        {room.other_user_profile_image ? (
          <img
            src={room.other_user_profile_image}
            alt={room.other_user_name}
            className="w-12 h-12 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
            <User className="w-6 h-6 text-gray-400" />
          </div>
        )}

        {/* 읽지 않은 메시지 배지 */}
        {room.my_unread_count > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {room.my_unread_count > 99 ? '99+' : room.my_unread_count}
          </div>
        )}
      </div>

      {/* 채팅 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">{room.other_user_name}</h3>
          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
            {formatTime(room.last_message_at)}
          </span>
        </div>
        <p
          className={`text-sm truncate ${
            room.my_unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
          }`}
        >
          {getLastMessagePreview()}
        </p>
      </div>
    </button>
  );
}
