import { supabase } from './client';
import type {
  StripeBannerConfig,
  StripeBanner,
  StripeStatistics,
  PopularKeyword,
  UpdateStripeBannerConfigInput,
  UpdateStripeBannerInput,
  UpdateStripeStatisticsInput,
  UpdatePopularKeywordInput,
  ColorMode
} from '@/types';

// ========================================
// Phase 2-2: 기본 조회 함수
// ========================================

/**
 * 띠지배너 전체 설정 조회
 */
export async function getStripeBannerConfig(): Promise<StripeBannerConfig | null> {
  const { data, error } = await supabase
    .from('stripe_banner_config')
    .select('*')
    .single();

  if (error) {
    console.error('Error fetching stripe banner config:', error);
    return null;
  }

  return mapConfigFromDb(data);
}

/**
 * 활성화된 배너 목록 조회 (순서대로)
 */
export async function getActiveBanners(): Promise<StripeBanner[]> {
  const { data, error } = await supabase
    .from('stripe_banners')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('Error fetching active banners:', error);
    return [];
  }

  return data.map(mapBannerFromDb);
}

/**
 * 모든 배너 조회 (관리자용)
 */
export async function getAllBanners(): Promise<StripeBanner[]> {
  const { data, error } = await supabase
    .from('stripe_banners')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching all banners:', error);
    return [];
  }

  return data.map(mapBannerFromDb);
}

/**
 * 오늘 날짜의 통계 조회
 */
export async function getTodayStripeStatistics(): Promise<StripeStatistics | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('stripe_statistics')
    .select('*')
    .eq('stats_date', today)
    .maybeSingle();

  if (error) {
    console.error('Error fetching today statistics:', error);
    return null;
  }

  if (!data) {
    return null; // 데이터 없음 (에러 아님)
  }

  return mapStatisticsFromDb(data);
}

/**
 * 활성화된 인기 검색어 조회 (순서대로)
 */
export async function getActivePopularKeywords(): Promise<PopularKeyword[]> {
  const { data, error } = await supabase
    .from('popular_keywords')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
    .limit(10);

  if (error) {
    console.error('Error fetching active keywords:', error);
    return [];
  }

  return data.map(mapKeywordFromDb);
}

/**
 * 모든 인기 검색어 조회 (관리자용)
 */
export async function getAllPopularKeywords(): Promise<PopularKeyword[]> {
  const { data, error } = await supabase
    .from('popular_keywords')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching all keywords:', error);
    return [];
  }

  return data.map(mapKeywordFromDb);
}

// ========================================
// Phase 2-3: 통계 자동 집계 함수
// ========================================

/**
 * 오늘 신규 공고 수 자동 집계
 */
export async function countTodayNewJobs(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { count, error } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  if (error) {
    console.error('Error counting today jobs:', error);
    return 0;
  }

  return count || 0;
}

/**
 * 마감임박 공고 수 집계 (7일 이내)
 */
export async function countUrgentJobs(): Promise<number> {
  const today = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

  const { count, error } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .gte('deadline', todayStr)
    .lte('deadline', sevenDaysStr);

  if (error) {
    console.error('Error counting urgent jobs:', error);
    return 0;
  }

  return count || 0;
}

/**
 * 오늘 신규 인력 수 자동 집계
 */
export async function countTodayNewTalents(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { count, error } = await supabase
    .from('talents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', todayISO);

  if (error) {
    console.error('Error counting today talents:', error);
    return 0;
  }

  return count || 0;
}

/**
 * 통계 자동 집계 (auto 모드용)
 */
export async function getAutoStatistics(): Promise<{
  newJobsCount: number;
  urgentJobsCount: number;
  newTalentsCount: number;
}> {
  const [newJobsCount, urgentJobsCount, newTalentsCount] = await Promise.all([
    countTodayNewJobs(),
    countUrgentJobs(),
    countTodayNewTalents()
  ]);

  return {
    newJobsCount,
    urgentJobsCount,
    newTalentsCount
  };
}

// ========================================
// Phase 2-4: 인기 키워드 자동 추출 함수
// ========================================

/**
 * 최근 검색어 기반 인기 키워드 추출 (자동 모드용)
 */
