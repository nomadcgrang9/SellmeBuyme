import { create } from 'zustand';
import type { BookmarkCardType } from '@/types';

interface BookmarkState {
  // 상태
  bookmarkedIds: Set<string>;  // 북마크된 카드 ID 집합 (빠른 조회)
  bookmarkCount: number;        // 북마크 총 개수 (배지 표시용)
  isLoading: boolean;
  error: string | null;
  
  // 액션
  loadBookmarks: (bookmarkedIds: string[], count: number) => void;
  addBookmark: (cardId: string) => void;
  removeBookmark: (cardId: string) => void;
  isBookmarked: (cardId: string) => boolean;
  clearBookmarks: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  incrementCount: () => void;
  decrementCount: () => void;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  // 초기 상태
  bookmarkedIds: new Set<string>(),
  bookmarkCount: 0,
  isLoading: false,
  error: null,

  // 북마크 목록 로드 (초기화)
  loadBookmarks: (bookmarkedIds: string[], count: number) => {
    set({
      bookmarkedIds: new Set(bookmarkedIds),
      bookmarkCount: count,
      isLoading: false,
      error: null
    });
  },

  // 북마크 추가 (로컬 상태만 업데이트)
  addBookmark: (cardId: string) => {
    const { bookmarkedIds } = get();
    const newSet = new Set(bookmarkedIds);
    newSet.add(cardId);
    set({
      bookmarkedIds: newSet,
      bookmarkCount: newSet.size
    });
  },

  // 북마크 제거 (로컬 상태만 업데이트)
  removeBookmark: (cardId: string) => {
    const { bookmarkedIds } = get();
    const newSet = new Set(bookmarkedIds);
    newSet.delete(cardId);
    set({
      bookmarkedIds: newSet,
      bookmarkCount: newSet.size
    });
  },

  // 북마크 여부 확인
  isBookmarked: (cardId: string) => {
    return get().bookmarkedIds.has(cardId);
  },

  // 북마크 초기화
  clearBookmarks: () => {
    set({
      bookmarkedIds: new Set<string>(),
      bookmarkCount: 0,
      isLoading: false,
      error: null
    });
  },

  // 로딩 상태 설정
  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  // 에러 상태 설정
  setError: (error: string | null) => {
    set({ error });
  },

  // 카운트 증가
  incrementCount: () => {
    set((state) => ({ bookmarkCount: state.bookmarkCount + 1 }));
  },

  // 카운트 감소
  decrementCount: () => {
    set((state) => ({ bookmarkCount: Math.max(0, state.bookmarkCount - 1) }));
  }
}));
