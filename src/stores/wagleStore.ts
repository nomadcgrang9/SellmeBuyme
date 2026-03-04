// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 커뮤니티 쓰레드 Zustand Store
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { create } from 'zustand';
import type { WagleThread, WagleReply, WagleNotification, ReactionType } from '@/types/wagle';
import {
  getThreads,
  getThread,
  getReplies,
  createThread as createThreadApi,
  createReply as createReplyApi,
  toggleReaction as toggleReactionApi,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead as markNotificationReadApi,
  markAllNotificationsRead as markAllNotificationsReadApi,
} from '@/lib/supabase/wagle';

// ━━━ 호버 서랍 타이머 (모듈 레벨) ━━━
let drawerCloseTimeout: ReturnType<typeof setTimeout> | null = null;

// ━━━ 타입 정의 ━━━

type WagleState = {
  // 피드
  threads: WagleThread[];
  isLoadingThreads: boolean;
  hasMoreThreads: boolean;
  activeHashtag: string | null;

  // 쓰레드 상세
  activeThread: WagleThread | null;
  replies: WagleReply[];
  isLoadingReplies: boolean;

  // 글쓰기
  isComposerOpen: boolean;

  // 데스크탑 패널
  isDesktopPanelOpen: boolean;

  // 알림
  notifications: WagleNotification[];
  unreadCount: number;

  // 액션
  loadThreads: (reset?: boolean) => Promise<void>;
  loadMoreThreads: () => Promise<void>;
  loadThread: (threadId: string) => Promise<void>;
  loadReplies: (threadId: string) => Promise<void>;
  createThread: (content: string, hashtags: string[]) => Promise<void>;
  createReply: (threadId: string, parentId: string | null, content: string, depth: number, mentionUserId?: string) => Promise<void>;
  toggleReaction: (targetType: 'thread' | 'reply', targetId: string, reactionType: ReactionType) => Promise<void>;
  filterByHashtag: (hashtag: string | null) => void;
  setComposerOpen: (open: boolean) => void;
  setDesktopPanelOpen: (open: boolean) => void;
  setActiveThread: (thread: WagleThread | null) => void;
  openDrawer: () => void;
  scheduleDrawerClose: () => void;
  cancelDrawerClose: () => void;
  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addRealtimeThread: (thread: WagleThread) => void;
  addRealtimeReply: (reply: WagleReply) => void;
  reset: () => void;
};

// ━━━ Store ━━━

