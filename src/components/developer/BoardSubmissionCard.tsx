// BoardSubmissionCard - 게시판 제출 카드
import { ExternalLink, MapPin, User, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';
import type { DevBoardSubmission } from '@/types/developer';

interface BoardSubmissionCardProps {
  submission: DevBoardSubmission;
}

// 상대 시간 표시 함수 (간단한 구현)
function getRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 30) return `${diffDays}일 전`;
  return past.toLocaleDateString('ko-KR');
}

export default function BoardSubmissionCard({
  submission,
}: BoardSubmissionCardProps) {
  const relativeTime = getRelativeTime(submission.createdAt);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header: 게시판 이름 & 상태 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900 text-sm flex-1">
          {submission.boardName}
        </h3>
        <StatusBadge status={submission.status} />
      </div>

      {/* 지역 (있으면) */}
      {submission.region && (
        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
          <MapPin className="w-3 h-3" />
          {submission.region}
        </div>
      )}

      {/* 설명 (있으면) */}
      {submission.description && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          {submission.description}
        </p>
      )}

      {/* URL 링크 */}
      <a
        href={submission.boardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-[#7aa3cc] hover:text-[#5a8ab0] mb-3"
      >
        <ExternalLink className="w-3 h-3" />
        게시판 바로가기
      </a>

      {/* Footer: 제출자 & 시간 */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {submission.submitterName}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {relativeTime}
        </div>
      </div>

      {/* 관리자 메모 (반려된 경우) */}
      {submission.status === 'rejected' && submission.adminReviewComment && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>반려 사유:</strong> {submission.adminReviewComment}
        </div>
      )}
    </div>
  );
}
