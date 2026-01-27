import React, { useRef, useCallback } from 'react';

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

  // 백드롭 클릭시 접기
  const handleBackdropClick = useCallback(() => {
    onHeightChange('collapsed');
  }, [onHeightChange]);

  // 접힌 상태 (플로팅 바)
  if (height === 'collapsed') {
    return (
      <div
        ref={sheetRef}
        className="absolute left-4 right-4 z-30 bg-white rounded-2xl shadow-lg"
        style={{
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.12)',
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* 왼쪽: 공고 수 */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500">로딩중...</span>
              </div>
            ) : (
              <span className="text-sm font-medium text-gray-700">
                주변공고 <span className="text-blue-600 font-bold">{jobCount}개</span>
              </span>
            )}
          </div>

          {/* 오른쪽: 더보기 버튼 */}
          <button
            onClick={() => onHeightChange('half')}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            <span>더보기</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // 확장된 상태 (half 또는 full - 둘 다 같은 모달 스타일)
  return (
    <div className="fixed inset-0 z-30">
      {/* 백드롭 - 클릭하면 접기 */}
      <div
        className="absolute inset-0 bg-black/30 transition-opacity duration-200"
        onClick={handleBackdropClick}
      />

      {/* 모달 카드 */}
      <div
        ref={sheetRef}
        className="absolute left-4 right-4 bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up"
        style={{
          maxHeight: height === 'full' ? 'calc(100vh - 120px)' : '60vh',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="font-bold text-gray-900">주변 공고</h2>
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {jobCount}개
              </span>
            )}
          </div>

          {/* 접기 버튼 */}
          <button
            onClick={() => onHeightChange('collapsed')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors"
          >
            <span>접기</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* 콘텐츠 영역 - 내부 스크롤 */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-3"
        >
          {children}
        </div>

        {/* 하단 더보기 버튼 (half 상태일 때만) */}
        {height === 'half' && (
          <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3">
            <button
              onClick={() => onHeightChange('full')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl text-sm font-medium text-gray-700 transition-colors"
            >
              <span>전체 목록 보기</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileBottomSheet;
