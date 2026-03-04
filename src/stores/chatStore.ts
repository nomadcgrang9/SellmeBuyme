// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1:1 채팅 Zustand Store
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { create } from 'zustand';
import type { ChatRoom, ChatMessage, CreateChatRoomInput, ContextType } from '@/types/chat';
import {
  getChatRooms,
  createOrGetChatRoom,
  getMessages,
  getMessagesSince,
  sendMessage as sendMessageApi,
  markRoomAsRead as markRoomAsReadApi,
  getTotalUnreadCount,
} from '@/lib/supabase/chat';

// ━━━ 호버 서랍 타이머 (모듈 레벨) ━━━
let drawerCloseTimeout: ReturnType<typeof setTimeout> | null = null;

// ━━━ 타입 ━━━

type ChatView = 'list' | 'room';

type ChatState = {
  // 채팅방 목록
  rooms: ChatRoom[];
  isLoadingRooms: boolean;

  // 현재 활성 채팅방
  activeRoomId: string | null;
  activeRoom: ChatRoom | null;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;

  // 뷰 상태
  view: ChatView;

  // 패널
  isDesktopPanelOpen: boolean;

  // 실시간
  typingUsers: Map<string, string>; // userId -> userName
  onlineUsers: Set<string>;

  // 알림
  totalUnreadCount: number;

  // 액션 - 채팅방
  loadRooms: () => Promise<void>;
  openChat: (targetUserId: string, contextType?: ContextType, contextCardId?: string) => Promise<string | null>;
  setActiveRoom: (roomId: string, room?: ChatRoom) => Promise<void>;
  backToList: () => void;

  // 액션 - 메시지
  loadMessages: (roomId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content?: string, file?: File, replyToId?: string) => Promise<void>;
  addRealtimeMessage: (message: ChatMessage) => void;
  fetchDeltaMessages: () => Promise<void>;

  // 액션 - 읽음
  markAsRead: (roomId: string) => Promise<void>;
  loadUnreadCount: () => Promise<void>;

  // 액션 - 패널
  openPanel: () => void;
  closePanel: () => void;
  openDrawer: () => void;
  scheduleDrawerClose: () => void;
  cancelDrawerClose: () => void;

  // 액션 - 실시간
  setTypingUser: (userId: string, userName: string, isTyping: boolean) => void;
  setOnlineUsers: (userIds: string[]) => void;

  // 리셋
  reset: () => void;
};

// ━━━ Store ━━━

