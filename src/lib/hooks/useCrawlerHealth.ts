// useCrawlerHealth - 크롤러 상태 점검 훅
// 두 가지 방식:
// 1. 저장된 결과 조회 (crawler_health_results 테이블)
// 2. 수동 점검 트리거 (GitHub Actions 또는 로컬 Worker)

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabase/client';
import type { CrawlerHealthResult, CrawlerHealthStatus, CrawlerHealthSummary } from '@/types/developer';
import { REGION_BOARDS } from '@/types/developer';

interface UseCrawlerHealthResult {
  results: CrawlerHealthResult[];
  summary: CrawlerHealthSummary | null;
  loading: boolean;
  error: Error | null;
  lastChecked: string | null;
  checkHealth: () => Promise<void>;
  triggerManualCheck: (regionCodes?: string[]) => Promise<{ triggered: boolean; message: string }>;
  refreshResults: () => Promise<void>;
}

export function useCrawlerHealth(): UseCrawlerHealthResult {
  const [results, setResults] = useState<CrawlerHealthResult[]>([]);
  const [summary, setSummary] = useState<CrawlerHealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  // DB에 저장된 결과 조회
  const refreshResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[useCrawlerHealth] Fetching stored results from DB...');

      const { data, error: dbError } = await supabase
        .from('crawler_health_results')
        .select('*')
        .order('region_code');

      if (dbError) {
        throw new Error(`DB 조회 실패: ${dbError.message}`);
      }

      if (!data || data.length === 0) {
        console.log('[useCrawlerHealth] No stored results found');
        setResults([]);
        setSummary(null);
        setLastChecked(null);
        setLoading(false);
        return;
      }

      // DB 데이터를 CrawlerHealthResult 형식으로 변환
      const mappedResults: CrawlerHealthResult[] = data.map((row: any) => ({
        regionCode: row.region_code,
        regionName: row.region_name || REGION_BOARDS[row.region_code]?.name || row.region_code,
        assignee: REGION_BOARDS[row.region_code]?.assignee || '',
        boardUrl: row.board_url || REGION_BOARDS[row.region_code]?.boardUrl || '',
        originalCount: row.original_count || 0,
        originalTitles: typeof row.original_titles === 'string'
          ? JSON.parse(row.original_titles)
          : (row.original_titles || []),
        dbCount: row.db_count || 0,
        latestCrawlDate: row.latest_crawl_date,
        daysSinceCrawl: row.days_since_crawl,
        matchCount: row.match_count || 0,
        missingCount: row.missing_count || 0,
        collectionRate: row.collection_rate || 0,
        missingTitles: typeof row.missing_titles === 'string'
          ? JSON.parse(row.missing_titles)
          : (row.missing_titles || []),
        status: row.health_status as CrawlerHealthStatus || 'error',
        statusReason: row.status_reason || '',
        aiComment: row.ai_comment || '',
        checkedAt: row.checked_at || row.updated_at,
      }));

      setResults(mappedResults);

      // Summary 계산
      const summaryData: CrawlerHealthSummary = {
        critical: mappedResults.filter(r => r.status === 'critical').length,
        warning: mappedResults.filter(r => r.status === 'warning').length,
        healthy: mappedResults.filter(r => r.status === 'healthy').length,
        inactive: mappedResults.filter(r => r.status === 'inactive').length,
        error: mappedResults.filter(r => r.status === 'error').length,
        total: mappedResults.length,
      };
      setSummary(summaryData);

      // 가장 최근 점검 시간
      const latestCheck = data.reduce((latest: string | null, row: any) => {
        const checkedAt = row.checked_at || row.updated_at;
        if (!latest) return checkedAt;
        if (!checkedAt) return latest;
        return new Date(checkedAt) > new Date(latest) ? checkedAt : latest;
      }, null);
      setLastChecked(latestCheck);

      console.log('[useCrawlerHealth] Loaded', mappedResults.length, 'results');

    } catch (err) {
      console.error('[useCrawlerHealth] Failed to fetch results:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 수동 점검 트리거 (GitHub Actions 또는 로컬 Worker)
  const triggerManualCheck = useCallback(async (regionCodes?: string[]): Promise<{ triggered: boolean; message: string }> => {
    try {
      console.log('[useCrawlerHealth] Triggering manual health check...', regionCodes ? `regions: ${regionCodes.join(', ')}` : 'all regions');

      const { data, error: funcError } = await supabase.functions.invoke(
        'trigger-health-check-job',
        {
          body: { mode: 'trigger', regionCodes }
        }
      );

      if (funcError) {
        throw new Error(`트리거 실패: ${funcError.message}`);
      }

      console.log('[useCrawlerHealth] Trigger response:', data);

      if (data.triggered) {
        return {
          triggered: true,
          message: 'GitHub Actions 워크플로우가 시작되었습니다. 약 5분 후 결과가 업데이트됩니다.'
        };
      } else if (data.fallback) {
        return {
          triggered: false,
          message: `${data.jobIds?.length || 0}개 Job이 생성되었습니다. 로컬에서 Worker를 실행해주세요: npm run crawler:health-worker`
        };
      }

      return {
        triggered: false,
        message: data.message || '알 수 없는 응답'
      };

    } catch (err) {
      console.error('[useCrawlerHealth] Trigger failed:', err);
      throw err;
    }
  }, []);

  // 초기 로딩: 저장된 결과 조회
  const checkHealth = useCallback(async () => {
    await refreshResults();
  }, [refreshResults]);

  // 컴포넌트 마운트 시 자동 로딩
  useEffect(() => {
    refreshResults();
  }, [refreshResults]);

  return {
    results,
    summary,
    loading,
    error,
    lastChecked,
    checkHealth,
    triggerManualCheck,
    refreshResults,
  };
}
