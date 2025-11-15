import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import type { ChatMessage, TypingEventPayload, PresenceState } from '@/types/chat';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useChatRealtime - 채팅 실시간 구독 훅
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface UseChatRealtimeOptions {
  /** 특정 채팅방만 구독 (없으면 모든 참여 채팅방 구독) */
  roomId?: string;
  /** 타이핑 인디케이터 활성화 여부 */
  enableTyping?: boolean;
  /** 온라인 상태 활성화 여부 */
  enablePresence?: boolean;
}

/**
 * Supabase Realtime을 사용한 채팅 실시간 구독 훅
 *
 * **기능:**
 * - PostgreSQL CDC로 새 메시지 수신
 * - Broadcast로 타이핑 인디케이터 구독
 * - Presence로 사용자 온라인 상태 추적
 *
 * @param options 구독 옵션
 */
export function useChatRealtime(options: UseChatRealtimeOptions = {}) {
  const { roomId, enableTyping = true, enablePresence = true } = options;

  const user = useAuthStore((state) => state.user);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateTyping = useChatStore((state) => state.updateTyping);
  const updatePresence = useChatStore((state) => state.updatePresence);
  const updateUnreadCount = useChatStore((state) => state.updateUnreadCount);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    const channelName = roomId ? `chat:${roomId}` : 'chat:global';

    // ━━━ Realtime 채널 생성 ━━━
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false }, // 자신의 broadcast는 받지 않음
        presence: { key: user.id },
      },
    });

    // ━━━ 1. PostgreSQL CDC - 새 메시지 수신 ━━━
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: roomId ? `room_id=eq.${roomId}` : undefined,
      },
      async (payload) => {
        console.log('[useChatRealtime] 새 메시지 수신:', payload);

        // 메시지 ID로 상세 정보 조회
        const { data: msgData, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('id', payload.new.id)
          .single();

        if (msgError) {
          console.error('[useChatRealtime] 메시지 조회 실패:', msgError.message);
          return;
        }

        if (!msgData) return;

        // 발신자 프로필 조회
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, profile_image_url')
          .eq('user_id', msgData.sender_id)
          .single();

        // 발신자 이름 결정 (email fallback 포함)
        let senderName = profile?.display_name;
        if (!senderName) {
          try {
            const { data: { user: authUser } } = await supabase.auth.admin.getUserById(msgData.sender_id);
            senderName = authUser?.email?.split('@')[0] || '알 수 없음';
          } catch {
            senderName = '알 수 없음';
          }
        }

        // ChatMessage 형태로 변환
        const message: ChatMessage = {
          ...msgData,
          sender_name: senderName,
          sender_profile_image: profile?.profile_image_url || null,
          file_metadata: msgData.file_url
            ? {
                url: msgData.file_url,
                name: msgData.file_name || '',
                size: msgData.file_size || 0,
                type: msgData.file_type || '',
                size_formatted: formatFileSize(msgData.file_size || 0),
              }
            : undefined,
        };

        // Store에 메시지 추가
        addMessage(message);

        // 읽지 않은 메시지 수 업데이트
        await updateUnreadCount();
      }
    );

    // ━━━ 2. Broadcast - 타이핑 인디케이터 ━━━
    if (enableTyping) {
      channel.on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingEventPayload;
        console.log('[useChatRealtime] 타이핑 이벤트:', data);
        updateTyping(data);
      });
    }

    // ━━━ 3. Presence - 온라인 상태 ━━━
    if (enablePresence) {
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log('[useChatRealtime] Presence sync:', state);

          // 모든 온라인 사용자 업데이트
          Object.keys(state).forEach((userId) => {
            const presences = state[userId] as any[];
            if (presences && presences.length > 0) {
              // Supabase Realtime presence 데이터 구조에서 실제 데이터 추출
              const presenceData = presences[0] as any;
              const presenceState: PresenceState = {
                user_id: presenceData.user_id || userId,
                user_name: presenceData.user_name || '사용자',
                online_at: presenceData.online_at || new Date().toISOString(),
              };
              updatePresence(userId, presenceState);
            }
          });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('[useChatRealtime] User joined:', key, newPresences);
          if (newPresences && newPresences.length > 0) {
            const presenceData = newPresences[0] as any;
            const presenceState: PresenceState = {
              user_id: presenceData.user_id || key,
              user_name: presenceData.user_name || '사용자',
              online_at: presenceData.online_at || new Date().toISOString(),
            };
            updatePresence(key, presenceState);
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          console.log('[useChatRealtime] User left:', key);
          updatePresence(key, null);
        });
    }

    // ━━━ 채널 구독 시작 ━━━
    channel.subscribe((status) => {
      console.log(`[useChatRealtime] 채널 "${channelName}" 구독 상태:`, status);

      if (status === 'SUBSCRIBED') {
        console.log(`[useChatRealtime] ✅ "${channelName}" 구독 완료`);

        // Presence 상태 추적 시작 (구독 완료 후에만 실행)
        if (enablePresence) {
          channel.track({
            user_id: user.id,
            user_name: user.user_metadata?.display_name || user.email || '알 수 없음',
            online_at: new Date().toISOString(),
          });
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[useChatRealtime] ❌ "${channelName}" 구독 실패`);
      }
    });

    channelRef.current = channel;

    // ━━━ Cleanup - 언마운트 시 구독 해제 ━━━
    return () => {
      console.log(`[useChatRealtime] 🧹 "${channelName}" 구독 해제`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    user,
    roomId,
    enableTyping,
    enablePresence,
    addMessage,
    updateTyping,
    updatePresence,
    updateUnreadCount,
  ]);

  return {
    /**
     * 타이핑 상태 전송 (Broadcast)
     */
    sendTyping: (isTyping: boolean) => {
      if (!channelRef.current || !user) return;

      const payload: TypingEventPayload = {
        room_id: roomId || '',
        user_id: user.id,
        user_name: user.user_metadata?.display_name || user.email || '알 수 없음',
        is_typing: isTyping,
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload,
      });
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Utility Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 파일 크기를 사람이 읽을 수 있는 형태로 포맷
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
