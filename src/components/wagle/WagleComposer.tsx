// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 새 글 작성 화면
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useWagleStore } from '@/stores/wagleStore';
import { WagleHashtagsInput } from './WagleHashtags';

interface WagleComposerProps {
  onClose: () => void;
}

export default function WagleComposer({ onClose }: WagleComposerProps) {
  const { user } = useAuthStore();
  const { createThread } = useWagleStore();
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await createThread(content.trim(), hashtags);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '사용자';
  const profileImage = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            maxHeight: 'min(80vh, 600px)',
          }}
        >
          {/* 헤더 */}
          <div
            className="flex items-center justify-between px-5 py-3.5 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
            <span className="text-[15px] font-bold text-gray-900">새 글 작성</span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                canSubmit
                  ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '게시 중...' : '게시'}
            </button>
          </div>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* 프로필 */}
            <div className="flex items-center gap-2.5 mb-4">
              {profileImage ? (
                <img src={profileImage} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-semibold text-blue-600">
                  {displayName[0]}
                </div>
              )}
              <span className="text-sm font-semibold text-gray-800">{displayName}</span>
            </div>

            {/* 텍스트 입력 */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="무슨 이야기를 나눠볼까요?"
              className="w-full min-h-[160px] text-sm text-gray-800 leading-relaxed resize-none outline-none placeholder:text-gray-400"
              maxLength={1000}
            />

            {/* 글자 수 */}
            <div className="text-right text-xs text-gray-400 mb-4">
              {content.length}/1000
            </div>

            {/* 해시태그 입력 */}
            <WagleHashtagsInput hashtags={hashtags} onChange={setHashtags} />
          </div>
        </div>
      </div>
    </>
  );
}
