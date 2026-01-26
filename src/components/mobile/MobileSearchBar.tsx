import React, { useState, useRef } from 'react';

interface MobileSearchBarProps {
  value: string;
  onSearch: (query: string) => void;
  bottomSheetHeight?: 'collapsed' | 'half' | 'full';
  onProfileClick?: () => void;
  showProfileInline?: boolean; // 풀업 모드에서 검색창 우측에 프로필 버튼 표시
}

const MobileSearchBar: React.FC<MobileSearchBarProps> = ({
  value,
  onSearch,
  bottomSheetHeight = 'collapsed',
  onProfileClick,
  showProfileInline = false,
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

  // 바텀시트 높이에 따른 애니메이션 스타일
  const getAnimationStyle = (): React.CSSProperties => {
    switch (bottomSheetHeight) {
      case 'full':
        return {
          opacity: 0.6,
          transform: 'scale(0.95) translateY(-4px)',
          pointerEvents: 'none' as const,
        };
      case 'half':
        return {
          opacity: 0.9,
          transform: 'scale(0.98)',
        };
      default:
        return {
          opacity: 1,
          transform: 'scale(1)',
        };
    }
  };

  // 풀업 모드에서는 단순한 스타일 적용
  const isFullMode = bottomSheetHeight === 'full';

  // showProfileInline이 true면 검색창과 프로필 버튼을 같은 행에 배치 (섹션 스타일)
  if (showProfileInline) {
    return (
      <div className="flex items-center gap-0">
        {/* 검색창 영역 (80%) */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex items-center gap-2 px-3 py-2.5"
        >
          {/* 로고 */}
          <a href="/" className="flex-shrink-0">
            <img
              src="/picture/logo.png"
              alt="학교일자리"
              className="h-6 w-auto"
            />
          </a>

          {/* 구분선 */}
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

          {/* 입력 필드 */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="지역, 학교명 입력"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm min-w-0"
          />

          {/* 검색어 삭제 버튼 */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* 구분선 */}
        <div className="w-px h-8 bg-gray-200" />

        {/* 프로필 버튼 영역 (20%) */}
        <button
          type="button"
          onClick={onProfileClick}
          className="flex-shrink-0 px-4 py-2.5 text-gray-600 active:bg-gray-100 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    );
  }

  // 기본 플로팅 스타일 (collapsed/half 모드)
  return (
    <div
      className={isFullMode ? '' : 'px-4 pt-3 pb-2 transition-all duration-300 ease-out'}
      style={isFullMode ? {} : getAnimationStyle()}
    >
      <div className="flex items-center gap-2">
        {/* 검색바 */}
        <form
          onSubmit={handleSubmit}
          className={`
            flex-1 flex items-center gap-2 px-3 py-2.5
            transition-all duration-200
            ${isFullMode
              ? 'bg-white border border-gray-200 rounded-xl'
              : 'bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100'
            }
            ${isFocused ? 'ring-2 ring-blue-500 bg-white' : ''}
          `}
        >
          {/* 로고 (검색바 내부, 돋보기 포함) */}
          <a href="/" className="flex-shrink-0">
            <img
              src="/picture/logo.png"
              alt="학교일자리"
              className="h-6 w-auto"
            />
          </a>

          {/* 구분선 */}
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

          {/* 입력 필드 */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="지역, 학교명 입력"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm min-w-0"
          />

          {/* 검색어 삭제 버튼 */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>

        {/* 프로필 아이콘 (검색바 외부) - 풀업 모드에서는 숨김 */}
        {!isFullMode && (
          <button
            type="button"
            onClick={onProfileClick}
            className="flex-shrink-0 w-10 h-10 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-100 flex items-center justify-center active:bg-gray-100"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileSearchBar;
