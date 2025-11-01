import { useMemo, useState } from 'react';
import { ChevronDown, Loader2, MessageSquare } from 'lucide-react';
import type { CommentTargetType, DevComment } from '@/types/developer';
import { useComments } from '@/lib/hooks/useComments';
import { CommentForm } from './CommentForm';
import { CommentThread } from './CommentThread';

interface CommentSectionProps {
  targetType: CommentTargetType;
  targetId: string;
}

function countComments(list: DevComment[]): number {
  return list.reduce((acc, comment) => {
    const replies = comment.replies ? countComments(comment.replies) : 0;
    return acc + 1 + replies;
  }, 0);
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    comments,
    loading,
    authorName,
    setAuthorName,
    addComment,
    updateComment,
    deleteComment,
  } = useComments(targetType, targetId);

  const totalCount = useMemo(() => countComments(comments), [comments]);

  const handleAddComment = async (content: string, name: string) => {
    await addComment(content, name);
  };

  const handleReply = async (content: string, name: string, parentId: string) => {
    await addComment(content, name, parentId);
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:border-gray-300"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-500" />
          <span className="font-medium">댓글</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {totalCount}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="space-y-4">
          <CommentForm
            defaultAuthorName={authorName}
            onSubmit={handleAddComment}
            onSaveAuthorName={setAuthorName}
          />

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중...
            </div>
          ) : (
            <div className="space-y-3">
              {comments.length > 0 && (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      currentAuthorName={authorName}
                      depth={0}
                      onReply={handleReply}
                      onUpdate={updateComment}
                      onDelete={deleteComment}
                      onSaveAuthorName={setAuthorName}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
