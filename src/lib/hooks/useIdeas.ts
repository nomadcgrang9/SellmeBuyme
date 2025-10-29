// useIdeas - 아이디어 목록 및 생성 훅
import { useState, useEffect } from 'react';
import {
  getIdeas,
  createIdea,
  uploadIdeaImage,
} from '../supabase/developer';
import type { DevIdea, IdeaCategory } from '@/types/developer';

interface UseIdeasResult {
  ideas: DevIdea[];
  loading: boolean;
  error: Error | null;
  currentPage: number;
  totalPages: number;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
  createNewIdea: (data: {
    title: string;
    content: string;
    category: IdeaCategory;
    images: File[];
  }) => Promise<void>;
}

/**
 * 아이디어 목록을 조회하고 생성하는 커스텀 훅
 * @param limit - 조회할 아이디어 수 (기본: 10)
 * @returns 아이디어 목록, 로딩 상태, 에러, 페이지네이션 상태, 생성 함수
 */
export function useIdeas(limit = 10): UseIdeasResult {
  const [ideas, setIdeas] = useState<DevIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchIdeas = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * limit;
      const data = await getIdeas(limit, offset);
      setIdeas(data);

      // 임시로 총 페이지 수 계산 (실제로는 total count가 필요)
      // 가져온 데이터가 limit보다 적으면 마지막 페이지
      if (data.length < limit) {
        setTotalPages(page);
      } else {
        // 추가 페이지가 있을 가능성이 있음
        setTotalPages(page + 1);
      }

      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch ideas:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdeas(1);
  }, [limit]);

  const createNewIdea = async (data: {
    title: string;
    content: string;
    category: IdeaCategory;
    images: File[];
  }) => {
    try {
      // 먼저 임시 ID로 아이디어 생성
      const tempId = crypto.randomUUID();

      // 이미지 업로드
      const imageUrls: string[] = [];
      for (const file of data.images) {
        try {
          const url = await uploadIdeaImage(file, tempId);
          imageUrls.push(url);
        } catch (err) {
          console.error('Failed to upload image:', err);
          // 이미지 업로드 실패해도 계속 진행
        }
      }

      // 아이디어 생성
      const newIdea = await createIdea({
        title: data.title,
        content: data.content,
        category: data.category,
        images: imageUrls,
      });

      // 목록에 추가
      setIdeas((prev) => [newIdea, ...prev]);
    } catch (err) {
      console.error('Failed to create idea:', err);
      throw err;
    }
  };

  return {
    ideas,
    loading,
    error,
    currentPage,
    totalPages,
    setPage: fetchIdeas,
    refetch: () => fetchIdeas(currentPage),
    createNewIdea,
  };
}
