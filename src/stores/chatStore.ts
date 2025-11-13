import { create } from 'zustand';
import type {
  ChatRoom,
  ChatMessage,
  TypingEventPayload,
  PresenceState,
  SendMessageInput,
} from '@/types/chat';
import {
  getChatRooms,
  getMessages,
  sendMessage as sendMessageApi,
  uploadChatFile,
  markRoomAsRead,
  getTotalUnreadCount,
} from '@/lib/supabase/chat';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type ChatState = {
  // ━━━ State ━━━
  rooms: ChatRoom[];
  messagesByRoom: Record<string, ChatMessage[]>;
  activeRoomId: string | null;
  typingUsers: Record<string, TypingEventPayload[]>; // roomId → typing users
  onlineUsers: Record<string, PresenceState>; // userId → presence
  totalUnreadCount: number;
  isLoadingRooms: boolean;
  isLoadingMessages: Record<string, boolean>;
  isSendingMessage: boolean;

  // ━━━ Actions ━━━
  loadChatRooms: () => Promise<void>;
  loadMessages: (roomId: string, offset?: number) => Promise<void>;
  sendMessage: (input: Omit<SendMessageInput, 'file'> & { file?: File }) => Promise<void>;
  markAsRead: (roomId: string) => Promise<void>;
  setActiveRoom: (roomId: string | null) => void;
  updateTyping: (payload: TypingEventPayload) => void;
  updatePresence: (userId: string, state: PresenceState | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateUnreadCount: () => Promise<void>;
  reset: () => void;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Store
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useChatStore = create<ChatState>((set, get) => ({
  // ━━━ Initial State ━━━
  rooms: [],
  messagesByRoom: {},
  activeRoomId: null,
  typingUsers: {},
  onlineUsers: {},
  totalUnreadCount: 0,
  isLoadingRooms: false,
  isLoadingMessages: {},
  isSendingMessage: false,

  // ━━━ Actions ━━━

  /**
   * 사용자의 채팅방 목록 불러오기
   */
  loadChatRooms: async () => {
    set({ isLoadingRooms: true });

    try {
      const { data, error } = await getChatRooms();

      if (error) {
        console.error('[chatStore] 채팅방 목록 로드 실패:', error.message);
        return;
      }

      set({ rooms: data || [] });
    } finally {
      set({ isLoadingRooms: false });
    }
  },

  /**
   * 특정 채팅방의 메시지 불러오기
   * @param roomId 채팅방 ID
   * @param offset 페이지네이션 오프셋 (기본값: 0)
   */
  loadMessages: async (roomId: string, offset = 0) => {
    // 로딩 상태 업데이트
    set((state) => ({
      isLoadingMessages: { ...state.isLoadingMessages, [roomId]: true },
    }));

    try {
      const { data, error } = await getMessages({ room_id: roomId, limit: 50, offset });

      if (error) {
        console.error('[chatStore] 메시지 로드 실패:', error.message);
        return;
      }

      const messages = data || [];

      set((state) => {
        const existing = state.messagesByRoom[roomId] || [];
        const merged = offset === 0 ? messages : [...existing, ...messages];

        return {
          messagesByRoom: {
            ...state.messagesByRoom,
            [roomId]: merged,
          },
        };
      });
    } finally {
      set((state) => ({
        isLoadingMessages: { ...state.isLoadingMessages, [roomId]: false },
      }));
    }
  },

  /**
   * 메시지 전송 (텍스트 또는 파일)
   */
  sendMessage: async (input) => {
    set({ isSendingMessage: true });

    try {
      let fileUploadResult = null;

      // 파일이 있으면 먼저 업로드
      if (input.file) {
        const { data, error } = await uploadChatFile(input.room_id, input.file);

        if (error) {
          console.error('[chatStore] 파일 업로드 실패:', error.message);
          return;
        }

        fileUploadResult = data;
      }

      // 메시지 전송
      const { data, error } = await sendMessageApi({
        room_id: input.room_id,
        content: input.content,
        message_type: input.message_type || (fileUploadResult ? 'file' : 'text'),
        file: fileUploadResult
          ? {
              url: fileUploadResult.url,
              name: fileUploadResult.file_name,
              size: fileUploadResult.file_size,
              type: fileUploadResult.file_type,
            }
          : undefined,
      });

      if (error) {
        console.error('[chatStore] 메시지 전송 실패:', error.message);
        return;
      }

      // 전송 성공 시 로컬 상태 업데이트 (Realtime으로 업데이트되지만 즉시 반영)
      if (data) {
        get().addMessage(data);
      }
    } finally {
      set({ isSendingMessage: false });
    }
  },

  /**
   * 채팅방 읽음 처리
   */
  markAsRead: async (roomId: string) => {
    const { error } = await markRoomAsRead(roomId);

    if (error) {
      console.error('[chatStore] 읽음 처리 실패:', error.message);
      return;
    }

    // 로컬 상태 업데이트
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, my_unread_count: 0 } : room
      ),
    }));

    // 총 읽지 않은 메시지 수 업데이트
    await get().updateUnreadCount();
  },

  /**
   * 활성 채팅방 설정
   */
  setActiveRoom: (roomId: string | null) => {
    set({ activeRoomId: roomId });

    // 채팅방 진입 시 읽음 처리
    if (roomId) {
      get().markAsRead(roomId);
    }
  },

  /**
   * 타이핑 상태 업데이트 (Realtime Broadcast)
   */
  updateTyping: (payload: TypingEventPayload) => {
    const { room_id, user_id, user_name, is_typing } = payload;

    set((state) => {
      const roomTyping = state.typingUsers[room_id] || [];

      if (is_typing) {
        // 타이핑 중인 사용자 추가
        const exists = roomTyping.some((t) => t.user_id === user_id);
        if (exists) return state;

        return {
          typingUsers: {
            ...state.typingUsers,
            [room_id]: [...roomTyping, payload],
          },
        };
      } else {
        // 타이핑 중지한 사용자 제거
        return {
          typingUsers: {
            ...state.typingUsers,
            [room_id]: roomTyping.filter((t) => t.user_id !== user_id),
          },
        };
      }
    });
  },

  /**
   * 사용자 온라인 상태 업데이트 (Realtime Presence)
   */
  updatePresence: (userId: string, state: PresenceState | null) => {
    set((prev) => {
      const updated = { ...prev.onlineUsers };

      if (state === null) {
        delete updated[userId];
      } else {
        updated[userId] = state;
      }

      return { onlineUsers: updated };
    });
  },

  /**
   * 메시지 추가 (Realtime으로 수신한 메시지)
   */
  addMessage: (message: ChatMessage) => {
    set((state) => {
      const roomMessages = state.messagesByRoom[message.room_id] || [];
      const exists = roomMessages.some((m) => m.id === message.id);

      if (exists) return state;

      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [message.room_id]: [...roomMessages, message],
        },
      };
    });

    // 채팅방 목록의 last_message 업데이트
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === message.room_id
          ? {
              ...room,
              last_message_content: message.content,
              last_message_type: message.message_type,
              last_message_at: message.created_at,
            }
          : room
      ),
    }));
  },

  /**
   * 총 읽지 않은 메시지 수 업데이트
   */
  updateUnreadCount: async () => {
    const { data, error } = await getTotalUnreadCount();

    if (error) {
      console.error('[chatStore] 읽지 않은 메시지 수 조회 실패:', error.message);
      return;
    }

    set({ totalUnreadCount: data || 0 });
  },

  /**
   * Store 초기화 (로그아웃 시)
   */
  reset: () => {
    set({
      rooms: [],
      messagesByRoom: {},
      activeRoomId: null,
      typingUsers: {},
      onlineUsers: {},
      totalUnreadCount: 0,
      isLoadingRooms: false,
      isLoadingMessages: {},
      isSendingMessage: false,
    });
  },
}));
