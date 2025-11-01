// BoardSubmissionList - 관리자용 게시판 제출 목록
import { useEffect, useState } from 'react';
import { Check, X, ExternalLink, MapPin, GraduationCap, Clock } from 'lucide-react';
import { getBoardSubmissions } from '@/lib/supabase/developer';
import { buildRegionDisplayName } from '@/lib/supabase/regions';
import type { DevBoardSubmission } from '@/types/developer';

interface BoardSubmissionListProps {
  onApprove: (submissionId: string) => void;
  onReject?: (submissionId: string) => void;
  refreshToken?: number;
}

const SCHOOL_LEVEL_LABELS: Record<string, string> = {
  elementary: '초등',
  middle: '중등',
  high: '고등',
  mixed: '혼합/전체',
};

const STATUS_CONFIG = {
  pending: { label: '대기', colorClass: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: '승인', colorClass: 'bg-green-100 text-green-800', icon: Check },
  rejected: { label: '거부', colorClass: 'bg-red-100 text-red-800', icon: X },
};

export default function BoardSubmissionList({
  onApprove,
  onReject,
  refreshToken,
}: BoardSubmissionListProps) {
  const [submissions, setSubmissions] = useState<DevBoardSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regionNames, setRegionNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    async function loadSubmissions() {
      try {
        setLoading(true);
        const data = await getBoardSubmissions(50, 0, true); // filterPending=true: 승인되지 않은 것만
        setSubmissions(data);

        // Build region display names
        const names = new Map<string, string>();
        for (const submission of data) {
          if (submission.regionCode) {
            const displayName = await buildRegionDisplayName(
              submission.regionCode,
              submission.subregionCode
            );
            names.set(submission.id, displayName);
          }
        }
        setRegionNames(names);
      } catch (err) {
        console.error('Failed to load submissions:', err);
        setError('게시판 제출 목록을 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    }

    loadSubmissions();
  }, [refreshToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-600">제출 목록 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-slate-600">제출된 게시판이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          게시판 제출 목록 ({submissions.length})
        </h3>
      </div>

      <div className="space-y-3">
        {submissions.map((submission) => {
          const status = STATUS_CONFIG[submission.status];
          const StatusIcon = status.icon;
          const regionName = regionNames.get(submission.id) || '지역 미상';
          const schoolLevelLabel = submission.schoolLevel
            ? SCHOOL_LEVEL_LABELS[submission.schoolLevel] || submission.schoolLevel
            : '학교급 미상';

          return (
            <div
              key={submission.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900 mb-1">
                    {submission.boardName}
                  </h4>
                  <a
                    href={submission.boardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {submission.boardUrl}
                  </a>
                </div>

                {/* Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.colorClass}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>
              </div>

              {/* Region & School Level Info */}
              <div className="flex flex-wrap gap-4 mb-3 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{regionName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  <span>{schoolLevelLabel}</span>
                </div>
              </div>

              {/* Description */}
              {submission.description && (
                <p className="text-sm text-slate-600 mb-3 bg-slate-50 p-3 rounded">
                  {submission.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100">
                <span>제출자: {submission.submitterName}</span>
                <span>
                  제출일: {new Date(submission.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>

              {/* Actions (for pending submissions) */}
              {submission.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      console.log('[BoardSubmissionList] AI Crawler Generation clicked for submission:', submission);
                      console.log('[BoardSubmissionList] Submission ID:', submission.id);
                      console.log('[BoardSubmissionList] Board URL:', submission.boardUrl);
                      console.log('[BoardSubmissionList] Board Name:', submission.boardName);
                      onApprove(submission.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    AI 크롤러 생성
                  </button>
                  {onReject && (
                    <button
                      onClick={() => onReject(submission.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      거부
                    </button>
                  )}
                </div>
              )}

              {/* Review Comment (if has comment) */}
              {submission.adminReviewComment && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  <strong>검토 의견:</strong> {submission.adminReviewComment}
                </div>
              )}

              {/* Approval Info (if approved) - crawl_boards.approved_at 기준 */}
              {submission.approvedAt && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  <strong>승인됨:</strong>{' '}
                  {new Date(submission.approvedAt).toLocaleString('ko-KR')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