export const useChatStore = create<ChatState>((set, get) => ({
  // 초기 상태
  rooms: [],
  isLoadingRooms: false,
  activeRoomId: null,
  activeRoom: null,
  messages: [],
  isLoadingMessages: false,
  hasMoreMessages: true,
  view: 'list',
  isDesktopPanelOpen: false,
  typingUsers: new Map(),
  onlineUsers: new Set(),
  totalUnreadCount: 0,

  // ━━━ 채팅방 목록 ━━━

  loadRooms: async () => {
    const state = get();
    if (state.isLoadingRooms) return;
    set({ isLoadingRooms: true });

    try {
      const { data, error } = await getChatRooms();
      if (error) {
        console.error('[chatStore] 채팅방 목록 로드 실패:', error.message);
        return;
      }
      set({ rooms: data });
    } finally {
      set({ isLoadingRooms: false });
    }
  },

  openChat: async (targetUserId, contextType, contextCardId) => {
    const input: CreateChatRoomInput = {
      targetUserId,
      contextType,
      contextCardId,
    };

    const { data, error } = await createOrGetChatRoom(input);
    if (error || !data) {
      console.error('[chatStore] 채팅방 생성/조회 실패:', error?.message);
      return null;
    }

    // 패널 열기 + 채팅방 진입
    set({ isDesktopPanelOpen: true });
    await get().setActiveRoom(data.id, data);
    return data.id;
  },

  setActiveRoom: async (roomId, room) => {
    set({
      activeRoomId: roomId,
      activeRoom: room || null,
      messages: [],
      hasMoreMessages: true,
      view: 'room',
      typingUsers: new Map(),
    });

    await get().loadMessages(roomId);
    await get().markAsRead(roomId);
  },

  backToList: () => {
    set({
      activeRoomId: null,
      activeRoom: null,
      messages: [],
      view: 'list',
      typingUsers: new Map(),
    });
    // 목록 새로고침
    get().loadRooms();
  },

  // ━━━ 메시지 ━━━

  loadMessages: async (roomId) => {
    set({ isLoadingMessages: true });

    try {
      const { data, error } = await getMessages({ roomId });
      if (error) {
        console.error('[chatStore] 메시지 로드 실패:', error.message);
        return;
      }
      set({
        messages: data,
        hasMoreMessages: data.length >= 50,
      });
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  loadMoreMessages: async () => {
    const state = get();
    if (!state.activeRoomId || state.isLoadingMessages || !state.hasMoreMessages) return;
    if (state.messages.length === 0) return;

    set({ isLoadingMessages: true });

    try {
      const oldestMessage = state.messages[0];
      const { data, error } = await getMessages({
        roomId: state.activeRoomId,
        before: oldestMessage.created_at,
      });

      if (error) {
        console.error('[chatStore] 이전 메시지 로드 실패:', error.message);
        return;
      }

      set({
        messages: [...data, ...state.messages],
        hasMoreMessages: data.length >= 50,
      });
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content, file, replyToId) => {
    const state = get();
    if (!state.activeRoomId) return;

    const { data, error } = await sendMessageApi({
      roomId: state.activeRoomId,
      content,
      file,
      replyToId,
    });

    if (error) {
      console.error('[chatStore] 메시지 전송 실패:', error.message);
      return;
    }

    if (data) {
      // 로컬에 즉시 추가 (중복 체크)
      set((prev) => {
        const exists = prev.messages.some((m) => m.id === data.id);
        if (exists) return prev;
        return { messages: [...prev.messages, data] };
      });
    }
  },

  addRealtimeMessage: (message) => {
    set((state) => {
      // 중복 체크
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;

      const newMessages = [...state.messages, message];

      // 방 목록의 미리보기 갱신
      const updatedRooms = state.rooms.map((r) => {
        if (r.id !== message.room_id) return r;
        return {
          ...r,
          last_message_at: message.created_at,
          last_message_preview:
            message.message_type === 'file'
              ? `[파일] ${message.file_name || '첨부파일'}`
              : message.content?.substring(0, 100) || '',
          last_message_type: message.message_type,
        };
      });

      return { messages: newMessages, rooms: updatedRooms };
    });
  },

  fetchDeltaMessages: async () => {
    const state = get();
    if (!state.activeRoomId || state.messages.length === 0) return;

    const lastMessage = state.messages[state.messages.length - 1];
    const { data, error } = await getMessagesSince(state.activeRoomId, lastMessage.created_at);
    if (error || !data) return;

    for (const msg of data) {
      get().addRealtimeMessage(msg);
    }
  },

  // ━━━ 읽음 처리 ━━━

  markAsRead: async (roomId) => {
    const { error } = await markRoomAsReadApi(roomId);
    if (error) return;

    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r
      ),
    }));

    // 총 unread 갱신
    get().loadUnreadCount();
  },

  loadUnreadCount: async () => {
    const { data, error } = await getTotalUnreadCount();
    if (!error) {
      set({ totalUnreadCount: data });
    }
  },

  // ━━━ 패널 ━━━

  openPanel: () => set({ isDesktopPanelOpen: true }),
  closePanel: () => set({ isDesktopPanelOpen: false }),

  openDrawer: () => {
    if (drawerCloseTimeout) {
      clearTimeout(drawerCloseTimeout);
      drawerCloseTimeout = null;
    }
    set({ isDesktopPanelOpen: true });
  },

  scheduleDrawerClose: () => {
    if (drawerCloseTimeout) clearTimeout(drawerCloseTimeout);
    drawerCloseTimeout = setTimeout(() => {
      set({ isDesktopPanelOpen: false });
      drawerCloseTimeout = null;
    }, 500);
  },

  cancelDrawerClose: () => {
    if (drawerCloseTimeout) {
      clearTimeout(drawerCloseTimeout);
      drawerCloseTimeout = null;
    }
  },

  // ━━━ 실시간 ━━━

  setTypingUser: (userId, userName, isTyping) => {
    set((state) => {
      const next = new Map(state.typingUsers);
      if (isTyping) {
        next.set(userId, userName);
      } else {
        next.delete(userId);
      }
      return { typingUsers: next };
    });
  },

  setOnlineUsers: (userIds) => {
    set({ onlineUsers: new Set(userIds) });
  },

  // ━━━ 리셋 ━━━

  reset: () => {
    set({
      rooms: [],
      isLoadingRooms: false,
      activeRoomId: null,
      activeRoom: null,
      messages: [],
      isLoadingMessages: false,
      hasMoreMessages: true,
      view: 'list',
      isDesktopPanelOpen: false,
      typingUsers: new Map(),
      onlineUsers: new Set(),
      totalUnreadCount: 0,
    });
  },
}));
