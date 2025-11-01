// useFilteredIdeas - 필터링 및 페이지네이션 기능이 있는 아이디어 훅
import { useState, useEffect } from 'react';
import {
  getIdeas,
  createIdea,
  uploadIdeaImage,
  deleteIdea,
} from '../supabase/developer';
import type { DevIdea, IdeaCategory } from '@/types/developer';

interface UseFilteredIdeasResult {
  ideas: DevIdea[];
  loading: boolean;
  error: Error | null;
  filter: IdeaCategory | 'all';
  setFilter: (filter: IdeaCategory | 'all') => void;
  page: number;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
  createNewIdea: (data: {
    authorName: string;
    content: string;
    category: IdeaCategory;
    images: File[];
  }) => Promise<void>;
  deleteIdeaItem: (id: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 3;

export function useFilteredIdeas(): UseFilteredIdeasResult {
  const [allIdeas, setAllIdeas] = useState<DevIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<IdeaCategory | 'all'>('all');
  const [page, setPage] = useState(1);

  const fetchAllIdeas = async () => {
    try {
      setLoading(true);
      setError(null);
      // 모든 아이디어를 한 번에 가져옴 (필터링은 클라이언트에서)
      const data = await getIdeas(1000, 0);
      setAllIdeas(data);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIdeas();
  }, []);

  // 필터링된 아이디어
  const filteredIdeas = filter === 'all'
    ? allIdeas
    : allIdeas.filter(idea => idea.category === filter);

  // 페이지네이션된 아이디어
  const startIndex = 0;
  const endIndex = page * ITEMS_PER_PAGE;
  const paginatedIdeas = filteredIdeas.slice(startIndex, endIndex);
  const hasMore = endIndex < filteredIdeas.length;

  const createNewIdea = async (data: {
    authorName: string;
    content: string;
    category: IdeaCategory;
    images: File[];
  }) => {
    try {
      const tempId = crypto.randomUUID();

      // 이미지 업로드
      const imageUrls: string[] = [];
      for (const file of data.images) {
        try {
          const url = await uploadIdeaImage(file, tempId);
          imageUrls.push(url);
        } catch (err) {
          console.error('Failed to upload image:', err);
        }
      }

      // 아이디어 생성
      const newIdea = await createIdea({
        title: '', // 제목 없음
        content: data.content,
        category: data.category,
        images: imageUrls,
        authorName: data.authorName,
      });

      // 목록에 추가
      setAllIdeas((prev) => [newIdea, ...prev]);
    } catch (err) {
      console.error('Failed to create idea:', err);
      throw err;
    }
  };

  const deleteIdeaItem = async (id: string) => {
    try {
      await deleteIdea(id);
      setAllIdeas((prev) => prev.filter(idea => idea.id !== id));
    } catch (err) {
      console.error('Failed to delete idea:', err);
      throw err;
    }
  };

  return {
    ideas: paginatedIdeas,
    loading,
    error,
    filter,
    setFilter: (newFilter) => {
      setFilter(newFilter);
      setPage(1); // 필터 변경 시 페이지 초기화
    },
    page,
    hasMore,
    loadMore: () => setPage(prev => prev + 1),
    refetch: fetchAllIdeas,
    createNewIdea,
    deleteIdeaItem,
  };
}
