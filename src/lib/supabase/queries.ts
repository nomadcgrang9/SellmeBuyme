import { supabase } from './client';
import {
  DEFAULT_CATEGORY,
  DEFAULT_REGION,
  DEFAULT_SORT
} from '@/lib/constants/filters';
import type {
  Card,
  CrawlBoard,
  CrawlLog,
  CreateCrawlBoardInput,
  JobPostingCard,
  SearchFilters,
  SearchQueryParams,
  SearchResponse,
  SortOptionValue,
  StructuredJobContent,
  TalentCard,
  PromoCardSettings,
  PromoCardUpdateInput,
  UpdateCrawlBoardInput,
  ViewType
} from '@/types';

type RecommendationAiComment = {
  headline?: string;
  description?: string;
  diagnostics?: Record<string, unknown>;
} | null;

type RecommendationCacheRow = {
  cards: Card[] | null;
  ai_comment: RecommendationAiComment;
  profile_snapshot: Record<string, unknown> | null;
  updated_at: string;
};

type PromoCardSettingsRow = {
  id: string;
  is_active: boolean;
  headline: string;
  image_url: string | null;
  insert_position: number;
  last_draft_at: string | null;
  last_applied_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  background_color: string;
  font_color: string;
  font_size: number;
  badge_color: string;
  image_scale: number | null;
};

function mapPromoCardFromDbRow(row: PromoCardSettingsRow): PromoCardSettings {
  return {
    id: row.id,
    isActive: row.is_active,
    headline: row.headline,
    backgroundColor: row.background_color ?? '#ffffff',
    fontColor: row.font_color ?? '#1f2937',
    fontSize: row.font_size ?? 28,
    badgeColor: row.badge_color ?? '#dbeafe',
    imageScale: typeof row.image_scale === 'number' ? row.image_scale : 1,
    imageUrl: row.image_url ?? null,
    insertPosition: row.insert_position,
    lastDraftAt: row.last_draft_at,
    lastAppliedAt: row.last_applied_at,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 캐시 유효성 검사: 24시간 이상 지난 캐시는 무효
export function isCacheValid(updatedAt: string): boolean {
  if (!updatedAt) return false;
  
  const now = new Date();
  const cacheTime = new Date(updatedAt);
  const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
  
  return diffHours < 24;
}

// 프로필 변경 감지: 추천에 영향을 주는 필드만 비교
export function hasProfileChanged(
  cachedProfile: Record<string, unknown> | null,
  currentProfile: Record<string, unknown> | null
): boolean {
  if (!cachedProfile || !currentProfile) return true;
  
  // 추천에 영향을 주는 필드들
  const criticalFields = [
    'interest_regions',
    'teacher_level',
    'preferred_job_types',
    'preferred_subjects',
    'roles'
  ];
  
  for (const field of criticalFields) {
    const cached = JSON.stringify(cachedProfile[field]);
    const current = JSON.stringify(currentProfile[field]);
    if (cached !== current) {
      return true;
    }
  }
  
  return false;
}

const ADJACENT_REGIONS: Record<string, string[]> = {
  '서울': ['고양', '광명', '구리', '과천', '성남', '부천'],
  '고양': ['서울', '파주', '김포', '양주'],
  '수원': ['용인', '화성', '의왕', '오산'],
  '용인': ['수원', '화성', '이천', '광주'],
  '화성': ['수원', '용인', '오산', '평택'],
  '시흥': ['안산', '부천', '광명', '인천'],
  '부천': ['서울', '시흥', '김포', '광명'],
  '인천': ['시흥', '김포', '부천', '안산'],
  '김포': ['고양', '인천', '부천'],
  '안산': ['시흥', '인천', '화성'],
  '의정부': ['서울', '양주', '포천'],
  '성남': ['서울', '용인', '하남', '광주'],
  '하남': ['서울', '성남', '남양주'],
  '남양주': ['구리', '하남', '양평'],
  '평택': ['화성', '안성', '천안'],
  '안양': ['의왕', '군포', '과천'],
  '군포': ['안양', '의왕', '안산'],
  '의왕': ['수원', '안양', '군포'],
  '오산': ['수원', '화성', '평택'],
  '광주': ['성남', '용인', '이천'],
  '이천': ['용인', '광주', '여주'],
  '여주': ['이천', '양평'],
  '양평': ['여주', '남양주'],
  '춘천': ['원주', '홍천'],
  '원주': ['이천', '춘천', '제천'],
  '청주': ['세종', '대전', '천안'],
  '대전': ['청주', '세종', '논산'],
  '천안': ['평택', '청주', '아산']
};

const REGION_FALLBACKS = ['경기도', '서울', '인천'];

export function buildRegionFilter(interestRegions: string[] | null | undefined): string[] {
  const result = new Set<string>();

  if (!interestRegions || interestRegions.length === 0) {
    REGION_FALLBACKS.forEach((region) => result.add(region));
    return Array.from(result);
  }

  interestRegions.forEach((region) => {
    if (!region) {
      return;
    }

    result.add(region);

    const adjacent = ADJACENT_REGIONS[region];
    if (adjacent) {
      adjacent.forEach((adjRegion) => result.add(adjRegion));
    }
  });

  if (result.size < 3) {
    REGION_FALLBACKS.forEach((region) => result.add(region));
  }

  return Array.from(result);
}

export function filterByTeacherLevel(
  cards: Card[],
  teacherLevel: string | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!teacherLevel) return cards;

  const normalizedLevel = teacherLevel.toLowerCase().trim();
  const jobCards = cards.filter((card) => card.type === 'job');

  if (normalizedLevel.includes('유치원')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasSignal = tags.some((tag) => tag.includes('유치원')) || title.includes('유치원');
      if (!hasSignal) return true; // 신호 없으면 포함
      return true; // 유치원 신호면 포함
    });
  }

  if (normalizedLevel.includes('초등')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasElementary = tags.some((tag) => tag.includes('초등') || tag.includes('초등학교')) || title.includes('초등');
      const hasMiddle = tags.some((tag) => tag.includes('중등') || tag.includes('중학교')) || title.includes('중등');
      const hasKindergarten = tags.some((tag) => tag.includes('유치원')) || title.includes('유치원');
      const hasSpecial = tags.some((tag) => tag.includes('특수')) || title.includes('특수');
      const hasAnySignal = hasElementary || hasMiddle || hasKindergarten || hasSpecial;
      if (!hasAnySignal) return true; // 신호 없으면 포함
      return hasElementary; // 초등 신호일 때만 포함
    });
  }

  if (normalizedLevel.includes('중등')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasElementary = tags.some((tag) => tag.includes('초등') || tag.includes('초등학교')) || title.includes('초등');
      const hasMiddle = tags.some((tag) => tag.includes('중등') || tag.includes('중학교')) || title.includes('중등');
      const hasAnySignal = hasElementary || hasMiddle;
      if (!hasAnySignal) return true; // 신호 없으면 포함
      return hasMiddle; // 중등 신호일 때만 포함
    });
  }

  if (normalizedLevel.includes('단실')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasSignal = tags.some((tag) => tag.includes('단실') || tag.includes('단실교육')) || title.includes('단실');
      if (!hasSignal) return true; // 신호 없으면 포함
      return true; // 단실 표기된 공고 포함
    });
  }

  return cards;
}

