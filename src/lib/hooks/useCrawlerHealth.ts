// useCrawlerHealth - 크롤러 상태 점검 훅
// Edge Function을 통해 원본 사이트 접속 + Gemini 분석 + DB 비교
import { useState, useCallback } from 'react';
import { supabase } from '../supabase/client';
import type { CrawlerHealthResult, CrawlerHealthStatus, CrawlerHealthSummary } from '@/types/developer';
import { REGION_BOARDS } from '@/types/developer';

interface UseCrawlerHealthResult {
  results: CrawlerHealthResult[];
  summary: CrawlerHealthSummary | null;
  loading: boolean;
  error: Error | null;
  progress: { current: number; total: number };
  checkHealth: (regionCodes?: string[]) => Promise<void>;
  checkSingleRegion: (regionCode: string) => Promise<CrawlerHealthResult | null>;
}

export function useCrawlerHealth(): UseCrawlerHealthResult {
  const [results, setResults] = useState<CrawlerHealthResult[]>([]);
  const [summary, setSummary] = useState<CrawlerHealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // 단일 지역 점검 (Edge Function 호출)
  const checkSingleRegion = useCallback(async (regionCode: string): Promise<CrawlerHealthResult | null> => {
    const regionConfig = REGION_BOARDS[regionCode];
    if (!regionConfig) {
      console.error(`Unknown region: ${regionCode}`);
      return null;
    }

    try {
      console.log(`[useCrawlerHealth] ${regionConfig.name} 점검 시작...`);

      // Edge Function 호출
      const { data, error: funcError } = await supabase.functions.invoke('crawler-health-check', {
        body: {
          regionCode,
          regionConfig: {
            code: regionConfig.code,
            name: regionConfig.name,
            boardUrl: regionConfig.boardUrl,
            active: regionConfig.active,
            assignee: regionConfig.assignee,
          }
        }
      });

      if (funcError) {
        console.error(`[useCrawlerHealth] Edge Function 에러:`, funcError);
        throw funcError;
      }

      console.log(`[useCrawlerHealth] ${regionConfig.name} 점검 완료:`, data?.status);
      return data as CrawlerHealthResult;

    } catch (err) {
      console.error(`[useCrawlerHealth] ${regionCode} 점검 실패:`, err);

      // 에러 발생 시 에러 상태로 반환
      return {
        regionCode: regionConfig.code,
        regionName: regionConfig.name,
        assignee: regionConfig.assignee,
        boardUrl: regionConfig.boardUrl,
        originalCount: 0,
        originalTitles: [],
        dbCount: 0,
        latestCrawlDate: null,
        daysSinceCrawl: null,
        matchCount: 0,
        missingCount: 0,
        collectionRate: 0,
        missingTitles: [],
        status: 'critical' as CrawlerHealthStatus,
        statusReason: '점검 실패',
        aiComment: `${regionConfig.name} 지역 점검 중 오류가 발생했습니다: ${(err as Error).message}`,
        checkedAt: new Date().toISOString(),
      };
    }
  }, []);

  // 전체 또는 선택 지역 점검
  const checkHealth = useCallback(async (regionCodes?: string[]) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSummary(null);

    const codes = regionCodes || Object.keys(REGION_BOARDS);
    setProgress({ current: 0, total: codes.length });

    try {
      // Step 1: Create jobs via Edge Function
      console.log('[useCrawlerHealth] Creating health check jobs for regions:', codes);

      const { data: triggerData, error: triggerError } = await supabase.functions.invoke(
        'trigger-health-check-job',
        {
          body: { regionCodes: codes }
        }
      );

      if (triggerError) {
        console.error('[useCrawlerHealth] Failed to trigger jobs:', triggerError);
        throw triggerError;
      }

      const jobIds = triggerData.jobIds;
      console.log('[useCrawlerHealth] Created', jobIds.length, 'jobs');

      // Step 2: Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const { data: statusData, error: statusError } = await supabase.functions.invoke(
            'get-health-check-status',
            {
              body: { jobIds }
            }
          );

          if (statusError) {
            console.error('[useCrawlerHealth] Status polling error:', statusError);
            return;
          }

          const jobs = statusData.jobs;

          // Map jobs to results
          const completedResults = jobs
            .filter((job: any) => job.status === 'completed' || job.status === 'failed')
            .map((job: any) => ({
              regionCode: job.region_code,
              regionName: REGION_BOARDS[job.region_code]?.name || job.region_code,
              assignee: REGION_BOARDS[job.region_code]?.assignee || '',
              boardUrl: REGION_BOARDS[job.region_code]?.boardUrl || '',
              originalCount: job.original_count || 0,
              originalTitles: job.original_titles ? JSON.parse(job.original_titles) : [],
              dbCount: job.db_count || 0,
              latestCrawlDate: job.latest_crawl_date,
              daysSinceCrawl: job.days_since_crawl,
              matchCount: job.match_count || 0,
              missingCount: job.missing_count || 0,
              collectionRate: job.collection_rate || 0,
              missingTitles: job.missing_titles ? JSON.parse(job.missing_titles) : [],
              status: job.health_status || (job.status === 'failed' ? 'error' : 'healthy'),
              statusReason: job.status_reason || (job.status === 'failed' ? '점검 실패' : '정상'),
              aiComment: job.ai_comment || (job.status === 'failed' ? `점검 중 오류 발생: ${job.error_message}` : '점검 완료'),
              checkedAt: job.completed_at || job.updated_at,
            }));

          // Update results
          setResults(completedResults);
          setProgress({ current: completedResults.length, total: codes.length });

          // Calculate summary
          const summaryData: CrawlerHealthSummary = {
            critical: completedResults.filter(r => r.status === 'critical').length,
            warning: completedResults.filter(r => r.status === 'warning').length,
            healthy: completedResults.filter(r => r.status === 'healthy').length,
            inactive: completedResults.filter(r => r.status === 'inactive').length,
            error: completedResults.filter(r => r.status === 'error').length,
            total: completedResults.length,
          };
          setSummary(summaryData);

          // Check if all jobs are done
          const allDone = jobs.every((job: any) =>
            job.status === 'completed' || job.status === 'failed'
          );

          if (allDone) {
            console.log('[useCrawlerHealth] All jobs completed');
            clearInterval(pollInterval);
            setLoading(false);
          }
        } catch (pollError) {
          console.error('[useCrawlerHealth] Polling error:', pollError);
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setLoading(false);
        console.warn('[useCrawlerHealth] Polling timeout after 5 minutes');
      }, 300000);

    } catch (err) {
      console.error('[useCrawlerHealth] 전체 점검 실패:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  return {
    results,
    summary,
    loading,
    error,
    progress,
    checkHealth,
    checkSingleRegion,
  };
}
