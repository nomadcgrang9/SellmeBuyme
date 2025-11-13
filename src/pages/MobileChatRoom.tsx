import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send, Paperclip, X, Download, User } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import BottomNav from '@/components/mobile/BottomNav';
import type { ChatMessage } from '@/types/chat';
import { MAX_FILE_SIZE } from '@/types/chat';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MobileChatRoom - 모바일 채팅 상세 페이지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function MobileChatRoom() {
  const { user, status, initialize } = useAuthStore((state) => ({
    user: state.user,
    status: state.status,
    initialize: state.initialize,
  }));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // URL에서 roomId 가져오기
  const roomId = window.location.pathname.split('/chat/')[1];

  const {
    rooms,
    messagesByRoom,
    isLoadingMessages,
    isSendingMessage,
    typingUsers,
    loadMessages,
    sendMessage,
    setActiveRoom,
  } = useChatStore((state) => ({
    rooms: state.rooms,
    messagesByRoom: state.messagesByRoom,
    isLoadingMessages: state.isLoadingMessages,
    isSendingMessage: state.isSendingMessage,
    typingUsers: state.typingUsers,
    loadMessages: state.loadMessages,
    sendMessage: state.sendMessage,
    setActiveRoom: state.setActiveRoom,
  }));

  // 인증 초기화
  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Realtime 구독 (특정 채팅방만)
  const { sendTyping } = useChatRealtime({
    roomId,
    enableTyping: true,
    enablePresence: true,
  });

  // 현재 채팅방 정보
  const currentRoom = rooms.find((r) => r.id === roomId);
  const messages = messagesByRoom[roomId] || [];
  const roomTypingUsers = typingUsers[roomId] || [];

  // 페이지 로드 시 메시지 불러오기
  useEffect(() => {
    if (user && roomId) {
      setActiveRoom(roomId);
      loadMessages(roomId);
    }

    return () => {
      setActiveRoom(null);
    };
  }, [user, roomId, setActiveRoom, loadMessages]);

  // 메시지 추가될 때마다 스크롤 하단으로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 타이핑 인디케이터 전송
  useEffect(() => {
    if (messageInput.length > 0 && !isTyping) {
      setIsTyping(true);
      sendTyping(true);
    } else if (messageInput.length === 0 && isTyping) {
      setIsTyping(false);
      sendTyping(false);
    }
  }, [messageInput, isTyping, sendTyping]);

  // 뒤로가기
  const handleBack = () => {
    window.history.back();
  };

  // 파일 선택
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (20MB)
    if (file.size > MAX_FILE_SIZE) {
      alert('파일 크기는 20MB를 초과할 수 없습니다');
      return;
    }

    setSelectedFile(file);
  };

  // 파일 선택 취소
  const handleCancelFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 메시지 전송
  const handleSend = async () => {
    if (!roomId) return;

    // 텍스트도 없고 파일도 없으면 전송 안함
    const content = messageInput.trim();
    if (!content && !selectedFile) return;

    try {
      await sendMessage({
        room_id: roomId,
        content: content || undefined,
        file: selectedFile || undefined,
      });

      // 전송 성공 시 입력 초기화
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

  // 로그인 필요
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-500 mb-2">로그인이 필요한 서비스입니다</p>
          <button
            onClick={() => (window.location.href = '/')}
            className="text-[#68B2FF] hover:underline"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 채팅방 없음
  if (!currentRoom && !isLoadingMessages[roomId]) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-gray-500 mb-2">채팅방을 찾을 수 없습니다</p>
          <button
            onClick={() => (window.location.href = '/chat')}
            className="text-[#68B2FF] hover:underline"
          >
            채팅 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 (고정) */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-2 flex-1 ml-2">
            {currentRoom?.other_user_profile_image ? (
              <img
                src={currentRoom.other_user_profile_image}
                alt={currentRoom.other_user_name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                <User className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <h1 className="text-lg font-bold text-gray-900">
              {currentRoom?.other_user_name || '로딩 중...'}
            </h1>
          </div>
        </div>
      </div>

      {/* 메시지 목록 (스크롤 영역) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoadingMessages[roomId] ? (
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
            <MessageBubble key={message.id} message={message} isOwnMessage={message.sender_id === user.id} />
          ))
        )}

        {/* 타이핑 인디케이터 */}
        {roomTypingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 px-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span>{roomTypingUsers[0].user_name}님이 입력 중...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 (고정) */}
      <div className="border-t border-gray-200 bg-white p-3 pb-20">
        {/* 파일 선택 미리보기 */}
        {selectedFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-gray-50 rounded-lg">
            <Paperclip className="w-4 h-4 text-gray-500" />
            <span className="flex-1 text-sm text-gray-700 truncate">{selectedFile.name}</span>
            <span className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</span>
            <button onClick={handleCancelFile} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* 파일 첨부 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            aria-label="파일 첨부"
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />

          {/* 텍스트 입력 */}
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full resize-none outline-none focus:border-[#68B2FF] transition-colors max-h-24"
            rows={1}
            style={{
              minHeight: '42px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
            }}
          />

          {/* 전송 버튼 */}
          <button
            onClick={handleSend}
            disabled={isSendingMessage || (!messageInput.trim() && !selectedFile)}
            className="p-2.5 bg-[#68B2FF] hover:bg-[#7aa3cc] disabled:bg-gray-300 rounded-full transition-colors flex-shrink-0"
            aria-label="전송"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* 하단 네비게이션 (고정) */}
      <BottomNav />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MessageBubble - 메시지 말풍선 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  // 시간 포맷
  const formatTime = (dateString: string) => {
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
          <span className="text-xs text-gray-400 mt-1 px-2">{formatTime(message.created_at)}</span>
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
        <span className="text-xs text-gray-400 mt-1 px-2">{formatTime(message.created_at)}</span>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utility Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
