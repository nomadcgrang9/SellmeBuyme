import React, { useState, useRef } from 'react';

interface MobileSearchBarProps {
  value: string;
  onSearch: (query: string) => void;
  onFilterClick: () => void;
  filterCount: number;
}

const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  value,
  onSearch,
  onFilterClick,
  filterCount,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(inputValue);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="px-4 pt-3 pb-2 bg-white/95 backdrop-blur-sm">
      {/* 로고 */}
      <div className="flex items-center justify-center mb-2">
        <a href="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="쌤찾기"
            className="h-10 w-auto"
          />
        </a>
      </div>

      <div className="flex items-center gap-2">
        {/* 검색 입력창 */}
        <form
          onSubmit={handleSubmit}
          className={`
            flex-1 flex items-center gap-2 px-4 py-3
            bg-white rounded-2xl shadow-lg
            transition-all duration-200
            ${isFocused ? 'ring-2 ring-blue-500' : ''}
          `}
        >
          {/* 검색 아이콘 */}
          <svg
            className={`w-5 h-5 flex-shrink-0 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          {/* 입력 필드 */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="지역, 학교명으로 검색"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
          />

          {/* 검색어 삭제 버튼 */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* 필터 버튼 */}
        <button
          onClick={onFilterClick}
          className={`
            relative p-3 rounded-2xl shadow-lg
            transition-all duration-200 active:scale-95
            ${filterCount > 0 ? 'bg-blue-500 text-white' : 'bg-white text-gray-600'}
          `}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>

          {/* 필터 카운트 배지 */}
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileSearchBar;
