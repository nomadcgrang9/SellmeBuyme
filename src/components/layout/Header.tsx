'use client';

import { IconSearch, IconUser } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
  SORT_OPTIONS
} from '@/lib/constants/filters';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useSearchStore } from '@/stores/searchStore';
import type {
  CategoryOption,
  RegionOption,
  SortOptionValue,
  ViewType
} from '@/types';

type FilterKey = 'region' | 'category' | 'sort';

const toggleOrder: ViewType[] = ['job', 'talent', 'experience'];

const toggleLabelMap: Record<ViewType, string> = {
  job: '공고',
  talent: '인력',
  experience: '체험'
};

const activeColorMap: Record<ViewType, string> = {
  job: 'bg-[#7aa3cc]',
  talent: 'bg-[#7db8a3]',
  experience: 'bg-[#f4c96b]'
};

const slidePositionMap: Record<ViewType, number> = {
  job: 2,
  talent: 22,
  experience: 42
};

export default function Header() {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500);
  const {
    searchQuery,
    filters,
    viewType,
    setSearchQuery,
    setFilter,
    setViewType,
    resetFilters
  } = useSearchStore((state) => ({
    searchQuery: state.searchQuery,
    filters: state.filters,
    viewType: state.viewType,
    setSearchQuery: state.setSearchQuery,
    setFilter: state.setFilter,
    setViewType: state.setViewType,
    resetFilters: state.resetFilters
  }));

  const handleToggle = () => {
    const currentIndex = toggleOrder.indexOf(viewType);
    const nextToggle = toggleOrder[(currentIndex + 1) % toggleOrder.length];
    setViewType(nextToggle);
  };

  const handleFilterClick = (filterType: FilterKey) => {
    setOpenFilter((prev) => (prev === filterType ? null : filterType));
  };

  const handleRegionSelect = (region: RegionOption) => {
    setFilter('region', region);
    setOpenFilter(null);
  };

  const handleCategorySelect = (category: CategoryOption) => {
    setFilter('category', category);
    setOpenFilter(null);
  };

  const handleSortSelect = (sort: SortOptionValue) => {
    setFilter('sort', sort);
    setOpenFilter(null);
  };

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) {
      setSearchQuery(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, searchQuery, setSearchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearchQuery(localSearchQuery);
    }
  };

  const sortOptions = useMemo(() => Array.from(SORT_OPTIONS), []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 font-esamanru">
      <div className="max-w-container mx-auto px-6 py-2.5">
        {/* 단일 행: 로고 + 토글 + 검색 + 필터 + 버튼 */}
        <div className="flex items-center gap-4">
          {/* 로고 + 토글 (좌측) */}
          <div className="flex items-center gap-3 shrink-0">
            <h1 className="text-xl font-extrabold text-gray-900" style={{ letterSpacing: '-0.5px' }}>셀미바이미</h1>
            
            {/* 스위치 토글 */}
            <button
              onClick={handleToggle}
              title={`${toggleLabelMap[toggleOrder[(toggleOrder.indexOf(viewType) + 1) % toggleOrder.length]]} 보기`}
              className="relative w-16 h-6 bg-gray-300 rounded-full transition-all duration-300 hover:bg-gray-400"
            >
              <motion.div
                className={`absolute top-0.5 w-5 h-5 rounded-full transition-colors duration-300 flex items-center justify-center ${
                  activeColorMap[viewType]
                }`}
                animate={{
                  x: slidePositionMap[viewType]
                }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30
                }}
              >
                <span className="text-[8px] font-semibold text-white leading-none pointer-events-none select-none">
                  {toggleLabelMap[viewType]}
                </span>
              </motion.div>
            </button>
          </div>

          {/* 검색찼 + 필터 통합 */}
          <div className="flex-1 max-w-[680px]">
            <div className="relative flex items-center h-9 border border-gray-300 rounded-md focus-within:border-primary transition-colors">
              <IconSearch 
                className="absolute left-3 text-gray-400" 
                size={16} 
                stroke={1.5}
              />
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="검색어를 입력하세요"
                className="flex-1 h-full pl-10 pr-3 text-sm bg-transparent focus:outline-none"
              />
              
              {/* 필터 태그들 */}
              <div className="flex items-center gap-2 pr-3 border-l border-gray-200 pl-3">

                {/* 지역 필터 */}
                <div className="relative">
                  <button
                    onClick={() => handleFilterClick('region')}
                    className={`px-2.5 py-1 text-xs rounded transition-all ${
                      filters.region !== REGION_OPTIONS[0]
                        ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    } ${
                      openFilter === 'region' ? 'bg-[#f0f6fa] border-primary' : ''
                    }`}
                  >
                    {filters.region}
                  </button>
              
              {/* 지역 드롭다운 */}
              <AnimatePresence>
                {openFilter === 'region' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-50"
                    style={{ width: '380px' }}
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {REGION_OPTIONS.map((region) => (
                        <button
                          key={region}
                          onClick={() => handleRegionSelect(region as RegionOption)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            filters.region === region
                              ? 'bg-primary text-white border-primary font-medium'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {region}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

                {/* 분야 필터 */}
                <div className="relative">
                  <button
                    onClick={() => handleFilterClick('category')}
                    className={`px-2.5 py-1 text-xs rounded transition-all ${
                      filters.category !== CATEGORY_OPTIONS[0]
                        ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    } ${
                      openFilter === 'category' ? 'bg-[#f0f6fa] border-primary' : ''
                    }`}
                  >
                    {filters.category}
                  </button>
              
              {/* 분야 드롭다운 */}
              <AnimatePresence>
                {openFilter === 'category' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-50"
                    style={{ width: '280px' }}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORY_OPTIONS.map((category) => (
                        <button
                          key={category}
                          onClick={() => handleCategorySelect(category as CategoryOption)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            filters.category === category
                              ? 'bg-primary text-white border-primary font-medium'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

                {/* 정렬 필터 */}
                <div className="relative">
                  <button
                    onClick={() => handleFilterClick('sort')}
                    className={`px-2.5 py-1 text-xs rounded transition-all ${
                      filters.sort !== SORT_OPTIONS[0].value
                        ? 'bg-gray-100 text-gray-900 font-medium border border-gray-300'
                        : 'text-gray-500 hover:bg-gray-50'
                    } ${
                      openFilter === 'sort' ? 'bg-[#f0f6fa] border-primary' : ''
                    }`}
                  >
                    {filters.sort}
                  </button>
              
              {/* 정렬 드롭다운 */}
              <AnimatePresence>
                {openFilter === 'sort' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-2 left-0 bg-white rounded-md shadow-xl border border-gray-200 p-3 z-50"
                    style={{ width: '230px' }}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSortSelect(option.value as SortOptionValue)}
                          className={`px-3 py-2 text-xs rounded border transition-colors ${
                            filters.sort === option.value
                              ? 'bg-primary text-white border-primary font-medium'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                  </AnimatePresence>
                </div>

                {/* 초기화 버튼 */}
                <button
                  onClick={() => {
                    resetFilters();
                    setOpenFilter(null);
                  }}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          {/* 우측 로그인 버튼 */}
          <div className="flex gap-2 shrink-0">
            <button className="btn-interactive flex items-center gap-1.5 h-9 px-4 text-sm font-medium border border-gray-300 rounded-md whitespace-nowrap hover:bg-gray-50">
              <IconUser size={16} stroke={1.5} />
              <span>로그인</span>
            </button>
          </div>
        </div>
      </div>

      {/* 오버레이 (필터 외부 클릭 감지) */}
      {openFilter && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenFilter(null)}
        />
      )}
    </header>
  );
}