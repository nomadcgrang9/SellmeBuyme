// CrawlerHealthSection - 크롤러 상태 점검 섹션
// 저장된 결과 표시 + 수동 점검 트리거
import { useState } from 'react';
import { RefreshCw, Activity, CheckCircle, AlertTriangle, XCircle, MinusCircle, AlertOctagon, Clock, Play } from 'lucide-react';
import { useCrawlerHealth } from '@/lib/hooks/useCrawlerHealth';
import CrawlerHealthCard from './CrawlerHealthCard';
import { CRAWLER_HEALTH_STATUS_CONFIG } from '@/types/developer';

type FilterType = 'all' | 'critical' | 'warning' | 'healthy' | 'inactive' | 'error';

// 상대 시간 포맷
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${diffDays}일 전`;
}

export default function CrawlerHealthSection() {
  const {
    results,
    summary,
    loading,
    error,
    lastChecked,
    triggerManualCheck,
    refreshResults
  } = useCrawlerHealth();

  const [filter, setFilter] = useState<FilterType>('all');
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  // 수동 점검 트리거
  const handleTriggerCheck = async () => {
    setTriggerLoading(true);
    setTriggerMessage(null);

    try {
      const result = await triggerManualCheck();
      setTriggerMessage(result.message);

      // 5초 후 결과 새로고침 (GitHub Actions가 바로 실행되지 않으므로 안내만)
      if (result.triggered) {
        setTimeout(() => {
          setTriggerMessage('결과 업데이트 중...');
          refreshResults().then(() => {
            setTriggerMessage(null);
          });
        }, 10000);
      }
    } catch (err) {
      setTriggerMessage(`오류: ${(err as Error).message}`);
    } finally {
      setTriggerLoading(false);
    }
  };

  // 결과 새로고침
  const handleRefresh = async () => {
    await refreshResults();
  };

  // 필터링된 결과
  const filteredResults = results.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-4">
      {/* 점검 컨트롤 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">크롤러 상태 자동 점검</span>
          </div>
          {lastChecked && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>마지막 점검: {formatRelativeTime(lastChecked)}</span>
            </div>
          )}
        </div>

        {/* 버튼 그룹 */}
        <div className="flex gap-2">
          {/* 결과 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              loading
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '로딩 중...' : '결과 새로고침'}
          </button>

          {/* 수동 점검 트리거 버튼 */}
          <button
            onClick={handleTriggerCheck}
            disabled={triggerLoading}
            className={`flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              triggerLoading
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Play className={`w-5 h-5 ${triggerLoading ? 'animate-pulse' : ''}`} />
            {triggerLoading ? '트리거 중...' : '전체 지역 점검'}
          </button>
        </div>

        {/* 트리거 메시지 */}
        {triggerMessage && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {triggerMessage}
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            오류: {error.message}
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="mt-3 text-xs text-gray-500">
          💡 매일 오전 7시에 자동 점검됩니다. 수동 점검은 GitHub Actions 또는 로컬 Worker를 통해 실행됩니다.
        </div>
      </div>

      {/* 결과 요약 */}
      {summary && summary.total > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">점검 결과 요약</h4>
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'critical' ? 'ring-2 ring-red-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.critical.bgColor}`}
            >
              <XCircle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.critical.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.critical.textColor}`}>
                {summary.critical}
              </div>
              <div className="text-xs text-gray-600">긴급</div>
            </button>

            <button
              onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'warning' ? 'ring-2 ring-yellow-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.warning.bgColor}`}
            >
              <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.warning.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.warning.textColor}`}>
                {summary.warning}
              </div>
              <div className="text-xs text-gray-600">주의</div>
            </button>

            <button
              onClick={() => setFilter(filter === 'healthy' ? 'all' : 'healthy')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'healthy' ? 'ring-2 ring-green-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.healthy.bgColor}`}
            >
              <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.healthy.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.healthy.textColor}`}>
                {summary.healthy}
              </div>
              <div className="text-xs text-gray-600">정상</div>
            </button>

            <button
              onClick={() => setFilter(filter === 'inactive' ? 'all' : 'inactive')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'inactive' ? 'ring-2 ring-gray-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.inactive.bgColor}`}
            >
              <MinusCircle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.inactive.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.inactive.textColor}`}>
                {summary.inactive}
              </div>
              <div className="text-xs text-gray-600">비활성</div>
            </button>

            <button
              onClick={() => setFilter(filter === 'error' ? 'all' : 'error')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'error' ? 'ring-2 ring-orange-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.error.bgColor}`}
            >
              <AlertOctagon className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.error.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.error.textColor}`}>
                {summary.error || 0}
              </div>
              <div className="text-xs text-gray-600">오류</div>
            </button>
          </div>

          {/* 필터 상태 표시 */}
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg"
            >
              전체 보기 ({summary.total}개)
            </button>
          )}
        </div>
      )}

      {/* 결과 카드 목록 */}
      {filteredResults.length > 0 && (
        <div className="space-y-3">
          {filteredResults.map(result => (
            <CrawlerHealthCard key={result.regionCode} result={result} />
          ))}
        </div>
      )}

      {/* 결과 없음 안내 */}
      {!loading && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="mb-2">아직 점검 결과가 없습니다</p>
          <p className="text-sm">
            '전체 지역 점검' 버튼을 클릭하거나<br />
            매일 오전 7시 자동 점검을 기다려주세요
          </p>
        </div>
      )}
    </div>
  );
}
