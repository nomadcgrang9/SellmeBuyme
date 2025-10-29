// useBoardSubmissions - 게시판 제출 관리 훅
import { useState, useEffect } from 'react';
import {
  getBoardSubmissions,
  createBoardSubmission,
  checkBoardUrlDuplicate,
} from '../supabase/developer';
import type { DevBoardSubmission, BoardSubmissionFormData } from '@/types/developer';

interface UseBoardSubmissionsResult {
  submissions: DevBoardSubmission[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createNewSubmission: (data: BoardSubmissionFormData) => Promise<void>;
}

/**
 * 게시판 제출 목록을 조회하고 관리하는 커스텀 훅
 * @param limit - 조회할 제출 수 (기본: 20)
 * @returns 제출 목록, 로딩 상태, 에러, 새로고침 함수, 생성 함수
 */
export function useBoardSubmissions(
  limit = 20
): UseBoardSubmissionsResult {
  const [submissions, setSubmissions] = useState<DevBoardSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBoardSubmissions(limit);
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to fetch board submissions:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSubmission = async (data: BoardSubmissionFormData) => {
    // URL 중복 체크
    const isDuplicate = await checkBoardUrlDuplicate(data.boardUrl);
    if (isDuplicate) {
      throw new Error('이미 등록된 URL입니다');
    }

    // 제출 생성
    const newSubmission = await createBoardSubmission(data);

    // 목록에 추가 (맨 앞에)
    setSubmissions((prev) => [newSubmission, ...prev]);
  };

  useEffect(() => {
    fetchSubmissions();
  }, [limit]);

  return {
    submissions,
    loading,
    error,
    refetch: fetchSubmissions,
    createNewSubmission,
  };
}
