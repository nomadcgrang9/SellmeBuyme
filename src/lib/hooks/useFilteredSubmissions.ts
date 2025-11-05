// useFilteredSubmissions - 필터링 및 페이지네이션 기능이 있는 게시판 제출 훅
import { useState, useEffect } from 'react';
import {
  getBoardSubmissions,
  createBoardSubmission,
  checkBoardUrlDuplicate,
  deleteBoardSubmission,
} from '../supabase/developer';
import type { DevBoardSubmission, BoardSubmissionFormData, SubmissionStatus } from '@/types/developer';

interface UseFilteredSubmissionsResult {
  submissions: DevBoardSubmission[];
  loading: boolean;
  error: Error | null;
  filter: SubmissionStatus | 'all';
  setFilter: (filter: SubmissionStatus | 'all') => void;
  page: number;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
  createNewSubmission: (data: BoardSubmissionFormData) => Promise<void>;
  deleteSubmissionItem: (id: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 3;

export function useFilteredSubmissions(): UseFilteredSubmissionsResult {
  const [allSubmissions, setAllSubmissions] = useState<DevBoardSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<SubmissionStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const fetchAllSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      // 최근 30개만 가져옴 (PWA 캐시 최적화)
      const data = await getBoardSubmissions(30, 0);
      setAllSubmissions(data);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  // 필터링된 제출
  const filteredSubmissions = filter === 'all'
    ? allSubmissions
    : allSubmissions.filter(sub => sub.status === filter);

  // 페이지네이션된 제출
  const startIndex = 0;
  const endIndex = page * ITEMS_PER_PAGE;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);
  const hasMore = endIndex < filteredSubmissions.length;

  const createNewSubmission = async (data: BoardSubmissionFormData) => {
    // URL 중복 체크
    const isDuplicate = await checkBoardUrlDuplicate(data.boardUrl);
    if (isDuplicate) {
      throw new Error('이미 등록된 URL입니다');
    }

    // 제출 생성
    const newSubmission = await createBoardSubmission(data);

    // 목록에 추가
    setAllSubmissions((prev) => [newSubmission, ...prev]);
  };

  const deleteSubmissionItem = async (id: string) => {
    try {
      await deleteBoardSubmission(id);
      setAllSubmissions((prev) => prev.filter(sub => sub.id !== id));
    } catch (err) {
      console.error('Failed to delete submission:', err);
      throw err;
    }
  };

  return {
    submissions: paginatedSubmissions,
    loading,
    error,
    filter,
    setFilter: (newFilter) => {
      setFilter(newFilter);
      setPage(1);
    },
    page,
    hasMore,
    loadMore: () => setPage(prev => prev + 1),
    refetch: fetchAllSubmissions,
    createNewSubmission,
    deleteSubmissionItem,
  };
}
