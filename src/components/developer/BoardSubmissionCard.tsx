// BoardSubmissionCard - 게시판 제출 카드
import { useState } from 'react';
import { ExternalLink, MapPin, User, Calendar, Trash2 } from 'lucide-react';
import { CommentSection } from './comments/CommentSection';
import StatusBadge from './StatusBadge';
import { linkifyText } from '@/lib/utils/linkify.tsx';
import type { DevBoardSubmission } from '@/types/developer';

interface BoardSubmissionCardProps {
  submission: DevBoardSubmission;
  onDelete?: () => void;
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
  onDelete,
}: BoardSubmissionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const relativeTime = getRelativeTime(submission.createdAt);

  const handleDelete = async () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setIsDeleting(true);
      try {
        await onDelete?.();
      } catch (error) {
        console.error('Failed to delete submission:', error);
        alert('게시판 제출 삭제에 실패했습니다');
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Header: 게시판 이름 & 상태 & 삭제 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-gray-900 text-sm flex-1">
            📌 {submission.boardName}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={submission.status} />
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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
          <p className="text-sm text-gray-700 line-clamp-2 break-words">
            {linkifyText(submission.description)}
          </p>
        )}
      </div>

      {/* URL 링크 */}
      <div className="px-4 pt-3 pb-2">
        <a
          href={submission.boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#7aa3cc] hover:text-[#5a8ab0]"
        >
          <ExternalLink className="w-3 h-3" />
          게시판 바로가기
        </a>
      </div>

      {/* Footer: 제출자 & 시간 */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {submission.submitterName}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {relativeTime}
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <CommentSection targetType="submission" targetId={submission.id} />
      </div>
    </div>
  );
}
