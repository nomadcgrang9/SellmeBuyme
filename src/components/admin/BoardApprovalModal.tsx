// BoardApprovalModal - 게시판 제출 승인/거부 모달
import { useState } from 'react';
import { X, Check, Ban, MapPin, GraduationCap, ExternalLink } from 'lucide-react';
import type { DevBoardSubmission } from '@/types/developer';

interface BoardApprovalModalProps {
  submission: DevBoardSubmission;
  mode: 'approve' | 'reject';
  regionDisplayName: string;
  onConfirm: (reviewComment?: string) => Promise<void>;
  onCancel: () => void;
}

const SCHOOL_LEVEL_LABELS: Record<string, string> = {
  elementary: '초등',
  middle: '중등',
  high: '고등',
  mixed: '혼합/전체',
};

export default function BoardApprovalModal({
  submission,
  mode,
  regionDisplayName,
  onConfirm,
  onCancel,
}: BoardApprovalModalProps) {
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApproval = mode === 'approve';
  const schoolLevelLabel = submission.schoolLevel
    ? SCHOOL_LEVEL_LABELS[submission.schoolLevel] || submission.schoolLevel
    : '학교급 미상';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 거부 시 사유 필수
    if (!isApproval && !reviewComment.trim()) {
      setError('거부 사유를 입력해주세요');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(reviewComment.trim() || undefined);
    } catch (err) {
      console.error('Failed to process approval:', err);
      setError(
        err instanceof Error ? err.message : '처리 중 오류가 발생했습니다'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className={`sticky top-0 px-6 py-4 border-b flex items-center justify-between ${
            isApproval ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {isApproval ? (
              <Check className="w-6 h-6 text-green-600" />
            ) : (
              <Ban className="w-6 h-6 text-red-600" />
            )}
            <h2 className="text-xl font-semibold text-slate-900">
              {isApproval ? '게시판 승인' : '게시판 거부'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 text-slate-500 hover:text-slate-700 rounded-full hover:bg-white/50 transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Submission Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {submission.boardName}
              </h3>
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

            {/* Region & School Level */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                <MapPin className="w-4 h-4 text-slate-600" />
                <span className="font-medium">{regionDisplayName}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                <GraduationCap className="w-4 h-4 text-slate-600" />
                <span className="font-medium">{schoolLevelLabel}</span>
              </div>
            </div>

            {/* Description */}
            {submission.description && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">설명</p>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                  {submission.description}
                </p>
              </div>
            )}

            {/* Submitter Info */}
            <div className="flex items-center justify-between text-sm text-slate-500 pt-3 border-t border-slate-200">
              <span>제출자: {submission.submitterName}</span>
              <span>
                제출일: {new Date(submission.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          </div>

          {/* Review Comment */}
          <div>
            <label
              htmlFor="reviewComment"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              {isApproval ? '승인 메모 (선택)' : '거부 사유 (필수)'}
              {!isApproval && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id="reviewComment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={
                isApproval
                  ? '승인 관련 메모를 입력하세요 (선택사항)'
                  : '거부 사유를 상세히 입력해주세요'
              }
              rows={4}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              required={!isApproval}
            />
          </div>

          {/* Confirmation Message */}
          <div
            className={`p-4 rounded-lg ${
              isApproval
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p className={`text-sm font-medium ${isApproval ? 'text-green-800' : 'text-red-800'}`}>
              {isApproval ? (
                <>
                  ✅ 승인하시겠습니까?
                  <br />
                  <span className="text-xs">
                    승인 시 자동으로 크롤 게시판에 등록되며 크롤링이 시작됩니다.
                  </span>
                </>
              ) : (
                <>
                  ❌ 거부하시겠습니까?
                  <br />
                  <span className="text-xs">
                    거부 시 제출자에게 거부 사유가 표시됩니다.
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isApproval
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting
                ? '처리 중...'
                : isApproval
                ? '승인하기'
                : '거부하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
