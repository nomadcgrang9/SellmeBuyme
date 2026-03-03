import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  user: User | null;
  status: AuthStatus;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
};

type AuthSubscription = ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'];

let subscription: AuthSubscription | null = null;
let initialized = false;
let initializing = false;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  initialize: async () => {
    if (initialized || initializing) return;

    initializing = true;
    set({ status: 'loading' });

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('세션 조회 실패:', error.message);
        set({ user: null, status: 'unauthenticated' });
      } else {
        const sessionUser = data.session?.user ?? null;
        set({ user: sessionUser, status: sessionUser ? 'authenticated' : 'unauthenticated' });
      }

      if (!subscription) {
        const {
          data: { subscription: authSubscription }
        } = supabase.auth.onAuthStateChange((_event, session) => {
          const nextUser = session?.user ?? null;
          set({
            user: nextUser,
            status: nextUser ? 'authenticated' : 'unauthenticated'
          });
        });

        subscription = authSubscription;
      }

      initialized = true;
    } finally {
      initializing = false;
    }
  },
  logout: async () => {
    // scope: 'local' → 서버 API 호출 없이 로컬 세션만 즉시 정리
    // (서버 호출 실패 시 로그아웃 안 되는 문제 방지)
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      console.error('로그아웃 실패:', error.message);
    }

    // 에러 여부와 관계없이 항상 로컬 상태 초기화
    set({ user: null, status: 'unauthenticated' });
    initialized = false;
  }
}));

export async function ensureAuthInitialized() {
  await useAuthStore.getState().initialize();
}

export function cleanupAuthSubscription() {
  subscription?.unsubscribe();
  subscription = null;
  initialized = false;
  initializing = false;
}
