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
  UpdateCrawlBoardInput,
  ViewType
} from '@/types';

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
    const { error } = await supabase.from('search_logs').insert({
      search_query: payload.searchQuery,
      tokens: payload.tokens,
      view_type: payload.viewType,
      filters: payload.filters,
      result_count: payload.resultCount,
      duration_ms: Math.round(payload.durationMs),
      is_error: payload.isError,
      error_message: payload.errorMessage ?? null,
    });

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
    viewType = 'job',
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    lastUpdatedAt,
  } = params;

  const filters = mergeFilters(overrides);
  const normalizedViewType: ViewType = viewType ?? 'job';
  const tokens = tokenizeSearchQuery(searchQuery);
  const startedAt = getHighResolutionTime();

  try {
    const response = normalizedViewType === 'talent'
      ? await executeTalentSearch({
        searchQuery,
        tokens,
        filters,
        limit,
        offset,
        lastUpdatedAt,
      })
      : await executeJobSearch({
          searchQuery,
          tokens,
          filters,
          limit,
          offset,
          jobType: normalizedViewType === 'experience' ? EXPERIENCE_JOB_TYPE : undefined,
          lastUpdatedAt,
        });

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

function buildWebsearchExpression(tokens: string[], fallbackQuery: string): string | null {
  const asciiTokenRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
  const normalizedTokens = tokens
    .map((token) => token.replace(/[&|!:*<>()"\[\]]+/g, '').trim())
    .filter((token) => asciiTokenRegex.test(token));

  if (normalizedTokens.length > 0) {
    return normalizedTokens.join(' & ');
  }

  const fallback = fallbackQuery.trim();
  return asciiTokenRegex.test(fallback) ? fallback : null;
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

interface JobSearchArgs {
  searchQuery: string;
  tokens: string[];
  filters: SearchFilters;
  limit: number;
  offset: number;
  jobType?: string;
  lastUpdatedAt?: number;
}

async function executeJobSearch({
  searchQuery,
  tokens,
  filters,
  limit,
  offset,
  jobType,
}: JobSearchArgs): Promise<SearchResponse> {
  let query = supabase
    .from('job_postings')
    .select('*', { count: 'exact' });

  const trimmedQuery = searchQuery.trim();
  const websearchExpression = buildWebsearchExpression(tokens, trimmedQuery);
  let ftsApplied = false;
  if (websearchExpression) {
    query = query.textSearch('search_vector', websearchExpression, {
      type: 'websearch',
      config: 'simple'
    });
    ftsApplied = true;
  }

  if (tokens.length > 0) {
    tokens.forEach((token) => {
      const pattern = buildIlikePattern(token);
      const likeExpression = ['title', 'organization', 'location']
        .map((column) => `${column}.ilike.${pattern}`)
        .join(',');
      query = query.or(likeExpression);
    });
  } else if (!ftsApplied && trimmedQuery.length > 0) {
    const pattern = buildIlikePattern(trimmedQuery);
    query = query.or(
      ['title', 'organization', 'location'].map((column) => `${column}.ilike.${pattern}`).join(',')
    );
  }

  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    query = query.ilike('location', buildIlikePattern(filters.region));
  }

  if (hasFilterValue(filters.category, DEFAULT_CATEGORY)) {
    query = query.contains('tags', [filters.category]);
  }

  if (jobType) {
    query = query.eq('job_type', jobType);
  }

  query = applyJobSort(query, filters.sort);

  const from = Math.max(offset ?? DEFAULT_OFFSET, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1) - 1;

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    console.error('공고 검색 실패:', error);
    return createEmptySearchResponse(limit, offset);
  }

  const shouldSortByRelevance = filters.sort === '추천순' && (tokens.length > 0 || trimmedQuery.length > 0);
  const orderedData = shouldSortByRelevance
    ? sortJobsByRelevance(data, tokens, trimmedQuery)
    : data;

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
  filters: SearchFilters;
  limit: number;
  offset: number;
  lastUpdatedAt?: number;
}

async function executeTalentSearch({
  searchQuery,
  tokens,
  filters,
  limit,
  offset,
}: TalentSearchArgs): Promise<SearchResponse> {
  let query = supabase
    .from('talents')
    .select('*', { count: 'exact' });

  const trimmedQuery = searchQuery.trim();
  const websearchExpression = buildWebsearchExpression(tokens, trimmedQuery);
  let ftsApplied = false;
  if (websearchExpression) {
    query = query.textSearch('search_vector', websearchExpression, {
      type: 'websearch',
      config: 'simple'
    });
    ftsApplied = true;
  }

  if (tokens.length > 0) {
    tokens.forEach((token) => {
      const pattern = buildIlikePattern(token);
      const likeExpression = ['name', 'specialty']
        .map((column) => `${column}.ilike.${pattern}`)
        .join(',');
      query = query.or(likeExpression);
    });
  } else if (!ftsApplied && trimmedQuery.length > 0) {
    const pattern = buildIlikePattern(trimmedQuery);
    query = query.or(
      ['name', 'specialty'].map((column) => `${column}.ilike.${pattern}`).join(',')
    );
  }

  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    query = query.contains('location', [filters.region]);
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
  const orderedData = shouldSortByRelevance
    ? sortTalentsByRelevance(data, tokens, trimmedQuery)
    : data;

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

