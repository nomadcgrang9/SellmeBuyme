import { supabase } from '@/lib/supabase/client';

/**
 * 사용자 활동 로깅
 * 대시보드 통계를 위한 사용자 행동 추적
 */

export type ActivityType =
  | 'page_view'
  | 'job_toggle'
  | 'talent_toggle'
  | 'experience_toggle'
  | 'search'
  | 'filter'
  | 'register'
  | 'job_view'
  | 'talent_view'
  | 'experience_view'
  | 'job_create'
  | 'talent_create'
  | 'experience_create';

interface LogActivityParams {
  actionType: ActivityType;
  metadata?: Record<string, unknown>;
}

/**
 * 활동 로그 기록
 */
export async function logActivity({ actionType, metadata }: LogActivityParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('user_activity_logs').insert({
      user_id: user?.id || null,
      action_type: actionType,
      metadata: metadata || {},
    });
  } catch (error) {
    // 로깅 실패는 조용히 처리 (사용자 경험에 영향 없음)
    console.error('활동 로그 기록 실패:', error);
  }
}

/**
 * 검색 로그 기록
 */
export async function logSearch(
  searchQuery: string,
  filters?: Record<string, unknown>,
  resultCount?: number
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('search_logs').insert({
      user_id: user?.id || null,
      query: searchQuery,
      filters: filters || {},
      result_count: resultCount,
    });
  } catch (error) {
    console.error('검색 로그 기록 실패:', error);
  }
}

/**
 * 페이지 뷰 로그
 */
export async function logPageView(page: string): Promise<void> {
  await logActivity({
    actionType: 'page_view',
    metadata: { page },
  });
}

/**
 * 토글 클릭 로그
 */
export async function logToggleClick(toggleType: 'job' | 'talent' | 'experience'): Promise<void> {
  await logActivity({
    actionType: `${toggleType}_toggle` as ActivityType,
  });
}

/**
 * 검색 사용 로그
 */
export async function logSearchUsage(query: string, resultCount: number): Promise<void> {
  await Promise.all([
    logActivity({
      actionType: 'search',
      metadata: { query, resultCount },
    }),
    logSearch(query, {}, resultCount),
  ]);
}

/**
 * 필터 사용 로그
 */
export async function logFilterUsage(filters: Record<string, unknown>): Promise<void> {
  await logActivity({
    actionType: 'filter',
    metadata: { filters },
  });
}

/**
 * 등록 버튼 클릭 로그
 */
export async function logRegisterClick(registerType: 'job' | 'talent' | 'experience'): Promise<void> {
  await logActivity({
    actionType: 'register',
    metadata: { registerType },
  });
}

/**
 * 카드 상세보기 로그
 */
export async function logCardView(
  cardType: 'job' | 'talent' | 'experience',
  cardId: string
): Promise<void> {
  await logActivity({
    actionType: `${cardType}_view` as ActivityType,
    metadata: { cardId },
  });
}

/**
 * 카드 생성 로그
 */
export async function logCardCreate(
  cardType: 'job' | 'talent' | 'experience',
  cardId: string
): Promise<void> {
  await logActivity({
    actionType: `${cardType}_create` as ActivityType,
    metadata: { cardId },
  });
}
