// IdeaCard - 아이디어 카드 컴포넌트
import { User, Calendar } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import type { DevIdea } from '@/types/developer';

interface IdeaCardProps {
  idea: DevIdea;
  onClick?: () => void;
}

export default function IdeaCard({ idea, onClick }: IdeaCardProps) {
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

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-[#a8c5e0] hover:shadow-sm transition-all cursor-pointer"
    >
      {/* 카테고리 배지 */}
      <div className="mb-2">
        <CategoryBadge category={idea.category} />
      </div>

      {/* 제목 */}
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {idea.title}
      </h3>

      {/* 내용 미리보기 */}
      <p className="text-sm text-gray-600 line-clamp-3 mb-3">
        {idea.content}
      </p>

      {/* 대표 이미지 */}
      {idea.images.length > 0 && (
        <div className="relative mb-3">
          <img
            src={idea.images[0]}
            alt={`${idea.title} - 대표 이미지`}
            className="w-full h-40 object-cover rounded-lg border border-gray-200"
          />
          {idea.images.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              +{idea.images.length - 1}장
            </div>
          )}
        </div>
      )}

      {/* 메타데이터 */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
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
  );
}
