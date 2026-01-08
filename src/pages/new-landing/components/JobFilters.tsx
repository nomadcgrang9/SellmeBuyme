import React, { useState, useEffect, useRef } from 'react';
import { LOCATIONS, SCHOOL_LEVELS, SUBJECTS } from '../constants';

export const JobFilters: React.FC = () => {
  const [isSticky, setIsSticky] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (placeholderRef.current) {
        const placeholderTop = placeholderRef.current.getBoundingClientRect().top;
        // 헤더 높이 (128px) 에 도달하면 고정
        setIsSticky(placeholderTop <= 128);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 초기 체크

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const FilterButton = ({ label, hasSelection = false }: { label: string, hasSelection?: boolean }) => (
    <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${hasSelection ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
      {label}
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <>
      {/* Placeholder to maintain layout when filter becomes fixed */}
      <div ref={placeholderRef} className={isSticky ? 'h-[52px]' : ''} />

      <div
        ref={filterRef}
        className={`z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 transition-shadow ${
          isSticky ? 'fixed top-[128px] left-0 right-0 shadow-sm' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                    <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <FilterButton label="지역" />
                    <FilterButton label="학교급" />
                    <FilterButton label="유형" />
                    <FilterButton label="고용형태" />
                </div>
                
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                     <select className="border-none bg-transparent outline-none cursor-pointer hover:text-gray-800">
                         <option>최신순</option>
                         <option>마감임박순</option>
                         <option>인기순</option>
                     </select>
                </div>
            </div>
            
            {/* Selected Tags Display - Empty for now as filters were reset */}
            <div className="mt-3 hidden gap-2">
                {/* Placeholder for selected filters */}
            </div>
        </div>
    </div>
    </>
  );
};