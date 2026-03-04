// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 Supabase Realtime 구독 훅
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useWagleStore } from '@/stores/wagleStore';

export function useWagleRealtime() {
  const { addRealtimeReply, loadUnreadCount } = useWagleStore();

  useEffect(() => {
    const channel = supabase
      .channel('wagle-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wagle_replies' },
        (payload) => {
          addRealtimeReply(payload.new as any);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wagle_notifications' },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addRealtimeReply, loadUnreadCount]);
}