export function filterByJobType(
  cards: Card[],
  preferredJobTypes: string[] | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!preferredJobTypes || preferredJobTypes.length === 0) return cards;

  const jobCards = cards.filter((card) => card.type === 'job');
  const normalizedTypes = preferredJobTypes.map((type) => type.toLowerCase().trim());

  return jobCards.filter((card) => {
    const title = card.title?.toLowerCase() ?? '';
    const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
    const allText = `${title} ${tags.join(' ')}`;

    return normalizedTypes.some((type) => {
      if (type.includes('기간제')) {
        return allText.includes('기간제') || allText.includes('기간');
      }
      if (type.includes('시간제')) {
        return allText.includes('시간제') || allText.includes('시간');
      }
      if (type.includes('협력수업')) {
        return allText.includes('협력') || allText.includes('협력수업');
      }
      return false;
    });
  });
}

export function calculateSubjectScore(
  card: Card,
  preferredSubjects: string[] | null | undefined
): number {
  if (!preferredSubjects || preferredSubjects.length === 0) return 0;
  if (card.type !== 'job') return 0;

  const title = card.title?.toLowerCase() ?? '';
  const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
  const allText = `${title} ${tags.join(' ')}`;

  let score = 0;
  const normalizedSubjects = preferredSubjects.map((s) => s.toLowerCase().trim());

  for (const subject of normalizedSubjects) {
    if (allText.includes(subject)) {
      score += 20;
    }
  }

  return score;
}

export function filterByExperience(
  cards: Card[],
  experienceYears: number | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!experienceYears || experienceYears <= 0) return cards;

  const jobCards = cards.filter((card) => card.type === 'job') as Array<Card & { type: 'job' }>;

  return jobCards.filter((card) => {
    if (card.type !== 'job') return true;
    
    const jobCard = card as any;
    const cardContent = `${jobCard.title ?? ''} ${jobCard.detail_content ?? ''} ${(jobCard.tags ?? []).join(' ')}`.toLowerCase();
    
    // 경력 요구사항 추출 (예: "3년 이상", "5년 경력", "경력 무관")
    const experienceMatch = cardContent.match(/(\d+)\s*년\s*(?:이상|경력|근무)/);
    
    if (!experienceMatch) {
      // 경력 요구사항이 명시되지 않으면 포함
      return true;
    }
    
    const requiredExperience = parseInt(experienceMatch[1], 10);
    
    // 사용자 경력이 요구사항을 충족하면 포함 (여유 1년)
    return experienceYears + 1 >= requiredExperience;
  });
}

export function selectRecommendationCards(
  cards: Card[],
  roles: string[] | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!roles || roles.length === 0) return cards.slice(0, 6);

  const isTeacher = roles.some((role) =>
    role.toLowerCase().includes('교사') || role.toLowerCase().includes('선생')
  );
  const isInstructor = roles.some((role) =>
    role.toLowerCase().includes('강사') || role.toLowerCase().includes('instructor')
  );
  const isSupport = roles.some((role) =>
    role.toLowerCase().includes('기타') || role.toLowerCase().includes('행정')
  );

  if (!isTeacher && !isInstructor && !isSupport) {
    return cards.slice(0, 6);
  }

  const jobCards = cards.filter((card) => card.type === 'job');
  const talentCards = cards.filter((card) => card.type === 'talent');

  let selected: Card[] = [];

  if (isTeacher) {
    selected.push(...jobCards.slice(0, 4));
    selected.push(...talentCards.slice(0, 2));
  } else if (isInstructor) {
    selected.push(...talentCards.slice(0, 4));
    selected.push(...jobCards.slice(0, 2));
  } else if (isSupport) {
    selected.push(...jobCards.slice(0, 4));
    selected.push(...talentCards.slice(0, 2));
  }

  return selected.slice(0, 6);
}

