// CrawlerHealthCard - 크롤러 상태 카드 컴포넌트
import { useState } from 'react';
import { ExternalLink, Calendar, Database, AlertTriangle, CheckCircle, XCircle, MinusCircle, Globe, ChevronDown, ChevronUp, AlertOctagon } from 'lucide-react';
import type { CrawlerHealthResult, CrawlerHealthStatus } from '@/types/developer';
import { CRAWLER_HEALTH_STATUS_CONFIG } from '@/types/developer';

interface CrawlerHealthCardProps {
  result: CrawlerHealthResult;
}

const StatusIcon = ({ status }: { status: CrawlerHealthStatus }) => {
  const config = CRAWLER_HEALTH_STATUS_CONFIG[status];

  switch (status) {
    case 'healthy':
      return <CheckCircle className={`w-5 h-5 ${config.textColor}`} />;
    case 'warning':
      return <AlertTriangle className={`w-5 h-5 ${config.textColor}`} />;
    case 'critical':
      return <XCircle className={`w-5 h-5 ${config.textColor}`} />;
    case 'inactive':
      return <MinusCircle className={`w-5 h-5 ${config.textColor}`} />;
    case 'error':
      return <AlertOctagon className={`w-5 h-5 ${config.textColor}`} />;
  }
};

export default function CrawlerHealthCard({ result }: CrawlerHealthCardProps) {
  const config = CRAWLER_HEALTH_STATUS_CONFIG[result.status];
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '기록 없음';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon status={result.status} />
          <span className="font-semibold text-gray-900">{result.regionName}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <a
          href={result.boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">원본:</span>
          <span className="font-medium text-gray-900">{result.originalCount}건</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">DB:</span>
          <span className="font-medium text-gray-900">{result.dbCount}건</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">매칭:</span>
          <span className="font-medium text-green-600">{result.matchCount}건</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">최근:</span>
          <span className="font-medium text-gray-900">
            {result.daysSinceCrawl !== null ? `${result.daysSinceCrawl}일 전` : '-'}
          </span>
        </div>
      </div>

      {/* 수집률 바 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">주간 수집률</span>
          <span className={`font-medium ${config.textColor}`}>{result.collectionRate.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              result.status === 'healthy' ? 'bg-green-500' :
              result.status === 'warning' ? 'bg-yellow-500' :
              result.status === 'critical' ? 'bg-red-500' : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(result.collectionRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 상태 메시지 */}
      <div className={`text-sm ${config.textColor}`}>
        {result.statusReason}
      </div>

      {/* 담당자 */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <span className="text-xs text-gray-500">담당: </span>
        <span className="text-xs font-medium text-gray-700">{result.assignee}</span>
      </div>

      {/* AI 코멘트 (critical/warning만) */}
      {(result.status === 'critical' || result.status === 'warning') && result.aiComment && (
        <div className="mt-2 p-2 bg-white/50 rounded text-xs text-gray-600 italic">
          {result.aiComment}
        </div>
      )}

      {/* 누락된 공고 목록 (펼치기) */}
      {result.missingTitles && result.missingTitles.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            누락된 공고 {result.missingTitles.length}건
          </button>
          {showDetails && (
            <ul className="mt-2 space-y-1">
              {result.missingTitles.map((title, idx) => (
                <li key={idx} className="text-xs text-red-600 pl-3 border-l-2 border-red-300">
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
