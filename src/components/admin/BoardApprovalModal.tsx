// BoardApprovalModal - 게시판 제출 승인/거부 모달
import { useState, useEffect } from 'react';
import { X, Check, Ban, MapPin, GraduationCap, ExternalLink } from 'lucide-react';
import type { DevBoardSubmission } from '@/types/developer';
import { getBoardSubmissions } from '@/lib/supabase/developer';
import { buildRegionDisplayName } from '@/lib/supabase/regions';
import { approveBoardSubmissionAndCreateCrawlBoard, rejectBoardSubmission } from '@/lib/supabase/developer';
import { supabase } from '@/lib/supabase/client';

interface BoardApprovalModalProps {
  submissionId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const SCHOOL_LEVEL_LABELS: Record<string, string> = {
  elementary: '초등',
  middle: '중등',
  high: '고등',
  mixed: '혼합/전체',
};

export default function BoardApprovalModal({
  submissionId,
  onSuccess,
  onCancel,
}: BoardApprovalModalProps) {
  const [submission, setSubmission] = useState<DevBoardSubmission | null>(null);
  const [regionDisplayName, setRegionDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[BoardApprovalModal] Received submissionId:', submissionId);

    async function loadSubmission() {
      try {
        const submissions = await getBoardSubmissions(100);
        console.log('[BoardApprovalModal] Loaded submissions:', submissions.length);
        const found = submissions.find(s => s.id === submissionId);
        console.log('[BoardApprovalModal] Found submission:', found);

        if (!found) {
          setError('제출을 찾을 수 없습니다');
          return;
        }

        setSubmission(found);

        // Build region display name
        if (found.regionCode) {
          const displayName = await buildRegionDisplayName(
            found.regionCode,
            found.subregionCode
          );
          setRegionDisplayName(displayName);
        }
      } catch (err) {
        console.error('Failed to load submission:', err);
        setError('제출 정보를 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    }

    loadSubmission();
  }, [submissionId]);

  const handleApprove = async () => {
    if (!submission) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Get current admin user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다');
      }

      console.log('[BoardApprovalModal] Calling approveBoardSubmissionAndCreateCrawlBoard with:', {
        submission,
        adminUserId: user.id
      });

      await approveBoardSubmissionAndCreateCrawlBoard(
        submission,
        undefined, // reviewComment
        user.id    // adminUserId
      );

      onSuccess();
    } catch (err) {
      console.error('Failed to approve submission:', err);
      setError(err instanceof Error ? err.message : '승인 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel} />
        <div className="relative bg-white rounded-lg p-8">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-600">제출 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onCancel} />
        <div className="relative bg-white rounded-lg p-8">
          <p className="text-red-600">{error || '제출을 찾을 수 없습니다'}</p>
          <button onClick={onCancel} className="mt-4 px-4 py-2 bg-slate-200 rounded">닫기</button>
        </div>
      </div>
    );
  }

  const schoolLevelLabel = submission.schoolLevel
    ? SCHOOL_LEVEL_LABELS[submission.schoolLevel] || submission.schoolLevel
    : '학교급 미상';

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
        <div className="sticky top-0 px-6 py-4 border-b flex items-center justify-between bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-slate-900">게시판 승인</h2>
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

        <div className="p-6 space-y-6">
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

          {/* Confirmation Message */}
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-800">
              ✅ 이 게시판을 승인하시겠습니까?
              <br />
              <span className="text-xs">
                승인 시 자동으로 크롤링 게시판 목록에 등록되며 크롤링이 시작됩니다.
              </span>
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
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? '승인 처리 중...' : '승인하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
