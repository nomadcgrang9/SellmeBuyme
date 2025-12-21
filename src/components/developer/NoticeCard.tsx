// NoticeCard - 공지사항 카드 컴포넌트 (인라인 펼침 방식)
import { useState } from 'react';
import { User, Calendar, Trash2, Edit2, Pin, Megaphone, Bell, Gift, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { CommentSection } from './comments/CommentSection';
import { linkifyText } from '@/lib/utils/linkify.tsx';
import type { DevNotice, NoticeCategory } from '@/types/developer';

interface NoticeCardProps {
  notice: DevNotice;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
}

const NOTICE_CATEGORY_ICONS: Record<NoticeCategory, React.ReactNode> = {
  notice: <Megaphone className="w-3.5 h-3.5" />,
  update: <Bell className="w-3.5 h-3.5" />,
  event: <Gift className="w-3.5 h-3.5" />,
  important: <AlertTriangle className="w-3.5 h-3.5" />,
};

const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  notice: '공지',
  update: '업데이트',
  event: '이벤트',
  important: '중요',
};

const NOTICE_CATEGORY_COLORS: Record<NoticeCategory, string> = {
  notice: 'bg-blue-100 text-blue-700',
  update: 'bg-green-100 text-green-700',
  event: 'bg-purple-100 text-purple-700',
  important: 'bg-red-100 text-red-700',
};

export default function NoticeCard({
  notice,
  onEdit,
  onDelete,
  onTogglePin,
}: NoticeCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 시간 포맷팅
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = async () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setIsDeleting(true);
      try {
        await onDelete?.();
      } catch (error) {
        console.error('Failed to delete notice:', error);
        alert('공지사항 삭제에 실패했습니다');
        setIsDeleting(false);
      }
    }
  };

  // 내용이 2줄 이상인지 체크 (대략 100자 기준)
  const isLongContent = notice.content.length > 100;

  return (
    <div className={`bg-white rounded-lg border overflow-hidden transition-shadow ${
      notice.isPinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-200'
    }`}>
      {/* 카드 헤더 */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* 카테고리 배지와 고정 표시 */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${NOTICE_CATEGORY_COLORS[notice.category]}`}>
                {NOTICE_CATEGORY_ICONS[notice.category]}
                {NOTICE_CATEGORY_LABELS[notice.category]}
              </span>
              {notice.isPinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <Pin className="w-3 h-3" />
                  고정
                </span>
              )}
            </div>

            {/* 제목 */}
            <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
              {notice.title}
            </h3>

            {/* 내용 미리보기 (접힌 상태) */}
            {!isExpanded && (
              <p className="text-sm text-gray-700 line-clamp-2 break-words">
                {linkifyText(notice.content)}
              </p>
            )}
          </div>

          {/* 우측 상단 버튼 */}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.();
              }}
              className={`p-2 rounded-lg transition-colors ${
                notice.isPinned
                  ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                  : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
              }`}
              title={notice.isPinned ? '고정 해제' : '고정하기'}
            >
              <Pin className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="수정"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 메타데이터 + 펼침 버튼 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{notice.authorName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatTimeAgo(notice.createdAt)}</span>
            </div>
          </div>

          {/* 펼침/접기 버튼 */}
          {isLongContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? '접기' : '펼치기'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 펼쳐진 전체 내용 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
          <div className="pt-4">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed break-words">
                {linkifyText(notice.content)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 섹션 */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <CommentSection targetType="notice" targetId={notice.id} />
      </div>
    </div>
  );
}
