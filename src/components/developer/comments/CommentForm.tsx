import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';

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
  const [isNameEditing, setIsNameEditing] = useState(!(defaultAuthorName ?? '').trim());
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const requiresAuthorName = !authorName.trim();

  const resetTextareaHeight = () => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 32)}px`;
  };

  useEffect(() => {
    const nextName = defaultAuthorName ?? '';
    setAuthorName(nextName);
    setIsNameEditing(!nextName.trim());
  }, [defaultAuthorName]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      resetTextareaHeight();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (isNameEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isNameEditing]);

  useEffect(() => {
    resetTextareaHeight();
  }, [content]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedContent = content.trim();
    const finalAuthorName = authorName.trim();

    if (!trimmedContent || !finalAuthorName) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(trimmedContent, finalAuthorName);
      onSaveAuthorName?.(finalAuthorName);
      setContent('');
      resetTextareaHeight();
      if (!finalAuthorName) {
        setIsNameEditing(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const nativeEvent = event.nativeEvent as { isComposing?: boolean };
    if (nativeEvent.isComposing) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }

    if (event.key === 'Escape' && onCancel) {
      event.preventDefault();
      setContent('');
      resetTextareaHeight();
      onCancel();
    }
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const trimmed = authorName.trim();
      if (trimmed) {
        setAuthorName(trimmed);
        setIsNameEditing(false);
        textareaRef.current?.focus();
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      const fallback = defaultAuthorName ?? '';
      setAuthorName(fallback);
      setIsNameEditing(!fallback.trim());
      if (!fallback.trim()) {
        nameInputRef.current?.focus();
      }
    }
  };

  const handleNameBlur = () => {
    const trimmed = authorName.trim();
    if (trimmed) {
      setAuthorName(trimmed);
      setIsNameEditing(false);
    }
  };

  const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(event.target.value);
  };

  return (
    <form
      className="w-full"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <div className={`flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm transition focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-300 ${
        isSubmitting ? 'opacity-80' : ''
      }`}>
        {(requiresAuthorName || isNameEditing) ? (
          <input
            ref={nameInputRef}
            type="text"
            value={authorName}
            placeholder="이름"
            onChange={(event) => setAuthorName(event.target.value)}
            onKeyDown={handleNameKeyDown}
            onBlur={handleNameBlur}
            className="w-20 shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsNameEditing(true)}
            className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
            title="클릭하여 이름을 변경"
          >
            {authorName}
          </button>
        )}

        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleTextareaKeyDown}
          rows={1}
          className="flex-1 resize-none overflow-hidden border-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
          disabled={isSubmitting}
        />

        <span className="shrink-0 text-[10px] font-medium text-gray-400" title="Enter: 등록 · Shift+Enter: 줄바꿈">
          ↵ 등록
        </span>
      </div>
    </form>
  );
}
