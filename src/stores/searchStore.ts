import { create } from 'zustand';
import {
  DEFAULT_SORT
} from '@/lib/constants/filters';
import type {
  SearchFilters,
  SearchPagination,
  SearchStoreState,
  ViewType
} from '@/types';

const defaultFilters: SearchFilters = {
  region: [],
  category: [],
  schoolLevel: [],
  subject: [],
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

    // 지역 필터 (선택된 항목 있음)
    if (state.filters.region.length > 0) return true;

    // 카테고리 필터 (선택된 항목 있음)
    if (state.filters.category.length > 0) return true;

    // 학교급 필터 (선택된 항목 있음)
    if (state.filters.schoolLevel.length > 0) return true;

    // 과목 필터 (선택된 항목 있음)
    if (state.filters.subject.length > 0) return true;

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
  toggleFilter: (key, value) =>
    set((state) => {
      const current = state.filters[key] as string[];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return {
        filters: { ...state.filters, [key]: next },
        offset: 0,
        lastUpdatedAt: Date.now()
      };
    }),
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
