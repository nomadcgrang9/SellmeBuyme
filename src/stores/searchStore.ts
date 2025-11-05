import { create } from 'zustand';
import {
  DEFAULT_CATEGORY,
  DEFAULT_REGION,
  DEFAULT_SORT
} from '@/lib/constants/filters';
import type {
  SearchFilters,
  SearchPagination,
  SearchStoreState,
  ViewType
} from '@/types';

const defaultFilters: SearchFilters = {
  region: DEFAULT_REGION,
  category: DEFAULT_CATEGORY,
  sort: DEFAULT_SORT
};

const DEFAULT_LIMIT = 20;

export const useSearchStore = create<SearchStoreState>((set, get) => ({
  searchQuery: '',
  filters: { ...defaultFilters },
  viewType: 'all',
  limit: DEFAULT_LIMIT,
  offset: 0,
  lastUpdatedAt: Date.now(),
  hasActiveSearch: () => {
    const state = get();

    // 검색창에 텍스트 입력
    if (state.searchQuery.trim().length > 0) return true;

    // 지역 필터 수동 변경 (기본값: '서울 전체')
    if (state.filters.region !== DEFAULT_REGION) return true;

    // 카테고리 필터 수동 변경 (기본값: '전분야')
    if (state.filters.category !== DEFAULT_CATEGORY) return true;

    return false;  // 완전히 "자연스러운" 상태
  },
  setSearchQuery: (value) =>
    set({ searchQuery: value, offset: 0, lastUpdatedAt: Date.now() }),
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      offset: 0,
      lastUpdatedAt: Date.now()
    })),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      offset: 0,
      lastUpdatedAt: Date.now()
    })),
  setViewType: (viewType: ViewType) => set({ viewType, offset: 0, lastUpdatedAt: Date.now() }),
  loadMore: () => set((state) => ({ offset: state.offset + state.limit })),
  setPagination: ({ limit, offset }: Partial<SearchPagination>) =>
    set((state) => ({
      limit: limit ?? state.limit,
      offset: offset ?? state.offset
    })),
  resetSearch: () => set({ searchQuery: '', offset: 0, lastUpdatedAt: Date.now() }),
  resetFilters: () => set({ filters: { ...defaultFilters }, offset: 0, lastUpdatedAt: Date.now() }),
  resetAll: () => set({
    searchQuery: '',
    filters: { ...defaultFilters },
    viewType: 'all',
    limit: DEFAULT_LIMIT,
    offset: 0,
    lastUpdatedAt: Date.now()
  })
}));
