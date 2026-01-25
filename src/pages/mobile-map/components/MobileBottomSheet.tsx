import React, { useRef, useEffect, useState } from 'react';

interface MobileBottomSheetProps {
  children: React.ReactNode;
  height: 'collapsed' | 'half' | 'full';
  onHeightChange: (height: 'collapsed' | 'half' | 'full') => void;
  jobCount: number;
  isLoading: boolean;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  children,
  height,
  onHeightChange,
  jobCount,
  isLoading,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(height);
  const [isDragging, setIsDragging] = useState(false);

  // 높이에 따른 스타일
  const getHeightStyle = () => {
    switch (height) {
      case 'collapsed':
        return 'h-[320px]';  // 3개 카드가 들어갈 수 있도록 높이 증가
      case 'half':
        return 'h-[50vh]';
      case 'full':
        return 'h-[85vh]';
      default:
        return 'h-[50vh]';
    }
  };

  // 드래그 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = height;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const diff = startYRef.current - currentY;
    const threshold = 50;

    if (startHeightRef.current === 'collapsed') {
      if (diff > threshold) {
        onHeightChange('half');
        setIsDragging(false);
      }
    } else if (startHeightRef.current === 'half') {
      if (diff > threshold) {
        onHeightChange('full');
        setIsDragging(false);
      } else if (diff < -threshold) {
        onHeightChange('collapsed');
        setIsDragging(false);
      }
    } else if (startHeightRef.current === 'full') {
      if (diff < -threshold) {
        onHeightChange('half');
        setIsDragging(false);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={sheetRef}
      className={`
        absolute bottom-0 left-0 right-0 z-30
        bg-white rounded-t-3xl shadow-2xl
        transition-all duration-300 ease-out
        ${getHeightStyle()}
      `}
      style={{
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 드래그 핸들 */}
      <div
        className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* 헤더 (공고 수 표시) */}
      <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-gray-900">주변 공고</h2>
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {jobCount}개
            </span>
          )}
        </div>

        {/* 높이 조절 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 접기 버튼 (half 또는 full일 때) - 항상 collapsed로 한번에 내려감 */}
          {height !== 'collapsed' && (
            <button
              onClick={() => onHeightChange('collapsed')}
              className="text-sm text-gray-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>접기</span>
            </button>
          )}

          {/* 펼치기 버튼 (collapsed 또는 half일 때) */}
          {height !== 'full' && (
            <button
              onClick={() => onHeightChange(height === 'collapsed' ? 'half' : 'full')}
              className="text-sm text-gray-500 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            >
              <span>{height === 'collapsed' ? '목록 보기' : '더보기'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div
        ref={contentRef}
        className={`px-4 pt-3 ${height === 'collapsed' ? 'overflow-y-auto' : 'overflow-y-auto overscroll-contain'}`}
        style={{
          height: height === 'collapsed' ? 'calc(320px - 80px)' : height === 'half' ? 'calc(50vh - 80px)' : 'calc(85vh - 80px)',
          maxHeight: height === 'collapsed' ? '240px' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default MobileBottomSheet;
