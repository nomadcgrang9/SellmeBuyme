// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 답글 입력창 (하단 고정)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { useWagleStore } from '@/stores/wagleStore';
import { useAuthStore } from '@/stores/authStore';

interface WagleReplyInputProps {
  threadId: string;
  replyTarget: {
    parentId: string | null;
    depth: number;
    mentionUserId?: string;
    mentionUserName?: string;
  } | null;
  onClearReplyTarget: () => void;
  /** true면 fixed positioning 없이 렌더 (데스크탑 패널용) */
  inline?: boolean;
}

export default function WagleReplyInput({
  threadId,
  replyTarget,
  onClearReplyTarget,
  inline = false,
}: WagleReplyInputProps) {
  const { createReply } = useWagleStore();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 답글 대상 변경 시 포커스
  useEffect(() => {
    if (replyTarget) {
      inputRef.current?.focus();
    }
  }, [replyTarget]);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await createReply(
        threadId,
        replyTarget?.parentId || null,
        content.trim(),
        replyTarget?.depth || 1,
        replyTarget?.mentionUserId
      );
      setContent('');
      onClearReplyTarget();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const profileImage = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  return (
    <div className={`${inline ? '' : 'fixed bottom-0 left-0 right-0 z-20'} bg-white border-t border-gray-200`}>
      {/* 답글 대상 표시 */}
      {replyTarget?.mentionUserName && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-100">
          <span className="text-xs text-gray-500">
            <span className="font-medium text-blue-600">@{replyTarget.mentionUserName}</span>에게 답글
          </span>
          <button onClick={onClearReplyTarget} className="text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="flex items-center gap-2 px-4 py-3 pb-safe">
        {profileImage ? (
          <img src={profileImage} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
        )}

        <input
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="답글을 입력하세요..."
          className="flex-1 text-sm text-gray-800 bg-gray-100 rounded-full px-4 py-2 outline-none placeholder:text-gray-400"
          maxLength={500}
        />

        <button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className={`p-2 rounded-full transition-colors ${
            content.trim() && !isSending
              ? 'text-[#3B82F6] hover:bg-blue-50'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
