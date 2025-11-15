import { useEffect, useState, useRef } from 'react';
import { X, MessageCircle, User, UserPlus, ChevronLeft, Send, Paperclip, Download } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import UserSearchModal from './UserSearchModal';
import type { ChatRoom, ChatMessage } from '@/types/chat';
import { MAX_FILE_SIZE } from '@/types/chat';

interface DesktopChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoomId?: string | null;
}

export default function DesktopChatModal({ isOpen, onClose, selectedRoomId }: DesktopChatModalProps) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user, initialize } = useAuthStore((state) => ({
    user: state.user,
    initialize: state.initialize,
  }));

  const {
    rooms,
    isLoadingRooms,
    loadChatRooms,
    messagesByRoom,
    isLoadingMessages,
    isSendingMessage,
    loadMessages,
    sendMessage,
    setActiveRoom,
  } = useChatStore((state) => ({
    rooms: state.rooms,
    isLoadingRooms: state.isLoadingRooms,
    loadChatRooms: state.loadChatRooms,
    messagesByRoom: state.messagesByRoom,
    isLoadingMessages: state.isLoadingMessages,
    isSendingMessage: state.isSendingMessage,
    loadMessages: state.loadMessages,
    sendMessage: state.sendMessage,
    setActiveRoom: state.setActiveRoom,
  }));

  // 인증 초기화
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // 외부에서 전달된 selectedRoomId로 자동 선택
  useEffect(() => {
    if (selectedRoomId && isOpen) {
      setSelectedRoom(selectedRoomId);
    }
  }, [selectedRoomId, isOpen]);

  // Realtime 구독
  useChatRealtime({
    roomId: selectedRoom || undefined,
    enableTyping: false,
    enablePresence: true,
  });

  // 채팅방 목록 로드
  useEffect(() => {
    if (isOpen && user) {
      loadChatRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  // 선택된 채팅방의 메시지 로드
  useEffect(() => {
    if (selectedRoom && user) {
      setActiveRoom(selectedRoom);
      loadMessages(selectedRoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, user]);

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByRoom[selectedRoom || '']]);

  // 브라우저 탭 visibility 변경 감지 (Alt+Tab 대응)
  // ✅ REALTIME이 모든 동기화를 자동으로 처리하므로 수동 재로드 불필요
  // useEffect(() => {
  //   if (!isOpen) return;

  //   const handleVisibilityChange = () => {
  //     if (!document.hidden && selectedRoom) {
  //       console.log('[DesktopChatModal] 탭 활성화 → 채팅방 목록 재로드');
  //       // ✅ 메시지 재로드 제거 (Realtime이 이미 동기화함)
  //       // loadMessages(selectedRoom, 0);  // ❌ 제거! (알트탭 후 메시지 삭제 원인)
  //       // loadChatRooms(); // ❌ 이것도 제거! (Realtime이 자동 동기화)
  //     }
  //   };

  //   document.addEventListener('visibilitychange', handleVisibilityChange);

  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [isOpen, selectedRoom]);

  // 현재 채팅방 정보
  const currentRoom = rooms.find((r) => r.id === selectedRoom);
  const messages = selectedRoom ? messagesByRoom[selectedRoom] || [] : [];

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert('파일 크기는 20MB를 초과할 수 없습니다');
      return;
    }
    setSelectedFile(file);
  };

  // 메시지 전송
  const handleSend = async () => {
    if (!selectedRoom) return;
    const content = messageInput.trim();
    if (!content && !selectedFile) return;

    try {
      await sendMessage({
        room_id: selectedRoom,
        content: content || undefined,
        file: selectedFile || undefined,
      });
      setMessageInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다');
    }
  };

  // Enter 키 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  // 로그인 필요
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl h-[600px] mx-4 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">채팅</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 로그인 필요 메시지 */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center mb-2">로그인이 필요한 서비스입니다</p>
            <p className="text-sm text-gray-400 text-center">
              채팅 기능을 사용하려면 로그인해주세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 채팅방 선택된 경우
  if (selectedRoom) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-2xl h-[600px] mx-4 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* 채팅방 헤더 */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200">
            <button
              onClick={() => setSelectedRoom(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="채팅 목록으로"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="flex-1 text-lg font-bold text-gray-900">채팅</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 채팅방 내용 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
              {isLoadingMessages[selectedRoom] ? (
                <div className="text-center py-16">
                  <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#68B2FF] rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 text-sm">불러오는 중...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <p className="text-gray-400 text-sm">메시지가 없습니다</p>
                  <p className="text-gray-400 text-xs mt-2">첫 메시지를 보내보세요!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} isOwnMessage={message.sender_id === user?.id} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 메시지 입력창 */}
            <div className="border-t border-gray-200 p-4 bg-white">
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-700 bg-gray-100 rounded px-3 py-2">
                  <Paperclip className="w-4 h-4" />
                  <span className="flex-1 truncate">{selectedFile.name}</span>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="파일 첨부"
                >
                  <Paperclip className="w-5 h-5 text-gray-600" />
                </button>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#68B2FF]"
                />

                <button
                  onClick={handleSend}
                  disabled={isSendingMessage || (!messageInput.trim() && !selectedFile)}
                  className="p-2 bg-[#68B2FF] text-white rounded-full hover:bg-[#58A8FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 채팅 목록
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl h-[600px] mx-4 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">채팅</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="사용자 검색"
              title="사용자 검색"
            >
              <UserPlus className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 채팅방 목록 */}
        <div className="flex-1 overflow-y-auto bg-white">
          {isLoadingRooms ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-[#68B2FF] rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 text-sm">불러오는 중...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-center mb-2">아직 채팅방이 없습니다</p>
              <p className="text-sm text-gray-400 text-center">
                인력 또는 체험 카드에서 채팅을 시작해보세요
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
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
                      {getLastMessagePreview(room)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 사용자 검색 모달 */}
      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  );
}

// 시간 포맷 헬퍼
function formatTime(dateString: string | null): string {
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

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

// 마지막 메시지 미리보기 헬퍼
function getLastMessagePreview(room: ChatRoom): string {
  if (!room.last_message_content) {
    if (room.last_message_type === 'file') return '📎 파일';
    return '메시지가 없습니다';
  }

  if (room.last_message_type === 'system') {
    return `🔔 ${room.last_message_content}`;
  }

  return room.last_message_content;
}

// 메시지 버블 컴포넌트
interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  // 시간 포맷
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? '오후' : '오전';
    const hour12 = hours % 12 || 12;
    return `${period} ${hour12}:${minutes.toString().padStart(2, '0')}`;
  };

  // 파일 메시지
  if (message.message_type === 'file' && message.file_metadata) {
    const { url, name, size_formatted } = message.file_metadata;

    return (
      <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
          {!isOwnMessage && (
            <span className="text-xs text-gray-500 mb-1 px-2">{message.sender_name}</span>
          )}
          <div
            className={`rounded-2xl px-4 py-3 ${
              isOwnMessage ? 'bg-[#68B2FF] text-white' : 'bg-white border border-gray-200 text-gray-900'
            }`}
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Paperclip className="w-4 h-4" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{name}</div>
                <div className={`text-xs ${isOwnMessage ? 'text-white/80' : 'text-gray-500'}`}>
                  {size_formatted}
                </div>
              </div>
              <Download className="w-4 h-4" />
            </a>
            {message.content && <p className="mt-2 text-sm whitespace-pre-wrap break-words">{message.content}</p>}
          </div>
          <span className="text-xs text-gray-400 mt-1 px-2">{formatMessageTime(message.created_at)}</span>
        </div>
      </div>
    );
  }

  // 시스템 메시지
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 bg-gray-100 rounded-full">
          <p className="text-xs text-gray-600">{message.content}</p>
        </div>
      </div>
    );
  }

  // 텍스트 메시지
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwnMessage && (
          <span className="text-xs text-gray-500 mb-1 px-2">{message.sender_name}</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isOwnMessage ? 'bg-[#68B2FF] text-white' : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <span className="text-xs text-gray-400 mt-1 px-2">{formatMessageTime(message.created_at)}</span>
      </div>
    </div>
  );
}
