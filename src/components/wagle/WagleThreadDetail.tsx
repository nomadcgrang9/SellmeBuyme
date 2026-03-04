// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 쓰레드 상세 (Threads 스타일)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { WagleThread, WagleReply as WagleReplyType } from '@/types/wagle';
import { WagleHashtagsDisplay } from './WagleHashtags';
import { WagleReactionsDetail } from './WagleReactions';
import WagleReply from './WagleReply';
import { formatRelativeTime } from './utils';

interface WagleThreadDetailProps {
  thread: WagleThread;
  replies: WagleReplyType[];
  isLoading: boolean;
  onReplyTo: (parentId: string | null, depth: number, mentionUserId?: string, mentionUserName?: string) => void;
  onHashtagClick?: (tag: string) => void;
}

export default function WagleThreadDetail({
  thread,
  replies,
  isLoading,
  onReplyTo,
  onHashtagClick,
}: WagleThreadDetailProps) {
  return (
    <div>
      {/* 원글 */}
      <div className="px-4 pt-4 pb-3">
        {/* 프로필 + 시간 */}
        <div className="flex items-center gap-2.5 mb-3">
          {thread.author_profile_image ? (
            <img
              src={thread.author_profile_image}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500">
              {thread.author_name[0]}
            </div>
          )}
          <div className="flex-1">
            <span className="text-sm font-bold text-gray-900">{thread.author_name}</span>
          </div>
          <span className="text-xs text-gray-400">{formatRelativeTime(thread.created_at)}</span>
        </div>

        {/* 본문 */}
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap mb-3">
          {thread.content}
        </p>

        {/* 해시태그 */}
        {thread.hashtags.length > 0 && (
          <div className="mb-3">
            <WagleHashtagsDisplay hashtags={thread.hashtags} onHashtagClick={onHashtagClick} />
          </div>
        )}

        {/* 리액션 */}
        <WagleReactionsDetail
          targetType="thread"
          targetId={thread.id}
          reactionCounts={thread.reaction_counts}
          myReaction={thread.my_reaction}
        />
      </div>

      {/* 답글 헤더 */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <span className="text-[13px] font-semibold text-gray-800">
          답글 {thread.reply_count}개
        </span>
      </div>

      {/* 답글 트리 */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-gray-400">
            첫 답글을 작성해보세요
          </div>
        ) : (
          <div className="space-y-0.5">
            {replies.map((reply) => (
              <WagleReply key={reply.id} reply={reply} onReplyTo={onReplyTo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
