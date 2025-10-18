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

export const useSearchStore = create<SearchStoreState>((set) => ({
  searchQuery: '',
  filters: { ...defaultFilters },
  viewType: 'job',
  limit: DEFAULT_LIMIT,
  offset: 0,
  lastUpdatedAt: Date.now(),
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
    viewType: 'job',
    limit: DEFAULT_LIMIT,
    offset: 0,
    lastUpdatedAt: Date.now()
  })
}));
