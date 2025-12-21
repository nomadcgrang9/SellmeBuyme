/**
 * 사용자 활동 트래킹 훅
 * - 페이지 방문(page_view) 자동 기록
 * - 세션 ID 관리 (브라우저 탭 단위)
 * - 지역 정보 포함
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

// 세션 ID 생성 (탭 단위로 유지)
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('activity_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('activity_session_id', sessionId);
  }
  return sessionId;
};

// 디바이스 타입 감지
const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// 지역 정보 가져오기 (localStorage에서)
const getRegionInfo = (): { city?: string; district?: string } => {
  try {
    const cached = localStorage.getItem('user_location');
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        city: parsed.city || undefined,
        district: parsed.district || undefined,
      };
    }
  } catch {
    // 무시
  }
  return {};
};

interface TrackActivityParams {
  actionType: string;
  metadata?: Record<string, unknown>;
}

/**
 * 활동 기록 함수 (훅 외부에서도 사용 가능)
 */
export async function trackActivity({ actionType, metadata = {} }: TrackActivityParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();
    const regionInfo = getRegionInfo();

    // 현재 로그인한 사용자 ID (없으면 null)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { error } = await supabase.from('user_activity_logs').insert({
      user_id: userId,
      action_type: actionType,
      metadata: {
        session_id: sessionId,
        device_type: deviceType,
        region_city: regionInfo.city,
        region_district: regionInfo.district,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
        ...metadata,
      },
    });

    if (error) {
      console.warn('[ActivityTracking] 기록 실패:', error.message);
    }
  } catch (err) {
    console.warn('[ActivityTracking] 예외:', err);
  }
}

/**
 * 페이지 방문 트래킹 훅
 * App.tsx에서 한 번 호출하면 자동으로 page_view 기록
 */
export function useActivityTracking() {
  const { user } = useAuthStore();
  const hasTrackedRef = useRef(false);
  const lastPathRef = useRef<string>('');

  useEffect(() => {
    const currentPath = window.location.pathname;

    // 같은 경로면 중복 기록 방지
    if (hasTrackedRef.current && lastPathRef.current === currentPath) {
      return;
    }

    // 페이지 방문 기록
    trackActivity({
      actionType: 'page_view',
      metadata: {
        is_logged_in: !!user,
      },
    });

    hasTrackedRef.current = true;
    lastPathRef.current = currentPath;
  }, [user]);

  // 경로 변경 감지 (SPA 라우팅)
  useEffect(() => {
    const handlePopState = () => {
      trackActivity({
        actionType: 'page_view',
        metadata: {
          is_logged_in: !!user,
          navigation_type: 'popstate',
        },
      });
      lastPathRef.current = window.location.pathname;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);
}

export default useActivityTracking;
