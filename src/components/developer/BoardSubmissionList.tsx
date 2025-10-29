// BoardSubmissionList - 게시판 제출 목록
import { AlertCircle, Loader2 } from 'lucide-react';
import BoardSubmissionCard from './BoardSubmissionCard';
import type { BoardSubmission } from '@/types/developer';

interface BoardSubmissionListProps {
  submissions: BoardSubmission[];
  loading: boolean;
  error: Error | null;
}

export default function BoardSubmissionList({
  submissions,
  loading,
  error,
}: BoardSubmissionListProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-sm text-gray-600">로딩 중...</span>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900 mb-1">
            제출 목록을 불러올 수 없습니다
          </p>
          <p className="text-xs text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-600 mb-2">
          아직 제출된 게시판이 없습니다
        </p>
        <p className="text-xs text-gray-500">
          크롤링할 게시판 URL을 제안해주세요
        </p>
      </div>
    );
  }

  // 제출 목록 표시
  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <BoardSubmissionCard key={submission.id} submission={submission} />
      ))}
    </div>
  );
}
