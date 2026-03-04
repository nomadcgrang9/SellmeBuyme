// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 개별 답글 컴포넌트 (재귀, 3단계)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { WagleReply as WagleReplyType } from '@/types/wagle';
import { WagleReactionsInline } from './WagleReactions';
import { formatRelativeTime } from './utils';

interface WagleReplyProps {
  reply: WagleReplyType;
  onReplyTo: (parentId: string | null, depth: number, mentionUserId?: string, mentionUserName?: string) => void;
}

const COLLAPSE_THRESHOLD = 3;

export default function WagleReply({ reply, onReplyTo }: WagleReplyProps) {
  const [isExpanded, setIsExpanded] = useState(reply.children.length <= COLLAPSE_THRESHOLD);

  // 들여쓰기: depth 1 = pl-0, depth 2 = pl-6, depth 3 = pl-6 (동일)
  const paddingClass = reply.depth >= 2 ? 'pl-6' : 'pl-0';

  const handleReplyClick = () => {
    const nextDepth = Math.min(reply.depth + 1, 3);
    onReplyTo(
      reply.id,
      nextDepth,
      reply.author_id,
      reply.author_name
    );
  };

  const visibleChildren = isExpanded ? reply.children : reply.children.slice(0, COLLAPSE_THRESHOLD);
  const hiddenCount = reply.children.length - COLLAPSE_THRESHOLD;

  return (
    <div className={paddingClass}>
      <div className="relative flex gap-2 py-2">
        {/* 세로 연결선 */}
        {reply.children.length > 0 && (
          <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200" />
        )}

        {/* 아바타 */}
        {reply.author_profile_image ? (
          <img
            src={reply.author_profile_image}
            alt=""
            className="w-8 h-8 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 shrink-0">
            {reply.author_name[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* 작성자 + 시간 */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold text-gray-800">{reply.author_name}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{formatRelativeTime(reply.created_at)}</span>
          </div>

          {/* 멘션 + 본문 */}
          <div className="text-sm text-gray-800 leading-relaxed mb-1.5">
            {reply.mention_user_name && (
              <span className="text-blue-600 font-medium">@{reply.mention_user_name} </span>
            )}
            {reply.is_deleted ? (
              <span className="text-gray-400 italic">삭제된 답글입니다</span>
            ) : (
              reply.content
            )}
          </div>

          {/* 리액션 + 답글 버튼 */}
          {!reply.is_deleted && (
            <div className="flex items-center gap-4">
              <WagleReactionsInline
                targetType="reply"
                targetId={reply.id}
                reactionCounts={reply.reaction_counts}
                myReaction={reply.my_reaction}
              />
              <button
                onClick={handleReplyClick}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <MessageCircle size={14} />
                답글{reply.children.length > 0 ? ` ${reply.children.length}` : ''}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 자식 답글 (재귀) */}
      {reply.children.length > 0 && (
        <div className="ml-4">
          {visibleChildren.map((child) => (
            <WagleReply key={child.id} reply={child} onReplyTo={onReplyTo} />
          ))}

          {/* 더보기/접기 */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 py-2 text-sm text-gray-500 font-medium hover:text-gray-700"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={14} />
                  접기
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  답글 {hiddenCount}개 더보기
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
