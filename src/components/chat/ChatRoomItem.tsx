// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅방 목록 아이템
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState } from 'react';
import type { ChatRoom } from '@/types/chat';

interface Props {
  room: ChatRoom;
  isOnline?: boolean;
  onClick: (room: ChatRoom) => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ChatRoomItem({ room, isOnline, onClick }: Props) {
  const hasUnread = room.unread_count > 0;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => onClick(room)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
    >
      {/* 프로필 이미지 */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          {room.other_user_profile_image && !imgError ? (
            <img
              src={room.other_user_profile_image}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
              {room.other_user_name?.charAt(0) || '?'}
            </div>
          )}
        </div>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${hasUnread ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'}`}>
            {room.other_user_name}
          </span>
          <span className="text-[10px] text-gray-400 shrink-0 ml-2">
            {formatRelativeTime(room.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
            {room.last_message_preview || '새 채팅방'}
          </p>
          {hasUnread && (
            <span className="ml-2 shrink-0 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {room.unread_count > 99 ? '99+' : room.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
