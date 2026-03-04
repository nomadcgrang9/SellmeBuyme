// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅방 상세 (메시지 목록 + 입력)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import ChatMessageBubble from './ChatMessageBubble';
import ChatInput from './ChatInput';

interface Props {
  onBack: () => void;
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function ChatRoomView({ onBack }: Props) {
  const { user } = useAuthStore();
  const {
    activeRoomId,
    activeRoom,
    messages,
    isLoadingMessages,
    hasMoreMessages,
    typingUsers,
    onlineUsers,
    sendMessage,
    loadMoreMessages,
    markAsRead,
  } = useChatStore();

  const { sendTyping } = useChatRealtime(activeRoomId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string } | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // 메시지 변경 시 자동 스크롤
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // 채팅방 진입 시 읽음 처리
  useEffect(() => {
    if (activeRoomId) {
      markAsRead(activeRoomId);
    }
  }, [activeRoomId, messages.length, markAsRead]);

  // 스크롤 위치 감지
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // 맨 위 도달 시 이전 메시지 로드
    if (el.scrollTop < 50 && hasMoreMessages && !isLoadingMessages) {
      loadMoreMessages();
    }

    // 하단 근처인지 판단
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShouldAutoScroll(nearBottom);
  }, [hasMoreMessages, isLoadingMessages, loadMoreMessages]);

  const handleSend = useCallback(
    (content?: string, file?: File, replyToId?: string) => {
      sendMessage(content, file, replyToId);
      setReplyTo(null);
      setShouldAutoScroll(true);
    },
    [sendMessage]
  );

  const handleReply = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;
      const preview =
        msg.message_type === 'file'
          ? `[파일] ${msg.file_name || '첨부파일'}`
          : msg.content?.substring(0, 50) || '';
      setReplyTo({ id: messageId, preview });
    },
    [messages]
  );

  const isOtherOnline = activeRoom ? onlineUsers.has(activeRoom.other_user_id) : false;
  const typingList = Array.from(typingUsers.values());

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <button
          onClick={onBack}
          className="p-1 -ml-1 text-gray-400 hover:text-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">
            {activeRoom?.other_user_name || '채팅'}
          </span>
        </div>
        {isOtherOnline && (
          <span className="text-[10px] text-green-500">온라인</span>
        )}
      </div>

      {/* 메시지 목록 */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3"
      >
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          </div>
        )}

        {messages.map((msg, i) => {
          const showDate =
            i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 border-b border-gray-100" />
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatDateSeparator(msg.created_at)}
                  </span>
                  <div className="flex-1 border-b border-gray-100" />
                </div>
              )}
              <ChatMessageBubble
                message={msg}
                isMine={msg.sender_id === user?.id}
                onReply={handleReply}
              />
            </div>
          );
        })}

        {/* 타이핑 표시 */}
        {typingList.length > 0 && (
          <div className="text-xs text-gray-400 py-1">
            {typingList.join(', ')}님이 입력 중...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 바 */}
      <ChatInput
        onSend={handleSend}
        onTyping={(isTyping) => sendTyping(isTyping)}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
}
