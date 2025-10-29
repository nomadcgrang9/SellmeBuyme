// useDeployments - GitHub 배포 목록 조회 훅
import { useState, useEffect } from 'react';
import { getRecentDeployments } from '../supabase/developer';
import type { GitHubDeployment } from '@/types/developer';

interface UseDeploymentsResult {
  deployments: GitHubDeployment[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 최근 배포 내역을 조회하는 커스텀 훅
 * @param limit - 조회할 배포 수 (기본: 2)
 * @returns 배포 목록, 로딩 상태, 에러, 새로고침 함수
 */
export function useDeployments(limit = 2): UseDeploymentsResult {
  const [deployments, setDeployments] = useState<GitHubDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentDeployments(limit);
      setDeployments(data);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, [limit]);

  return {
    deployments,
    loading,
    error,
    refetch: fetchDeployments,
  };
}
