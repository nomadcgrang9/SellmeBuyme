// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 해시태그 표시/입력 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

// ━━━ 해시태그 표시 (읽기 전용) ━━━

interface WagleHashtagsDisplayProps {
  hashtags: string[];
  onHashtagClick?: (tag: string) => void;
}

export function WagleHashtagsDisplay({ hashtags, onHashtagClick }: WagleHashtagsDisplayProps) {
  if (hashtags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {hashtags.map((tag) => (
        <button
          key={tag}
          onClick={() => onHashtagClick?.(tag)}
          className="text-xs text-blue-600 hover:underline cursor-pointer"
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}

// ━━━ 해시태그 입력 ━━━

interface WagleHashtagsInputProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
  maxTags?: number;
}

export function WagleHashtagsInput({ hashtags, onChange, maxTags = 5 }: WagleHashtagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (value: string) => {
    const tag = value.replace(/^#/, '').trim();
    if (!tag) return;
    if (hashtags.includes(tag)) return;
    if (hashtags.length >= maxTags) return;
    onChange([...hashtags, tag]);
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(hashtags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && hashtags.length > 0) {
      removeTag(hashtags[hashtags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-600"># 해시태그</label>
      <div
        className="flex flex-wrap items-center gap-1.5 p-2.5 border border-gray-200 rounded-lg bg-white min-h-[40px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
          >
            #{tag}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-blue-800"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {hashtags.length < maxTags && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) addTag(inputValue);
            }}
            placeholder={hashtags.length === 0 ? '태그 입력 후 Enter' : ''}
            className="flex-1 min-w-[80px] text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
        )}
      </div>
    </div>
  );
}

// ━━━ 해시태그 필터 바 ━━━

interface WagleHashtagFilterProps {
  activeHashtag: string | null;
  onSelect: (hashtag: string | null) => void;
  popularTags?: string[];
}

export function WagleHashtagFilter({
  activeHashtag,
  onSelect,
  popularTags = ['급구', '체육', '미술', '방과후', '대타'],
}: WagleHashtagFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-colors ${
          activeHashtag === null
            ? 'bg-gray-800 text-white border-gray-800'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        전체
      </button>
      {popularTags.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(activeHashtag === tag ? null : tag)}
          className={`shrink-0 px-3 py-1 text-xs rounded-full border transition-colors ${
            activeHashtag === tag
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
