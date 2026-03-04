// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 피드 쓰레드 카드 (Threads 스타일)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Heart, MessageCircle } from 'lucide-react';
import type { WagleThread, ReactionCounts } from '@/types/wagle';
import { WagleHashtagsDisplay } from './WagleHashtags';
import { formatRelativeTime } from './utils';

interface WagleThreadCardProps {
  thread: WagleThread;
  onClick: (thread: WagleThread) => void;
  onHashtagClick?: (tag: string) => void;
}

export default function WagleThreadCard({ thread, onClick, onHashtagClick }: WagleThreadCardProps) {
  const totalReactions = Object.values(thread.reaction_counts as ReactionCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <button
      onClick={() => onClick(thread)}
      className="w-full text-left px-4 py-3.5 hover:bg-gray-50/60 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
    >
      {/* 프로필 행: 아바타 + 이름 + 시간 (우측정렬) */}
      <div className="flex items-center gap-2.5 mb-2">
        {thread.author_profile_image ? (
          <img
            src={thread.author_profile_image}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
            {thread.author_name[0]}
          </div>
        )}
        <span className="text-[13px] font-bold text-gray-900 flex-1">{thread.author_name}</span>
        <span className="text-[11px] text-gray-400">{formatRelativeTime(thread.created_at)}</span>
      </div>

      {/* 본문 */}
      <p className="text-[13px] text-gray-700 leading-[1.6] line-clamp-3 mb-2 pl-[42px]">
        {thread.content}
      </p>

      {/* 해시태그 */}
      {thread.hashtags.length > 0 && (
        <div className="mb-2 pl-[42px]" onClick={(e) => e.stopPropagation()}>
          <WagleHashtagsDisplay hashtags={thread.hashtags} onHashtagClick={onHashtagClick} />
        </div>
      )}

      {/* 리액션 + 답글 - 작은 사이즈 */}
      <div className="flex items-center gap-3.5 pl-[42px] text-[11px] text-gray-400">
        {totalReactions > 0 && (
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {totalReactions}
          </span>
        )}
        {thread.reply_count > 0 && (
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {thread.reply_count}
          </span>
        )}
      </div>
    </button>
  );
}
