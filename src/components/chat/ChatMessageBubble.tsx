// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅 메시지 버블 (Desktop/Mobile 공유)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { Download, FileText } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';
import { formatFileSize } from '@/lib/supabase/chat';

interface Props {
  message: ChatMessage;
  isMine: boolean;
  onReply?: (messageId: string) => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour12}:${m}`;
}

export default function ChatMessageBubble({ message, isMine, onReply }: Props) {
  // 시스템 메시지
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-xs text-gray-400">{message.content}</span>
      </div>
    );
  }

  // 파일 메시지
  if (message.message_type === 'file') {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
        <div
          className={`max-w-[280px] ${
            isMine ? 'order-1' : 'order-2'
          }`}
        >
          {/* 인용 답장 */}
          {message.reply_to_preview && (
            <div
              className={`text-[10px] px-3 py-1 mb-0.5 rounded-t-xl ${
                isMine ? 'bg-blue-400/30 text-blue-100' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {message.reply_to_preview}
            </div>
          )}
          <div
            className={`border rounded-xl p-3 ${
              isMine
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
            onDoubleClick={() => onReply?.(message.id)}
          >
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-800 truncate">{message.file_name}</p>
                <p className="text-[10px] text-gray-400">
                  {message.file_size ? formatFileSize(message.file_size) : ''}
                </p>
              </div>
              {message.file_url && (
                <a
                  href={message.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-[#3B82F6] transition-colors"
                >
                  <Download size={16} />
                </a>
              )}
            </div>
          </div>
          <div className={`mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
            <span className={`text-[10px] ${isMine ? 'text-gray-400' : 'text-gray-400'}`}>
              {formatTime(message.created_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 텍스트 메시지
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className="max-w-[280px]">
        {/* 인용 답장 */}
        {message.reply_to_preview && (
          <div
            className={`text-[10px] px-3 py-1 rounded-t-xl ${
              isMine ? 'bg-blue-400/30 text-blue-100' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {message.reply_to_preview}
          </div>
        )}
        <div
          className={`px-3.5 py-2 ${
            message.reply_to_preview ? '' : 'rounded-2xl'
          } ${
            isMine
              ? `bg-[#3B82F6] text-white ${message.reply_to_preview ? 'rounded-b-2xl rounded-br-md' : 'rounded-br-md'}`
              : `bg-gray-100 text-gray-800 ${message.reply_to_preview ? 'rounded-b-2xl rounded-bl-md' : 'rounded-bl-md'}`
          }`}
          onDoubleClick={() => onReply?.(message.id)}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className={`mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}>
          <span className={`text-[10px] ${isMine ? 'text-gray-400' : 'text-gray-400'}`}>
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