export async function getPopularKeywordsFromSearchLogs(limit: number = 5): Promise<string[]> {
  // 최근 7일간의 검색 로그 분석
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const { data, error } = await supabase
    .from('search_logs')
    .select('query')
    .gte('created_at', sevenDaysAgoISO)
    .not('query', 'is', null)
    .limit(1000);

  if (error || !data) {
    console.error('Error fetching search logs:', error);
    return [];
  }

  // 키워드 빈도 집계
  const keywordCount = new Map<string, number>();

  data.forEach(log => {
    const query = log.query?.trim();
    if (!query || query.length < 2) return;

    // 공백으로 분리하여 개별 키워드 추출
    const keywords = query.split(/\s+/);
    keywords.forEach((keyword: string) => {
      const normalized = keyword.toLowerCase();
      if (normalized.length >= 2) {
        keywordCount.set(normalized, (keywordCount.get(normalized) || 0) + 1);
      }
    });
  });

  // 빈도순 정렬하여 상위 키워드 반환
  const sortedKeywords = Array.from(keywordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => `#${keyword}`);

  return sortedKeywords;
}

// ========================================
// Phase 2-5: 관리자용 업데이트 함수
// ========================================

/**
 * 띠지배너 전체 설정 업데이트
 */
export async function updateStripeBannerConfig(
  updates: UpdateStripeBannerConfigInput
): Promise<StripeBannerConfig | null> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.rotationSpeed !== undefined) dbUpdates.rotation_speed = updates.rotationSpeed;
  if (updates.statsMode !== undefined) dbUpdates.stats_mode = updates.statsMode;
  if (updates.keywordsMode !== undefined) dbUpdates.keywords_mode = updates.keywordsMode;

  // 첫 번째 설정 row 업데이트
  const { data: configData } = await supabase
    .from('stripe_banner_config')
    .select('id')
    .limit(1)
    .single();

  if (!configData) {
    console.error('No config found to update');
    return null;
  }

  const { data, error } = await supabase
    .from('stripe_banner_config')
    .update(dbUpdates)
    .eq('id', configData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating stripe banner config:', error);
    return null;
  }

  return mapConfigFromDb(data);
}

/**
 * 개별 배너 업데이트
 */
export async function updateStripeBanner(
  bannerId: string,
  updates: UpdateStripeBannerInput
): Promise<StripeBanner | null> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.link !== undefined) dbUpdates.link = updates.link;
  if (updates.bgColor !== undefined) dbUpdates.bg_color = updates.bgColor;
  if (updates.bgColorMode !== undefined) dbUpdates.bg_color_mode = updates.bgColorMode;
  if (updates.bgGradientStart !== undefined) dbUpdates.bg_gradient_start = updates.bgGradientStart;
  if (updates.bgGradientEnd !== undefined) dbUpdates.bg_gradient_end = updates.bgGradientEnd;
  if (updates.textColor !== undefined) dbUpdates.text_color = updates.textColor;
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from('stripe_banners')
    .update(dbUpdates)
    .eq('id', bannerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating banner:', error);
    return null;
  }

  return mapBannerFromDb(data);
}

/**
 * 오늘 통계 업데이트 (수동 모드용)
 */
export async function updateTodayStatistics(
  updates: UpdateStripeStatisticsInput
): Promise<StripeStatistics | null> {
  const today = new Date().toISOString().split('T')[0];

  // UPSERT: 없으면 INSERT, 있으면 UPDATE
  const { data, error } = await supabase
    .from('stripe_statistics')
    .upsert({
      stats_date: today,
      new_jobs_count: updates.newJobsCount ?? 0,
      urgent_jobs_count: updates.urgentJobsCount ?? 0,
      new_talents_count: updates.newTalentsCount ?? 0
    }, {
      onConflict: 'stats_date' // stats_date를 unique key로 사용
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error upserting statistics:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return mapStatisticsFromDb(data);
}

/**
 * 인기 검색어 업데이트
 */
export async function updatePopularKeyword(
  keywordId: string,
  updates: UpdatePopularKeywordInput
): Promise<PopularKeyword | null> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.keyword !== undefined) dbUpdates.keyword = updates.keyword;
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.searchCount !== undefined) dbUpdates.search_count = updates.searchCount;

  const { data, error } = await supabase
    .from('popular_keywords')
    .update(dbUpdates)
    .eq('id', keywordId)
    .select()
    .single();

  if (error) {
    console.error('Error updating keyword:', error);
    return null;
  }

  return mapKeywordFromDb(data);
}

