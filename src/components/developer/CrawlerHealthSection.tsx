// CrawlerHealthSection - 크롤러 상태 점검 섹션
// Anti-Vibe Design: 담당자별 그룹 + 지역 칩 레이아웃
// 수동 점검은 GitHub Actions에서 직접 실행
import { useState, useMemo } from 'react';
import { RefreshCw, Clock, ExternalLink, ChevronDown, Play } from 'lucide-react';
import { useCrawlerHealth } from '@/lib/hooks/useCrawlerHealth';
import { CRAWLER_HEALTH_STATUS_CONFIG } from '@/types/developer';
import type { CrawlerHealthResult, CrawlerHealthStatus } from '@/types/developer';

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

// 상태 도트 컴포넌트 (단순화: 정상=녹색, 나머지=빨간색)
function StatusDot({ status }: { status: CrawlerHealthStatus }) {
  // 정상(healthy)만 녹색, 나머지(warning, critical, inactive, error)는 모두 빨간색
  const color = status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

// 지역 칩 컴포넌트 (체크박스 제거 - 간소화)
function RegionChip({
  result,
  isSelected,
  onSelect,
}: {
  result: CrawlerHealthResult;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm
        transition-all duration-150
        ${isSelected
          ? 'bg-gray-900 text-white'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-400'
        }
      `}
    >
      <StatusDot status={result.status} />
      <span>{result.regionName}</span>
    </button>
  );
}

// 상세 패널 컴포넌트
function DetailPanel({ result, onClose }: { result: CrawlerHealthResult; onClose: () => void }) {
  const config = CRAWLER_HEALTH_STATUS_CONFIG[result.status];
  const [showMissing, setShowMissing] = useState(false);

  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusDot status={result.status} />
          <span className="font-medium text-gray-900">{result.regionName}</span>
          <span className={`text-xs ${config.textColor}`}>{config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={result.boardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
            ×
          </button>
        </div>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500">원본</div>
          <div className="text-lg font-medium text-gray-900">{result.originalCount}건</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">DB</div>
          <div className="text-lg font-medium text-gray-900">{result.dbCount}건</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">매칭</div>
          <div className="text-lg font-medium text-emerald-600">{result.matchCount}건</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">최근 수집</div>
          <div className="text-lg font-medium text-gray-900">
            {result.daysSinceCrawl !== null ? `${result.daysSinceCrawl}일 전` : '-'}
          </div>
        </div>
      </div>

      {/* 수집률 바 (단색) */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">수집률</span>
          <span className="font-medium text-gray-700">{result.collectionRate.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full"
            style={{ width: `${Math.min(result.collectionRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 상태 사유 */}
      <div className="text-sm text-gray-600 mb-3">{result.statusReason}</div>

      {/* AI 코멘트 */}
      {result.aiComment && (
        <div className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3 mb-3">
          {result.aiComment}
        </div>
      )}

      {/* 누락 공고 */}
      {result.missingTitles && result.missingTitles.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowMissing(!showMissing)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showMissing ? 'rotate-180' : ''}`} />
            누락 {result.missingTitles.length}건
          </button>
          {showMissing && (
            <ul className="mt-2 space-y-1">
              {result.missingTitles.map((title, idx) => (
                <li key={idx} className="text-xs text-gray-600 pl-3 border-l border-gray-200">
                  {title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// 담당자 그룹 컴포넌트
function AssigneeGroup({
  assignee,
  results,
  selectedRegion,
  onSelectRegion,
}: {
  assignee: string;
  results: CrawlerHealthResult[];
  selectedRegion: string | null;
  onSelectRegion: (code: string | null) => void;
}) {
  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, healthy: 0, inactive: 0, error: 0 };
    results.forEach(r => counts[r.status]++);
    return counts;
  }, [results]);

  const selectedResult = results.find(r => r.regionCode === selectedRegion);

  return (
    <div className="mb-6">
      {/* 담당자 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{assignee}</span>
          <span className="text-sm text-gray-400">({results.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {/* 정상(healthy) 개수 */}
          {statusCounts.healthy > 0 && (
            <span className="text-emerald-600">{statusCounts.healthy} 정상</span>
          )}
          {/* 문제(warning, critical, error, inactive 합계) 개수 */}
          {(statusCounts.critical + statusCounts.warning + statusCounts.error + statusCounts.inactive) > 0 && (
            <span className="text-red-600">
              {statusCounts.critical + statusCounts.warning + statusCounts.error + statusCounts.inactive} 문제있음
            </span>
          )}
        </div>
      </div>

      {/* 지역 칩들 */}
      <div className="flex flex-wrap gap-2">
        {results.map(result => (
          <RegionChip
            key={result.regionCode}
            result={result}
            isSelected={selectedRegion === result.regionCode}
            onSelect={() => onSelectRegion(
              selectedRegion === result.regionCode ? null : result.regionCode
            )}
          />
        ))}
      </div>

      {/* 선택된 지역 상세 */}
      {selectedResult && (
        <DetailPanel
          result={selectedResult}
          onClose={() => onSelectRegion(null)}
        />
      )}
    </div>
  );
}

export default function CrawlerHealthSection() {
  const {
    results,
    loading,
    error,
    lastChecked,
    refreshResults,
    triggerManualCheck
  } = useCrawlerHealth();

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  // 담당자별 그룹화
  const groupedByAssignee = useMemo(() => {
    const groups: Record<string, CrawlerHealthResult[]> = {};

    results.forEach(result => {
      const assignee = result.assignee || '미지정';
      if (!groups[assignee]) groups[assignee] = [];
      groups[assignee].push(result);
    });

    // 긴급 상태가 많은 담당자 먼저
    return Object.entries(groups).sort(([, a], [, b]) => {
      const aCritical = a.filter(r => r.status === 'critical').length;
      const bCritical = b.filter(r => r.status === 'critical').length;
      return bCritical - aCritical;
    });
  }, [results]);

  // 수동 점검 핸들러
  const handleManualCheck = async () => {
    setIsTriggering(true);
    try {
      const result = await triggerManualCheck();
      alert(result.message);

      // 5분 후 자동 새로고침
      setTimeout(() => {
        refreshResults();
        setIsTriggering(false);
      }, 5 * 60 * 1000);
    } catch (err) {
      alert('점검 트리거 실패: ' + (err as Error).message);
      setIsTriggering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 컨트롤 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-gray-900">크롤러 상태</h3>
          {lastChecked && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(lastChecked)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshResults()}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="결과 새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleManualCheck}
            disabled={isTriggering}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className={`w-3.5 h-3.5 ${isTriggering ? 'animate-pulse' : ''}`} />
            {isTriggering ? '점검 중...' : '수동 점검'}
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error.message}
        </div>
      )}

      {/* 범례 (단순화) */}
      <div className="flex items-center gap-6 text-xs text-gray-500 border-b border-gray-100 pb-4">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />정상</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />문제있음</span>
      </div>

      {/* 담당자별 그룹 */}
      {groupedByAssignee.length > 0 ? (
        groupedByAssignee.map(([assignee, assigneeResults]) => (
          <AssigneeGroup
            key={assignee}
            assignee={assignee}
            results={assigneeResults}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
        ))
      ) : (
        !loading && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-1">점검 결과가 없습니다</p>
            <p className="text-sm">매일 오전 7시 자동 점검되며, 위의 "수동 점검" 버튼으로 즉시 실행할 수 있습니다.</p>
          </div>
        )
      )}

      {/* 안내 */}
      <p className="text-xs text-gray-400">
        매일 오전 7시 자동 점검됩니다. 수동 점검 시 약 5분 후 결과가 업데이트됩니다.
      </p>
    </div>
  );
}