export const useWagleStore = create<WagleState>((set, get) => ({
  // 초기 상태
  threads: [],
  isLoadingThreads: false,
  hasMoreThreads: true,
  activeHashtag: null,
  activeThread: null,
  replies: [],
  isLoadingReplies: false,
  isComposerOpen: false,
  isDesktopPanelOpen: false,
  notifications: [],
  unreadCount: 0,

  // ━━━ 피드 액션 ━━━

  loadThreads: async (reset = false) => {
    const state = get();
    if (state.isLoadingThreads) return;

    set({ isLoadingThreads: true });

    try {
      const { data, error } = await getThreads({
        hashtag: state.activeHashtag,
      });

      if (error) {
        console.error('[wagleStore] 피드 로드 실패:', error.message);
        return;
      }

      set({
        threads: data,
        hasMoreThreads: data.length >= 15,
      });
    } finally {
      set({ isLoadingThreads: false });
    }
  },

  loadMoreThreads: async () => {
    const state = get();
    if (state.isLoadingThreads || !state.hasMoreThreads) return;

    const lastThread = state.threads[state.threads.length - 1];
    if (!lastThread) return;

    set({ isLoadingThreads: true });

    try {
      const { data, error } = await getThreads({
        cursor: lastThread.created_at,
        hashtag: state.activeHashtag,
      });

      if (error) {
        console.error('[wagleStore] 추가 로드 실패:', error.message);
        return;
      }

      set({
        threads: [...state.threads, ...data],
        hasMoreThreads: data.length >= 15,
      });
    } finally {
      set({ isLoadingThreads: false });
    }
  },

  // ━━━ 쓰레드 상세 액션 ━━━

  loadThread: async (threadId: string) => {
    const { data, error } = await getThread(threadId);

    if (error) {
      console.error('[wagleStore] 쓰레드 로드 실패:', error.message);
      return;
    }

    set({ activeThread: data });
  },

  loadReplies: async (threadId: string) => {
    set({ isLoadingReplies: true });

    try {
      const { data, error } = await getReplies(threadId);

      if (error) {
        console.error('[wagleStore] 답글 로드 실패:', error.message);
        return;
      }

      set({ replies: data });
    } finally {
      set({ isLoadingReplies: false });
    }
  },

  // ━━━ 글쓰기 액션 ━━━

  createThread: async (content: string, hashtags: string[]) => {
    const { data, error } = await createThreadApi({ content, hashtags });

    if (error) {
      console.error('[wagleStore] 글 작성 실패:', error.message);
      return;
    }

    if (data) {
      set((state) => ({
        threads: [data, ...state.threads],
        isComposerOpen: false,
      }));
    }
  },

  createReply: async (threadId, parentId, content, depth, mentionUserId) => {
    const { data, error } = await createReplyApi({
      threadId,
      parentId,
      content,
      depth,
      mentionUserId,
    });

    if (error) {
      console.error('[wagleStore] 답글 작성 실패:', error.message);
      return;
    }

    if (data) {
      // 답글 목록 새로고침
      await get().loadReplies(threadId);
      // 쓰레드 reply_count 업데이트
      set((state) => ({
        activeThread: state.activeThread
          ? { ...state.activeThread, reply_count: state.activeThread.reply_count + 1 }
          : null,
        threads: state.threads.map((t) =>
          t.id === threadId ? { ...t, reply_count: t.reply_count + 1 } : t
        ),
      }));
    }
  },

  // ━━━ 리액션 액션 ━━━

  toggleReaction: async (targetType, targetId, reactionType) => {
    const { action, error } = await toggleReactionApi({
      targetType,
      targetId,
      reactionType,
    });

    if (error) {
      console.error('[wagleStore] 리액션 실패:', error.message);
      return;
    }

    // 로컬 상태 업데이트
    const updateReactionCounts = (counts: any, type: ReactionType, act: string, prevReaction: ReactionType | null) => {
      const updated = { ...counts };
      if (act === 'added') {
        updated[type] = (updated[type] || 0) + 1;
      } else if (act === 'removed') {
        updated[type] = Math.max((updated[type] || 0) - 1, 0);
      } else if (act === 'changed' && prevReaction) {
        updated[prevReaction] = Math.max((updated[prevReaction] || 0) - 1, 0);
        updated[type] = (updated[type] || 0) + 1;
      }
      return updated;
    };

    if (targetType === 'thread') {
      set((state) => {
        const updateThread = (t: WagleThread) => {
          if (t.id !== targetId) return t;
          return {
            ...t,
            reaction_counts: updateReactionCounts(t.reaction_counts, reactionType, action, t.my_reaction),
            my_reaction: action === 'removed' ? null : reactionType,
          };
        };
        return {
          threads: state.threads.map(updateThread),
          activeThread: state.activeThread ? updateThread(state.activeThread) : null,
        };
      });
    } else {
      // reply 리액션 → 답글 목록 새로고침
      const threadId = get().activeThread?.id;
      if (threadId) {
        await get().loadReplies(threadId);
      }
    }
  },

  // ━━━ 필터 ━━━

  filterByHashtag: (hashtag: string | null) => {
    set({ activeHashtag: hashtag, threads: [], hasMoreThreads: true });
    get().loadThreads(true);
  },

  // ━━━ UI 상태 ━━━

  setComposerOpen: (open: boolean) => set({ isComposerOpen: open }),

  setDesktopPanelOpen: (open: boolean) => set({ isDesktopPanelOpen: open }),

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

  setActiveThread: (thread: WagleThread | null) => set({ activeThread: thread, replies: [] }),

  // ━━━ 알림 액션 ━━━

  loadNotifications: async () => {
    const { data, error } = await getNotifications();
    if (error) {
      console.error('[wagleStore] 알림 로드 실패:', error.message);
      return;
    }
    set({ notifications: data });
  },

  loadUnreadCount: async () => {
    const { data, error } = await getUnreadNotificationCount();
    if (!error) {
      set({ unreadCount: data });
    }
  },

  markNotificationRead: async (notificationId: string) => {
    const { error } = await markNotificationReadApi(notificationId);
    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(state.unreadCount - 1, 0),
      }));
    }
  },

  markAllNotificationsRead: async () => {
    const { error } = await markAllNotificationsReadApi();
    if (!error) {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    }
  },

  // ━━━ Realtime 업데이트 ━━━

  addRealtimeThread: (thread: WagleThread) => {
    set((state) => {
      const exists = state.threads.some((t) => t.id === thread.id);
      if (exists) return state;
      return { threads: [thread, ...state.threads] };
    });
  },

  addRealtimeReply: (reply: WagleReply) => {
    // 현재 보고 있는 쓰레드의 답글이면 새로고침
    const threadId = get().activeThread?.id;
    if (threadId && reply.thread_id === threadId) {
      get().loadReplies(threadId);
    }
    // 피드의 reply_count 업데이트
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === reply.thread_id ? { ...t, reply_count: t.reply_count + 1 } : t
      ),
    }));
  },

  // ━━━ 리셋 ━━━

  reset: () => {
    set({
      threads: [],
      isLoadingThreads: false,
      hasMoreThreads: true,
      activeHashtag: null,
      activeThread: null,
      replies: [],
      isLoadingReplies: false,
      isComposerOpen: false,
      isDesktopPanelOpen: false,
      notifications: [],
      unreadCount: 0,
    });
  },
}));
