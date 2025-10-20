import {
  CATEGORY_OPTIONS,
  REGION_OPTIONS
} from '@/lib/constants/filters';

export interface JobPostingCard {
  id: string;
  type: 'job';
  isUrgent?: boolean;
  organization: string;
  title: string;
  tags: string[];
  location: string;
  compensation: string;
  deadline: string;
  daysLeft?: number;
  work_period?: string;
  application_period?: string;
  work_time?: string;
  contact?: string;
  detail_content?: string;
  attachment_url?: string;
  source_url?: string;
  qualifications?: string[];
  structured_content?: StructuredJobContent | null;
}

export interface StructuredJobContent {
  overview?: {
    organization?: string | null;
    field?: string | null;
    headcount?: string | null;
    work_period?: string | null;
    application_period?: string | null;
    duty_summary?: string | null;
  } | null;
  qualifications?: string[] | null;
  preferred?: string[] | null;
  application?: {
    method?: string | null;
    documents?: string[] | null;
  } | null;
  contact?: {
    department?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  notes?: string[] | null;
}

export interface TalentCard {
  id: string;
  type: 'talent';
  isVerified: boolean;
  name: string;
  specialty: string;
  tags: string[];
  location: string;
  experience: string;
  rating: number;
  reviewCount: number;
}

export type ViewType = 'all' | 'job' | 'talent' | 'experience';

export type SortOptionValue =
  | '추천순'
  | '최신순'
  | '마감임박순'
  | '평점높은순'
  | '급여높은순'
  | '경력무관';

export type RegionOption = (typeof REGION_OPTIONS)[number];

export type CategoryOption = (typeof CATEGORY_OPTIONS)[number];

export interface SearchFilters {
  region: RegionOption;
  category: CategoryOption;
  sort: SortOptionValue;
}

export interface SearchStoreState {
  searchQuery: string;
  filters: SearchFilters;
  viewType: ViewType;
  limit: number;
  offset: number;
  lastUpdatedAt: number;
  setSearchQuery: (value: string) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  setViewType: (viewType: ViewType) => void;
  loadMore: () => void;
  setPagination: (pagination: Partial<SearchPagination>) => void;
  resetSearch: () => void;
  resetFilters: () => void;
  resetAll: () => void;
}

export type Card = JobPostingCard | TalentCard;

export interface SearchPagination {
  limit: number;
  offset: number;
}

export interface SearchQueryParams {
  searchQuery?: string;
  filters?: Partial<SearchFilters>;
  viewType?: ViewType;
  limit?: number;
  offset?: number;
  lastUpdatedAt?: number;
}

export interface SearchResponse {
  cards: Card[];
  totalCount: number;
  pagination: SearchPagination;
}

export type CrawlBoardStatus = 'active' | 'broken' | 'blocked';

export type CrawlJobStatus = 'pending' | 'running' | 'success' | 'failed';

export interface CrawlBoard {
  id: string;
  name: string;
  boardUrl: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
  status: CrawlBoardStatus;
  crawlConfig: Record<string, unknown>;
  crawlBatchSize: number;
  lastCrawledAt: string | null;
  lastSuccessAt: string | null;
  errorCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrawlBoardInput {
  name: string;
  boardUrl: string;
  category?: string | null;
  description?: string | null;
  isActive?: boolean;
  status?: CrawlBoardStatus;
  crawlConfig?: Record<string, unknown> | null;
  crawlBatchSize?: number;
}

export type UpdateCrawlBoardInput = Partial<CreateCrawlBoardInput>;

export interface CrawlLog {
  id: string;
  boardId: string;
  status: CrawlJobStatus;
  startedAt: string;
  completedAt: string | null;
  itemsFound: number;
  itemsNew: number;
  itemsSkipped: number;
  aiTokensUsed: number;
  errorLog: string | null;
  createdAt: string;
}
