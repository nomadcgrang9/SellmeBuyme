// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅방 목록
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import ChatRoomItem from './ChatRoomItem';
import type { ChatRoom } from '@/types/chat';

interface Props {
  onRoomClick: (room: ChatRoom) => void;
}

export default function ChatRoomList({ onRoomClick }: Props) {
  const { rooms, isLoadingRooms, onlineUsers, loadRooms } = useChatStore();

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  if (isLoadingRooms && rooms.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
        <MessageCircle size={32} className="text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-1">아직 채팅이 없습니다</p>
        <p className="text-xs text-gray-400">
          마커나 카드에서 채팅을 시작해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {rooms.map((room) => (
        <ChatRoomItem
          key={room.id}
          room={room}
          isOnline={onlineUsers.has(room.other_user_id)}
          onClick={onRoomClick}
        />
      ))}
    </div>
  );
}
