import { useEffect, useRef, useState } from 'react';

interface CommentFormProps {
  defaultAuthorName?: string;
  onSubmit: (content: string, authorName: string) => Promise<void>;
  onSaveAuthorName?: (name: string) => void;
  placeholder?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function CommentForm({
  defaultAuthorName,
  onSubmit,
  onSaveAuthorName,
  placeholder = '댓글을 입력해주세요',
  submitLabel = '등록',
  onCancel,
  autoFocus = false,
}: CommentFormProps) {
  const [authorName, setAuthorName] = useState(defaultAuthorName ?? '');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const requiresAuthorName = !authorName.trim();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    const finalAuthorName = authorName.trim();

    if (!trimmedContent) {
      return;
    }

    if (!finalAuthorName) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(trimmedContent, finalAuthorName);
      onSaveAuthorName?.(finalAuthorName);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {requiresAuthorName && (
          <input
            type="text"
            placeholder="이름을 입력해주세요"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        )}
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={autoFocus ? 2 : 3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            취소
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? '작성 중...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