/**
 * 새 배너 추가
 */
export async function createStripeBanner(
  banner: Omit<UpdateStripeBannerInput, 'isActive'> & { type: string; title: string }
): Promise<StripeBanner | null> {
  const { data, error } = await supabase
    .from('stripe_banners')
    .insert({
      type: banner.type,
      title: banner.title,
      description: banner.description || null,
      link: banner.link || null,
      bg_color: banner.bgColor || '#3b82f6',
      bg_color_mode: banner.bgColorMode || 'single',
      bg_gradient_start: banner.bgGradientStart || null,
      bg_gradient_end: banner.bgGradientEnd || null,
      text_color: banner.textColor || '#ffffff',
      display_order: banner.displayOrder || 0,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating banner:', error);
    return null;
  }

  return mapBannerFromDb(data);
}

/**
 * 배너 삭제
 */
export async function deleteStripeBanner(bannerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('stripe_banners')
    .delete()
    .eq('id', bannerId);

  if (error) {
    console.error('Error deleting banner:', error);
    return false;
  }

  return true;
}

/**
 * 새 인기 검색어 추가
 */
export async function createPopularKeyword(params: {
  keyword: string;
  displayOrder: number;
  isManual?: boolean;
}): Promise<PopularKeyword | null> {
  const { data, error } = await supabase
    .from('popular_keywords')
    .insert({
      keyword: params.keyword,
      display_order: params.displayOrder,
      is_active: true,
      is_manual: params.isManual ?? true,
      search_count: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating keyword:', error);
    return null;
  }

  return mapKeywordFromDb(data);
}

/**
 * 인기 검색어 삭제
 */
export async function deletePopularKeyword(keywordId: string): Promise<boolean> {
  const { error } = await supabase
    .from('popular_keywords')
    .delete()
    .eq('id', keywordId);

  if (error) {
    console.error('Error deleting keyword:', error);
    return false;
  }

  return true;
}

// ========================================
// DB Row Mapping Functions
// ========================================

function mapConfigFromDb(row: Record<string, unknown>): StripeBannerConfig {
  return {
    id: row.id as string,
    isActive: row.is_active as boolean,
    rotationSpeed: row.rotation_speed as number,
    statsMode: row.stats_mode as 'auto' | 'manual',
    keywordsMode: row.keywords_mode as 'auto' | 'manual',
    updatedBy: row.updated_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function mapBannerFromDb(row: Record<string, unknown>): StripeBanner {
  return {
    id: row.id as string,
    type: row.type as 'event' | 'notice' | 'review',
    title: row.title as string,
    description: row.description as string | null,
    link: row.link as string | null,
    bgColor: row.bg_color as string,
    bgColorMode: (row.bg_color_mode as ColorMode | null) ?? 'single',
    bgGradientStart: row.bg_gradient_start as string | null,
    bgGradientEnd: row.bg_gradient_end as string | null,
    textColor: row.text_color as string,
    displayOrder: row.display_order as number,
    isActive: row.is_active as boolean,
    updatedBy: row.updated_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function mapStatisticsFromDb(row: Record<string, unknown>): StripeStatistics {
  return {
    id: row.id as string,
    newJobsCount: row.new_jobs_count as number,
    urgentJobsCount: row.urgent_jobs_count as number,
    newTalentsCount: row.new_talents_count as number,
    statsDate: row.stats_date as string,
    updatedBy: row.updated_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function mapKeywordFromDb(row: Record<string, unknown>): PopularKeyword {
  return {
    id: row.id as string,
    keyword: row.keyword as string,
    displayOrder: row.display_order as number,
    isActive: row.is_active as boolean,
    isManual: row.is_manual as boolean,
    searchCount: row.search_count as number,
    updatedBy: row.updated_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}
