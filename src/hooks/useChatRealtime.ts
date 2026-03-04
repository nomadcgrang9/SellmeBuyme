// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1:1 채팅 Supabase Realtime 구독 훅
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import type { ChatMessage, TypingPayload } from '@/types/chat';

/**
 * 채팅방별 Realtime 구독
 * - PostgreSQL CDC: 새 메시지 감지
 * - Broadcast: 타이핑 표시
 * - Presence: 온라인 상태
 */
export function useChatRealtime(roomId: string | null) {
  const { user } = useAuthStore();
  const { addRealtimeMessage, setTypingUser, setOnlineUsers, fetchDeltaMessages } = useChatStore();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 탭 전환 시 delta fetch
  useEffect(() => {
    if (!roomId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDeltaMessages();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomId, fetchDeltaMessages]);

  // Realtime 구독
  useEffect(() => {
    if (!roomId || !user) return;

    const channelName = `chat:room:${roomId}`;
    const channel = supabase
      .channel(channelName)
      // 새 메시지 CDC
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const row = payload.new as ChatMessage;
          // 내가 보낸 메시지는 이미 로컬에 추가됨
          if (row.sender_id === user.id) return;

          // 프로필 정보 포함하여 추가
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name, profile_image_url')
            .eq('user_id', row.sender_id)
            .single();

          addRealtimeMessage({
            ...row,
            sender_name: data?.display_name || '알 수 없음',
            sender_profile_image: data?.profile_image_url || null,
            reply_to_preview: null,
          });
        }
      )
      // 타이핑 이벤트
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingPayload;
        if (data.userId === user.id) return;
        setTypingUser(data.userId, data.userName, data.isTyping);
      })
      // 온라인 상태
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.values(state)
          .flat()
          .map((p: any) => p.user_id)
          .filter(Boolean);
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user, addRealtimeMessage, setTypingUser, setOnlineUsers]);

  // 타이핑 전송 함수
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!roomId || !user) return;

      const channelName = `chat:room:${roomId}`;
      const channel = supabase.channel(channelName);

      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          userName: user.user_metadata?.full_name || '',
          isTyping,
        } as TypingPayload,
      });

      // 자동 타이핑 해제 (3초)
      if (isTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(false);
        }, 3000);
      }
    },
    [roomId, user]
  );

  return { sendTyping };
}

/**
 * 글로벌 채팅 알림 구독 (채팅 목록용)
 * - chat_participants 변경 감지 (INSERT + UPDATE) → 배지 갱신
 * - 탭 전환 시 폴백으로 unread count 재로드
 */
export function useChatGlobalRealtime() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const handleChange = () => {
      const store = useChatStore.getState();
      store.loadUnreadCount();
      if (store.isDesktopPanelOpen) {
        store.loadRooms();
      }
    };

    const channel = supabase
      .channel(`chat:global:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`,
        },
        handleChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`,
        },
        handleChange
      )
      .subscribe();

    // 탭 전환 시 폴백: unread count 재로드
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        useChatStore.getState().loadUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);
}
