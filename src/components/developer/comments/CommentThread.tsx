import { useState } from 'react';
import { MessageSquare, Pencil, Trash2, ChevronDown } from 'lucide-react';
import type { DevComment } from '@/types/developer';
import { CommentForm } from './CommentForm';
import { linkifyText } from '@/lib/utils/linkify.tsx';

interface CommentThreadProps {
  comment: DevComment;
  currentAuthorName: string;
  depth: number;
  onReply: (content: string, authorName: string, parentId: string) => Promise<void>;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onSaveAuthorName: (name: string) => void;
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) return '방금 전';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}일 전`;

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

export function CommentThread({
  comment,
  currentAuthorName,
  depth,
  onReply,
  onUpdate,
  onDelete,
  onSaveAuthorName,
}: CommentThreadProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [areRepliesVisible, setAreRepliesVisible] = useState(true);

  const formattedTime = formatTimeAgo(comment.createdAt);
  const hasReplies = comment.replies && comment.replies.length > 0;
  const replyCount = comment.replies?.length ?? 0;
  const maxDepth = 8; // 최대 깊이 제한
  const canReply = depth < maxDepth;

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) return;

    await onUpdate(comment.id, trimmed);
    setIsEditing(false);
  };

  // 깊이별 좌측 여백과 선 색상
  const depthColors = [
    '#7aa3cc',
    '#a8c5e0',
    '#c5dce8',
    '#d9e8f0',
    '#e6eff7',
    '#f1f5f9',
    '#f8fafc',
    '#f8fafc',
  ];

  const connectorColor = depthColors[Math.min(depth, depthColors.length - 1)];
  const indent = depth > 0 ? 16 : 0;

  return (
    <div className="relative" style={{ marginLeft: indent }}>
      {/* 좌측 연결선 */}
      {depth > 0 && (
        <span
          className="absolute left-[-10px] top-4 bottom-0 w-px"
          style={{ backgroundColor: connectorColor, opacity: 0.6 }}
        />
      )}

      {/* 댓글 본체 */}
      <div className="flex-1">
        <div
          className={`group rounded-lg px-3 py-2 transition-colors ${
            isEditing ? 'bg-gray-50' : 'hover:bg-gray-50'
          }`}
        >
          {/* 헤더: 작성자, 시간, 액션 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">{comment.authorName}</span>
            <span className="text-xs text-gray-500">{formattedTime}</span>

            {/* 액션 버튼 */}
            {!isEditing && (
              <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded p-1 text-gray-400 hover:text-gray-600"
                  title="수정"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="rounded p-1 text-gray-400 hover:text-red-500"
                  title="삭제"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* 댓글 내용 */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editValue}
                onChange={(event) => setEditValue(event.target.value)}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditValue(comment.content);
                    setIsEditing(false);
                  }}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600"
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-800">
              {linkifyText(comment.content)}
            </p>
          )}

          {/* 액션: 답글 버튼 */}
          {!isEditing && canReply && (
            <button
              type="button"
              onClick={() => setIsReplying((prev) => !prev)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <MessageSquare className="h-3 w-3" />
              <span>답글</span>
            </button>
          )}

          {/* 답글 폼 */}
          {isReplying && canReply && (
            <div className="mt-2 pl-8">
              <CommentForm
                defaultAuthorName={currentAuthorName}
                onSubmit={(content, authorName) => {
                  return onReply(content, authorName, comment.id).then(() => {
                    setIsReplying(false);
                  });
                }}
                onSaveAuthorName={onSaveAuthorName}
                placeholder="답글을 입력해주세요"
                submitLabel="답글 등록"
                onCancel={() => setIsReplying(false)}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* 대댓글 목록 */}
        {hasReplies && (
          <div className="mt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                setAreRepliesVisible((prev) => {
                  const next = !prev;
                  if (!next) {
                    setIsReplying(false);
                  }
                  return next;
                });
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${areRepliesVisible ? 'rotate-180' : ''}`}
              />
              <span>
                {areRepliesVisible
                  ? `${replyCount}개 답글 숨기기`
                  : `${replyCount}개 답글 보기`}
              </span>
            </button>

            {areRepliesVisible && (
              <div className="space-y-0">
                {comment.replies!.map((reply) => (
                  <CommentThread
                    key={reply.id}
                    comment={reply}
                    currentAuthorName={currentAuthorName}
                    depth={depth + 1}
                    onReply={onReply}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onSaveAuthorName={onSaveAuthorName}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