export async function fetchRecommendationsCache(userId: string): Promise<{
  cards: Card[];
  aiComment: RecommendationAiComment;
  profileSnapshot: Record<string, unknown> | null;
  updatedAt: string;
} | null> {
  const { data, error } = await supabase
    .from('recommendations_cache')
    .select('cards, ai_comment, profile_snapshot, updated_at')
    .eq('user_id', userId)
    .maybeSingle<RecommendationCacheRow>();

  if (error) {
    console.error('추천 캐시 조회 실패:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    cards: data.cards ?? [],
    aiComment: data.ai_comment ?? null,
    profileSnapshot: data.profile_snapshot ?? null,
    updatedAt: data.updated_at
  };
}

// Edge Function 호출: 프로필 기반 추천 생성
export async function generateRecommendations(): Promise<{
  cards: Card[];
  aiComment: RecommendationAiComment;
} | null> {
  try {
    // Supabase JS v2: functions.invoke 사용
    const anyClient = supabase as unknown as { functions: { invoke: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> } };
    const { data, error } = await anyClient.functions.invoke('profile-recommendations', {
      body: {}
    });

    if (error) {
      console.error('추천 생성 실패:', error);
      return null;
    }

    const cards: Card[] = (data as any)?.cards ?? [];
    const aiComment: RecommendationAiComment = ((data as any)?.ai_comment ?? null) as RecommendationAiComment;
    return { cards, aiComment };
  } catch (e) {
    console.error('추천 생성 호출 예외:', e);
    return null;
  }
}

export async function fetchPromoCardSettings(options?: { onlyActive?: boolean }): Promise<PromoCardSettings | null> {
  try {
    let query = supabase
      .from('promo_card_settings')
      .select('*')
      .order('updated_at', { ascending: false });

    if (options?.onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.limit(1).maybeSingle<PromoCardSettingsRow>();

    if (error) {
      console.error('프로모 카드 설정 조회 실패:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapPromoCardFromDbRow(data);
  } catch (error) {
    // RLS 정책으로 인한 접근 불가 또는 테이블 없음 - 조용히 실패
    return null;
  }
}

type PromoCardMutationMode = 'draft' | 'apply';

async function mutatePromoCardSettings(
  payload: PromoCardUpdateInput,
  mode: PromoCardMutationMode,
  options?: { userId?: string | null }
): Promise<PromoCardSettings> {
  const timestamp = new Date().toISOString();
  const mapped: Record<string, unknown> = {
    is_active: payload.isActive,
    headline: payload.headline,
    image_url: payload.imageUrl ?? null,
    insert_position: payload.insertPosition,
    background_color: payload.backgroundColor,
    font_color: payload.fontColor,
    font_size: payload.fontSize,
    badge_color: payload.badgeColor,
    image_scale: payload.imageScale,
  };

  if (payload.id) mapped.id = payload.id;
  if (mode === 'draft') mapped.last_draft_at = timestamp;
  if (mode === 'apply') mapped.last_applied_at = timestamp;
  if (options?.userId !== undefined) mapped.updated_by = options.userId ?? null;

  console.debug('[PromoCard] mutate request', {
    mode,
    mapped,
    options,
  });

  const { data, error } = await supabase
    .from('promo_card_settings')
    .upsert(mapped, { onConflict: 'id' })
    .select('*')
    .single<PromoCardSettingsRow>();

  if (error) {
    console.error('프로모 카드 설정 저장 실패:', {
      error,
      mode,
      mapped,
      options,
    });
    throw error;
  }

  console.debug('[PromoCard] mutate success', {
    mode,
    response: data,
  });

  return mapPromoCardFromDbRow(data);
}

export async function savePromoCardDraft(
  payload: PromoCardUpdateInput,
  options?: { userId?: string | null }
): Promise<PromoCardSettings> {
  return mutatePromoCardSettings(payload, 'draft', options);
}

export async function applyPromoCardSettings(
  payload: PromoCardUpdateInput,
  options?: { userId?: string | null }
): Promise<PromoCardSettings> {
  return mutatePromoCardSettings(payload, 'apply', options);
}

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const EXPERIENCE_JOB_TYPE = 'experience';
const ENABLE_SEARCH_LOGGING = true;

const getHighResolutionTime = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

interface SearchLogPayload {
  searchQuery: string;
  tokens: string[];
  viewType: ViewType;
  filters: SearchFilters;
  resultCount: number;
  durationMs: number;
  isError: boolean;
  errorMessage?: string;
}

export async function triggerCrawlBoardRun(boardId: string) {
  const { error } = await supabase.functions.invoke('admin-crawl-run', {
    body: { boardId },
  });

  if (error) {
    console.error('크롤 즉시 실행 실패:', error);
    throw error;
  }
}

export async function triggerCrawlBoardTest(boardId: string) {
  const { data, error } = await supabase.functions.invoke('admin-crawl-test', {
    body: { boardId },
  });

  if (error) {
    console.error('크롤 테스트 실행 실패:', error);
    throw error;
  }

  return data;
}

export async function fetchCrawlBoards(): Promise<CrawlBoard[]> {
  const { data, error } = await supabase
    .from('crawl_boards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('크롤 게시판 조회 실패:', error);
    throw error;
  }

  return (data ?? []).map(mapCrawlBoardFromDbRow);
}

export async function createCrawlBoard(payload: CreateCrawlBoardInput): Promise<CrawlBoard> {
  const { data, error } = await supabase
    .from('crawl_boards')
    .insert(mapCrawlBoardToDbRow(payload))
    .select('*')
    .single();

  if (error) {
    console.error('크롤 게시판 생성 실패:', error);
    throw error;
  }

  return mapCrawlBoardFromDbRow(data);
}

export async function updateCrawlBoard(
  id: string,
  payload: UpdateCrawlBoardInput
): Promise<CrawlBoard> {
  const { data, error } = await supabase
    .from('crawl_boards')
    .update(mapCrawlBoardToDbRow(payload))
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('크롤 게시판 업데이트 실패:', error);
    throw error;
  }

  return mapCrawlBoardFromDbRow(data);
}

export async function fetchCrawlLogs(boardId?: string, status?: string): Promise<CrawlLog[]> {
  let query = supabase
    .from('crawl_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(200);

  if (boardId) {
    query = query.eq('board_id', boardId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('크롤 로그 조회 실패:', error);
    throw error;
  }

  return (data ?? []).map(mapCrawlLogFromDbRow);
}

function mapCrawlBoardFromDbRow(row: any): CrawlBoard {
  return {
    id: row.id,
    name: row.name,
    boardUrl: row.board_url,
    category: row.category,
    description: row.description,
    isActive: row.is_active,
    status: row.status,
    crawlConfig: row.crawl_config ?? {},
    crawlBatchSize: row.crawl_batch_size ?? 20,
    lastCrawledAt: row.last_crawled_at,
    lastSuccessAt: row.last_success_at,
    errorCount: row.error_count ?? 0,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCrawlBoardToDbRow(payload: Partial<CreateCrawlBoardInput>) {
  const mapped: Record<string, unknown> = {};

  if (payload.name !== undefined) mapped.name = payload.name;
  if (payload.boardUrl !== undefined) mapped.board_url = payload.boardUrl;
  if (payload.category !== undefined) mapped.category = payload.category;
  if (payload.description !== undefined) mapped.description = payload.description;
  if (payload.isActive !== undefined) mapped.is_active = payload.isActive;
  if (payload.status !== undefined) mapped.status = payload.status;
  if (payload.crawlConfig !== undefined) mapped.crawl_config = payload.crawlConfig ?? {};
  if (payload.crawlBatchSize !== undefined) mapped.crawl_batch_size = payload.crawlBatchSize;

  return mapped;
}

function mapCrawlLogFromDbRow(row: any): CrawlLog {
  return {
    id: row.id,
    boardId: row.board_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    itemsFound: row.items_found ?? 0,
    itemsNew: row.items_new ?? 0,
    itemsSkipped: row.items_skipped ?? 0,
    aiTokensUsed: row.ai_tokens_used ?? 0,
    errorLog: row.error_log,
    createdAt: row.created_at,
  };
}

async function logSearchEvent(payload: SearchLogPayload): Promise<void> {
  if (!ENABLE_SEARCH_LOGGING) return;

  try {
    const row: Record<string, unknown> = {
      query: payload.searchQuery,
      filters: payload.filters,
      result_count: payload.resultCount
    };

    const { error } = await supabase.from('search_logs').insert(row);

    if (error) {
      console.error('검색 로그 저장 실패:', error);
    }
  } catch (error) {
    console.error('검색 로그 처리 실패:', error);
  }
}

/**
 * 크롤링된 공고 목록 가져오기
 */
export async function fetchJobPostings(limit = 20) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('공고 조회 실패:', error);
    return [];
  }

  // Supabase 데이터를 Card 타입으로 변환
  return (data ?? []).map(mapJobPostingToCard);
}

/**
 * 마감일을 "~ MM.DD" 형식으로 변환
 */
function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `~ ${month}.${day}`;
}

/**
 * D-day 계산
 */
function calculateDaysLeft(deadline: string): number | undefined {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : undefined;
}

/**
 * 특정 공고 상세 조회
 */
export async function fetchJobPostingById(id: string) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('공고 상세 조회 실패:', error);
    return null;
  }

  return data;
}

/**
 * 검색/필터/정렬이 적용된 카드 목록 조회
 */
export async function searchCards(params: SearchQueryParams = {}): Promise<SearchResponse> {
  const {
    searchQuery = '',
    filters: overrides,
    viewType = 'all',
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    lastUpdatedAt,
  } = params;

  const filters = mergeFilters(overrides);
  const normalizedViewType: ViewType = viewType ?? 'all';
  const baseTokens = tokenizeSearchQuery(searchQuery);
  const tokenGroups = buildTokenGroups(baseTokens);
  const tokens = flattenTokenGroups(tokenGroups);
  const startedAt = getHighResolutionTime();

  try {
    let response: SearchResponse;

    if (normalizedViewType === 'all') {
      response = await executeAllSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
        lastUpdatedAt,
      });
    } else if (normalizedViewType === 'talent') {
      response = await executeTalentSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
        lastUpdatedAt,
      });
    } else {
      response = await executeJobSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
        jobType: normalizedViewType === 'experience' ? EXPERIENCE_JOB_TYPE : undefined,
        lastUpdatedAt,
      });
    }

    void logSearchEvent({
      searchQuery,
      tokens,
      viewType: normalizedViewType,
      filters,
      resultCount: response.totalCount,
      durationMs: getHighResolutionTime() - startedAt,
      isError: false,
    });

    return response;
  } catch (error) {
    void logSearchEvent({
      searchQuery,
      tokens,
      viewType: normalizedViewType,
      filters,
      resultCount: 0,
      durationMs: getHighResolutionTime() - startedAt,
      isError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function mergeFilters(overrides?: Partial<SearchFilters>): SearchFilters {
  return {
    region: overrides?.region ?? DEFAULT_REGION,
    category: overrides?.category ?? DEFAULT_CATEGORY,
    sort: overrides?.sort ?? DEFAULT_SORT,
  };
}

function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

type TokenGroup = string[];

function buildTokenGroups(tokens: string[]): TokenGroup[] {
  if (tokens.length === 0) {
    return [];
  }

  const synonymMap: Record<string, string[]> = {
    // 학교급
    '중등': ['중학교', '고등학교'],
    '고등': ['고등학교'],
    '초등': ['초등학교'],
    '유치원': ['유아'],
    '특수': ['특수학교'],

    // 과목 (부분 매칭 지원)
    '일본': ['일본어', '일본인'],
    '중국': ['중국어', '중국인'],
    '영어': ['영어교육', '영어회화', '영어과'],
    '수학': ['수학교육', '수학과'],
    '과학': ['과학교육', '과학과'],
    '체육': ['체육교육', '체육과'],
    '음악': ['음악교육', '음악과'],
    '미술': ['미술교육', '미술과'],

    // 지역 (부분 매칭 지원)
    '화성': ['화성시', '화성교육지원청'],
    '수원': ['수원시', '수원교육지원청'],
    '성남': ['성남시', '성남교육지원청'],
    '고양': ['고양시', '고양교육지원청'],
    '용인': ['용인시', '용인교육지원청'],
    '부천': ['부천시', '부천교육지원청'],
    '안산': ['안산시', '안산교육지원청'],
    '남양주': ['남양주시', '남양주교육지원청'],
    '평택': ['평택시', '평택교육지원청'],
    '의정부': ['의정부시', '의정부교육지원청'],

    // 역할/직무
    '자원봉사': ['자원봉사자', '자원봉사활동'],
    '교사': ['교원', '교육자'],
    '강사': ['교강사', '외부강사']
  };

  return tokens.map((token) => {
    const variants = new Set<string>();
    variants.add(token);
    const synonyms = synonymMap[token];
    if (Array.isArray(synonyms)) {
      synonyms.forEach((synonym) => {
        const trimmed = synonym.trim();
        if (trimmed.length > 0) {
          variants.add(trimmed);
        }
      });
    }
    return Array.from(variants);
  });
}

function flattenTokenGroups(groups: TokenGroup[]): string[] {
  const flattened: string[] = [];
  const seen = new Set<string>();
  groups.forEach((group) => {
    group.forEach((token) => {
      if (!seen.has(token)) {
        flattened.push(token);
        seen.add(token);
      }
    });
  });
  return flattened;
}

function normalizeToken(token: string): string {
  return token.replace(/[&|!:*<>()"\[\]]+/g, '').trim();
}

function buildWebsearchExpressionFromGroups(groups: TokenGroup[], fallbackQuery: string): string | null {
  if (groups.length === 0) {
    return null;
  }

  const expressions = groups
    .map((group) => group
      .map((token) => normalizeToken(token))
      .filter((token) => token.length > 0))
    .filter((groupTokens) => groupTokens.length > 0)
    .map((groupTokens) => (groupTokens.length > 1 ? `(${groupTokens.join(' | ')})` : groupTokens[0]));

  if (expressions.length > 0) {
    return expressions.join(' & ');
  }

  const fallback = normalizeToken(fallbackQuery);
  return fallback.length > 0 ? fallback : null;
}

function filterJobsByTokenGroups(jobs: any[], tokenGroups: TokenGroup[]): any[] {
  if (tokenGroups.length === 0) {
    return jobs;
  }

  return jobs.filter((job) => {
    const title = (job?.title ?? '').toLowerCase();
    const organization = (job?.organization ?? '').toLowerCase();
    const location = (job?.location ?? '').toLowerCase();
    const tags = Array.isArray(job?.tags)
      ? job.tags.map((tag: string) => (tag ?? '').toLowerCase())
      : [];

    const fields = [title, organization, location, ...tags];

    // Phase 1: AND → OR 검색으로 변경
    // "수원 성남" → 수원 공고 OR 성남 공고 (모두 표시)
    return tokenGroups.some((group) => {
      return group.some((token) => {
        const normalized = token.toLowerCase();
        if (!normalized) return false;
        return fields.some((field) => field.includes(normalized));
      });
    });
  });
}

function filterTalentsByTokenGroups(talents: any[], tokenGroups: TokenGroup[]): any[] {
  if (tokenGroups.length === 0) {
    return talents;
  }

  return talents.filter((talent) => {
    const name = (talent?.name ?? '').toLowerCase();
    const specialty = (talent?.specialty ?? '').toLowerCase();
    const locations = Array.isArray(talent?.location)
      ? talent.location.map((loc: string) => (loc ?? '').toLowerCase())
      : [(talent?.location ?? '').toLowerCase()];
    const tags = Array.isArray(talent?.tags)
      ? talent.tags.map((tag: string) => (tag ?? '').toLowerCase())
      : [];

    const fields = [name, specialty, ...locations, ...tags];

    // Phase 1: AND → OR 검색으로 변경
    // "수원 성남" → 수원 인력 OR 성남 인력 (모두 표시)
    return tokenGroups.some((group) => {
      return group.some((token) => {
        const normalized = token.toLowerCase();
        if (!normalized) return false;
        return fields.some((field) => field.includes(normalized));
      });
    });
  });
}

function buildWebsearchExpression(tokens: string[], fallbackQuery: string): string | null {
  const normalizedTokens = tokens
    .map((token) => token.replace(/[&|!:*<>()"\[\]]+/g, '').trim())
    .filter((token) => token.length > 0);

  const hasNonAsciiToken = normalizedTokens.some((token) => /[^\u0000-\u007F]/.test(token));

  if (!hasNonAsciiToken && normalizedTokens.length > 0) {
    return normalizedTokens.join(' & ');
  }

  const fallback = fallbackQuery.trim();
  if (fallback.length > 0 && !/[^\u0000-\u007F]/.test(fallback)) {
    return fallback;
  }

  return null;
}

function sortJobsByRelevance(jobs: any[], tokens: string[], fallbackQuery: string) {
  return [...jobs].sort((a, b) => {
    const scoreA = calculateJobRelevance(a, tokens, fallbackQuery);
    const scoreB = calculateJobRelevance(b, tokens, fallbackQuery);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const viewCountA = typeof a.view_count === 'number' ? a.view_count : 0;
    const viewCountB = typeof b.view_count === 'number' ? b.view_count : 0;
    if (viewCountA !== viewCountB) {
      return viewCountB - viewCountA;
    }
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}

function sortTalentsByRelevance(talents: any[], tokens: string[], fallbackQuery: string) {
  return [...talents].sort((a, b) => {
    const scoreA = calculateTalentRelevance(a, tokens, fallbackQuery);
    const scoreB = calculateTalentRelevance(b, tokens, fallbackQuery);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const ratingA = typeof a.rating === 'number' ? a.rating : 0;
    const ratingB = typeof b.rating === 'number' ? b.rating : 0;
    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }
    const reviewA = typeof a.review_count === 'number' ? a.review_count : 0;
    const reviewB = typeof b.review_count === 'number' ? b.review_count : 0;
    return reviewB - reviewA;
  });
}

function calculateJobRelevance(job: any, tokens: string[], fallbackQuery: string) {
  const normalizedTitle = (job?.title ?? '').toLowerCase();
  const normalizedOrganization = (job?.organization ?? '').toLowerCase();
  const normalizedLocation = (job?.location ?? '').toLowerCase();
  const normalizedTags = Array.isArray(job?.tags)
    ? job.tags.map((tag: string) => (tag ?? '').toLowerCase())
    : [];

  const useFallbackToken = tokens.length === 0 && fallbackQuery.trim().length > 0
    ? [fallbackQuery.trim().toLowerCase()]
    : [];

  const searchTokens = tokens.length > 0 ? tokens.map((token) => token.toLowerCase()) : useFallbackToken;

  let score = 0;

  searchTokens.forEach((token) => {
    if (!token) return;
    if (normalizedTitle === token) {
      score += 60;
    } else if (normalizedTitle.includes(token)) {
      score += 40;
    }

    if (normalizedOrganization === token) {
      score += 40;
    } else if (normalizedOrganization.includes(token)) {
      score += 25;
    }

    if (normalizedLocation.includes(token)) {
      score += 10;
    }

    if (normalizedTags.some((tag: string) => tag === token)) {
      score += 30;
    } else if (normalizedTags.some((tag: string) => tag.includes(token))) {
      score += 15;
    }
  });

  if (job?.is_urgent) {
    score += 5;
  }

  return score;
}

function calculateTalentRelevance(talent: any, tokens: string[], fallbackQuery: string) {
  const normalizedName = (talent?.name ?? '').toLowerCase();
  const normalizedSpecialty = (talent?.specialty ?? '').toLowerCase();
  const normalizedLocations = Array.isArray(talent?.location)
    ? talent.location.map((loc: string) => (loc ?? '').toLowerCase())
    : [];
  const normalizedTags = Array.isArray(talent?.tags)
    ? talent.tags.map((tag: string) => (tag ?? '').toLowerCase())
    : [];

  const useFallbackToken = tokens.length === 0 && fallbackQuery.trim().length > 0
    ? [fallbackQuery.trim().toLowerCase()]
    : [];

  const searchTokens = tokens.length > 0 ? tokens.map((token) => token.toLowerCase()) : useFallbackToken;
  let score = 0;

  searchTokens.forEach((token) => {
    if (!token) return;
    if (normalizedName === token) {
      score += 60;
    } else if (normalizedName.includes(token)) {
      score += 40;
    }

    if (normalizedSpecialty === token) {
      score += 35;
    } else if (normalizedSpecialty.includes(token)) {
      score += 20;
    }

    if (normalizedLocations.some((loc: string) => loc.includes(token))) {
      score += 10;
    }

    if (normalizedTags.some((tag: string) => tag === token)) {
      score += 25;
    } else if (normalizedTags.some((tag: string) => tag.includes(token))) {
      score += 12;
    }
  });

  return score;
}

interface AllSearchArgs {
  searchQuery: string;
  tokens: string[];
  tokenGroups: TokenGroup[];
  filters: SearchFilters;
  limit: number;
  offset: number;
  lastUpdatedAt?: number;
}

async function executeAllSearch({
  searchQuery,
  tokens,
  tokenGroups,
  filters,
  limit,
  offset,
}: AllSearchArgs): Promise<SearchResponse> {
  // job과 talent를 병렬로 검색
  const [jobResponse, talentResponse] = await Promise.all([
    executeJobSearch({
      searchQuery,
      tokens,
      tokenGroups,
      filters,
      limit: 1000, // 충분히 큰 값으로 모든 데이터 가져오기
      offset: 0,
    }),
    executeTalentSearch({
      searchQuery,
      tokens,
      tokenGroups,
      filters,
      limit: 1000,
      offset: 0,
    }),
  ]);

  // 모든 카드 합치기
  const allCards = [...jobResponse.cards, ...talentResponse.cards];
  const totalCount = jobResponse.totalCount + talentResponse.totalCount;

  // 정렬 적용
  let sortedCards = allCards;
  if (filters.sort === '추천순' && (tokens.length > 0 || searchQuery.trim().length > 0)) {
    // 검색 관련성 기준 정렬
    sortedCards = [...allCards].sort((a, b) => {
      const scoreA = a.type === 'job' 
        ? calculateJobRelevance(a, tokens, searchQuery)
        : calculateTalentRelevance(a, tokens, searchQuery);
      const scoreB = b.type === 'job'
        ? calculateJobRelevance(b, tokens, searchQuery)
        : calculateTalentRelevance(b, tokens, searchQuery);
      return scoreB - scoreA;
    });
  } else if (filters.sort === '최신순') {
    // 최신순 정렬
    sortedCards = [...allCards].sort((a, b) => {
      const dateA = new Date((a as any).created_at ?? 0).getTime();
      const dateB = new Date((b as any).created_at ?? 0).getTime();
      return dateB - dateA;
    });
  }

  // 페이지네이션 적용
  const from = Math.max(offset ?? 0, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1);
  const paginatedCards = sortedCards.slice(from, to);

  return {
    cards: paginatedCards,
    totalCount,
    pagination: {
      limit,
      offset: from,
    }
  };
}

interface JobSearchArgs {
  searchQuery: string;
  tokens: string[];
  tokenGroups: TokenGroup[];
  filters: SearchFilters;
  limit: number;
  offset: number;
  jobType?: string;
  lastUpdatedAt?: number;
}

async function executeJobSearch({
  searchQuery,
  tokens,
  tokenGroups,
  filters,
  limit,
  offset,
  jobType,
}: JobSearchArgs): Promise<SearchResponse> {
  let query = supabase
    .from('job_postings')
    .select('*', { count: 'exact' });

  const trimmedQuery = searchQuery.trim();

  // Phase 2: 한국어 검색 시 FTS 우선 사용 (korean config로 형태소 분석)
  const hasKorean = /[가-힣]/.test(trimmedQuery);
  let ftsApplied = false;

  if (hasKorean && trimmedQuery.length > 0) {
    // 한국어가 있으면 FTS 사용 (korean config로 "일본" → "일본어" 자동 매칭)
    const ftsTokenGroups = tokenGroups.filter((group) => group.length === 1);
    const ftsExpression = buildWebsearchExpressionFromGroups(ftsTokenGroups, trimmedQuery);

    if (ftsExpression) {
      query = query.textSearch('search_vector', ftsExpression, {
        type: 'websearch'
        // config 제거: 트리거에서 설정한 'korean' 사용
      });
      ftsApplied = true;
    }
  }

  // FTS가 적용되지 않았거나 영문 검색인 경우에만 ilike 사용
  if (!ftsApplied) {
    if (tokens.length > 0) {
      const orConditions = tokens.flatMap((token) => {
        const pattern = buildIlikePattern(token);
        // subject 필드 추가! (tags는 배열이라 ilike 불가, 하지만 subject는 문자열)
        return ['title', 'organization', 'location', 'subject'].map((column) => `${column}.ilike.${pattern}`);
      });

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    } else if (trimmedQuery.length > 0) {
      const pattern = buildIlikePattern(trimmedQuery);
      const orConditions = ['title', 'organization', 'location', 'subject'].map(
        (column) => `${column}.ilike.${pattern}`
      );
      query = query.or(orConditions.join(','));
    }
  }

  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    const regionPattern = buildIlikePattern(filters.region + '시');
    query = query.ilike('location', regionPattern);
  }

  if (hasFilterValue(filters.category, DEFAULT_CATEGORY)) {
    query = query.contains('tags', [filters.category]);
  }

  if (jobType) {
    query = query.eq('job_type', jobType);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  
  query = query.or(`deadline.is.null,deadline.gte.${todayIso}`);

  query = applyJobSort(query, filters.sort);

  const from = Math.max(offset ?? DEFAULT_OFFSET, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1) - 1;

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    console.error('공고 검색 실패:', error);
    return createEmptySearchResponse(limit, offset);
  }
  
  const shouldSortByRelevance = filters.sort === '추천순' && (tokens.length > 0 || trimmedQuery.length > 0);
  const filteredData = filterJobsByTokenGroups(data, tokenGroups);
  const orderedData = shouldSortByRelevance
    ? sortJobsByRelevance(filteredData, tokens, trimmedQuery)
    : filteredData;

  return {
    cards: orderedData.map(mapJobPostingToCard),
    totalCount: count ?? orderedData.length,
    pagination: {
      limit,
      offset: from,
    }
  };
}

interface TalentSearchArgs {
  searchQuery: string;
  tokens: string[];
  tokenGroups: TokenGroup[];
  filters: SearchFilters;
  limit: number;
  offset: number;
  lastUpdatedAt?: number;
}

async function executeTalentSearch({
  searchQuery,
  tokens,
  tokenGroups,
  filters,
  limit,
  offset,
}: TalentSearchArgs): Promise<SearchResponse> {
  let query = supabase
    .from('talents')
    .select('*', { count: 'exact' });

  const trimmedQuery = searchQuery.trim();

  // Phase 2: 한국어 검색 시 FTS 우선 사용 (korean config로 형태소 분석)
  const hasKorean = /[가-힣]/.test(trimmedQuery);
  let ftsApplied = false;

  if (hasKorean && trimmedQuery.length > 0) {
    // 한국어가 있으면 FTS 사용 (korean config로 형태소 분석)
    const ftsTokenGroups = tokenGroups.filter((group) => group.length === 1);
    const ftsExpression = buildWebsearchExpressionFromGroups(ftsTokenGroups, trimmedQuery);

    if (ftsExpression) {
      query = query.textSearch('search_vector', ftsExpression, {
        type: 'websearch'
        // config 제거: 트리거에서 설정한 'korean' 사용
      });
      ftsApplied = true;
    }
  }

  // FTS가 적용되지 않았거나 영문 검색인 경우에만 ilike 사용
  if (!ftsApplied) {
    if (tokens.length > 0) {
      const orConditions = tokens.flatMap((token) => {
        const pattern = buildIlikePattern(token);
        return ['name', 'specialty'].map((column) => `${column}.ilike.${pattern}`);
      });

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    } else if (trimmedQuery.length > 0) {
      const pattern = buildIlikePattern(trimmedQuery);
      const orConditions = ['name', 'specialty'].map((column) => `${column}.ilike.${pattern}`);
      query = query.or(orConditions.join(','));
    }
  }

  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    const regionPattern = buildIlikePattern(filters.region + '시');
    query = query.ilike('location', regionPattern);
  }

  if (hasFilterValue(filters.category, DEFAULT_CATEGORY)) {
    query = query.contains('tags', [filters.category]);
  }

  query = applyTalentSort(query, filters.sort);

  const from = Math.max(offset ?? DEFAULT_OFFSET, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1) - 1;

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    console.error('인력 검색 실패:', error);
    return createEmptySearchResponse(limit, offset);
  }

  const shouldSortByRelevance = filters.sort === '추천순' && (tokens.length > 0 || trimmedQuery.length > 0);
  const filteredData = filterTalentsByTokenGroups(data, tokenGroups);
  const orderedData = shouldSortByRelevance
    ? sortTalentsByRelevance(filteredData, tokens, trimmedQuery)
    : filteredData;

  return {
    cards: orderedData.map(mapTalentToCard),
    totalCount: count ?? orderedData.length,
    pagination: {
      limit,
      offset: from,
    }
  };
}

function applyJobSort(query: any, sort: SortOptionValue) {
  switch (sort) {
    case '마감임박순':
      return query
        .order('deadline', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false });
    case '최신순':
      return query.order('created_at', { ascending: false });
    case '급여높은순':
      return query.order('compensation', { ascending: false, nullsLast: true });
    default:
      return query
        .order('view_count', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false });
  }
}

function applyTalentSort(query: any, sort: SortOptionValue) {
  switch (sort) {
    case '경력무관':
      return query
        .order('experience_years', { ascending: true, nullsLast: true })
        .order('rating', { ascending: false, nullsLast: true });
    case '최신순':
      return query.order('created_at', { ascending: false });
    case '평점높은순':
    case '추천순':
    default:
      return query
        .order('rating', { ascending: false, nullsLast: true })
        .order('review_count', { ascending: false, nullsLast: true });
  }
}

function buildIlikePattern(value: string) {
  const sanitized = value.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${sanitized}%`;
}

function hasFilterValue(value: string, defaultValue: string) {
  return value && value !== defaultValue;
}

function createEmptySearchResponse(limit: number, offset: number): SearchResponse {
  return {
    cards: [],
    totalCount: 0,
    pagination: {
      limit,
      offset,
    }
  };
}

function mapJobPostingToCard(job: any): JobPostingCard {
  const structured = (job?.structured_content ?? null) as StructuredJobContent | null;
  const overview = structured?.overview ?? null;
  const combinedContact = job?.contact
    || [structured?.contact?.department, structured?.contact?.name, structured?.contact?.phone, structured?.contact?.email]
      .filter(Boolean)
      .join(' / ') || undefined;

  return {
    id: job.id,
    type: 'job',
    isUrgent: Boolean(job.is_urgent),
    organization: job.organization || overview?.organization || '미확인 기관',
    title: job.title,
    tags: job.tags || [],
    location: job.location,
    compensation: job.compensation || '협의',
    deadline: job.deadline ? formatDeadline(job.deadline) : '상시모집',
    daysLeft: job.deadline ? calculateDaysLeft(job.deadline) : undefined,
    work_period: job.work_period || job.work_term || overview?.work_period || undefined,
    application_period: job.application_period || overview?.application_period || undefined,
    work_time: job.work_time || undefined,
    contact: combinedContact,
    detail_content: job.detail_content,
    attachment_url: job.attachment_url,
    source_url: job.source_url,
    qualifications: job.qualifications || structured?.qualifications || [],
    structured_content: structured,
  };
}

function mapTalentToCard(talent: any): TalentCard {
  const locationValue = Array.isArray(talent.location)
    ? talent.location.join('/').replace(/\/+/, '/')
    : talent.location ?? '';
  const experienceYears = typeof talent.experience_years === 'number' ? talent.experience_years : 0;
  const rating = typeof talent.rating === 'number' ? Number(talent.rating) : 0;
  const reviewCount = talent.review_count ?? 0;

  return {
    id: talent.id,
    type: 'talent',
    isVerified: Boolean(talent.is_verified),
    name: talent.name,
    specialty: talent.specialty,
    tags: talent.tags || [],
    location: locationValue,
    experience: `경력 ${experienceYears}년`,
    rating,
    reviewCount,
  };
}

