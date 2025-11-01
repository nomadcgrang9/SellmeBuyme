// IdeaCard - 아이디어 카드 컴포넌트
import { useState } from 'react';
import { User, Calendar, Trash2, Send } from 'lucide-react';
import { CommentSection } from './comments/CommentSection';
import CategoryBadge from './CategoryBadge';
import { linkifyText } from '@/lib/utils/linkify.tsx';
import type { DevIdea } from '@/types/developer';

interface IdeaCardProps {
  idea: DevIdea;
  onClick?: () => void;
  onSendToProject?: () => void;
  onDelete?: () => void;
}

export default function IdeaCard({
  idea,
  onClick,
  onSendToProject,
  onDelete,
}: IdeaCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
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
        console.error('Failed to delete idea:', error);
        alert('아이디어 삭제에 실패했습니다');
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* 카드 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {/* 카테고리 배지 */}
            <div className="mb-2">
              <CategoryBadge category={idea.category} />
            </div>

            {/* 내용 미리보기 */}
            <p className="text-sm text-gray-700 line-clamp-2 mb-2 break-words">
              {linkifyText(idea.content)}
            </p>
          </div>

          {/* 우측 상단 버튼 (프로젝트 보내기 + 삭제) */}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={onSendToProject}
              className="p-2 text-[#7aa3cc] hover:text-[#5a8ab0] hover:bg-blue-50 rounded-lg transition-colors"
              title="프로젝트로 보내기"
            >
              <Send className="w-4 h-4" />
            </button>
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
      </div>

      {/* 대표 이미지 */}
      {idea.images.length > 0 && (
        <div className="relative">
          <img
            src={idea.images[0]}
            alt="아이디어 이미지"
            className="w-full h-40 object-cover"
          />
          {idea.images.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              +{idea.images.length - 1}장
            </div>
          )}
        </div>
      )}

      {/* 메타데이터 */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{idea.authorName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatTimeAgo(idea.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <CommentSection targetType="idea" targetId={idea.id} />
      </div>
    </div>
  );
}
