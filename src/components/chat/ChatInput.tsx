// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅 메시지 입력 바 (Desktop/Mobile 공유)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useRef, useCallback } from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { MAX_FILE_SIZE } from '@/types/chat';
import { formatFileSize } from '@/lib/supabase/chat';

interface Props {
  onSend: (content?: string, file?: File, replyToId?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  replyTo?: { id: string; preview: string } | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onTyping, replyTo, onCancelReply, disabled }: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      onTyping?.(e.target.value.length > 0);

      // textarea 높이 자동 조절
      const ta = e.target;
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
    },
    [onTyping]
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      setFileError(`파일 크기가 20MB를 초과합니다 (${formatFileSize(selected.size)})`);
      return;
    }

    setFileError(null);
    setFile(selected);
    // 입력 초기화 (같은 파일 재선택 허용)
    e.target.value = '';
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setFileError(null);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;

    onSend(trimmed || undefined, file || undefined, replyTo?.id);
    setText('');
    setFile(null);
    setFileError(null);
    onTyping?.(false);

    // textarea 높이 리셋
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, file, replyTo, onSend, onTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-gray-100 bg-white">
      {/* 인용 답장 바 */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 truncate">{replyTo.preview}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 파일 미리보기 */}
      {file && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 truncate">{file.name}</p>
            <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 파일 크기 에러 */}
      {fileError && (
        <div className="px-4 py-1.5 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-500">{fileError}</p>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          disabled={disabled}
        >
          <Paperclip size={18} />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
          rows={1}
          disabled={disabled}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 text-sm text-gray-800 placeholder-gray-400 resize-none overflow-hidden focus:outline-none focus:border-gray-300 disabled:opacity-50"
          style={{ maxHeight: '100px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !file)}
          className="p-2 bg-[#3B82F6] text-white rounded-full w-8 h-8 flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-[#2563EB] transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
