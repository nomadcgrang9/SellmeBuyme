'use client';

import { IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
  SORT_OPTIONS
} from '@/lib/constants/filters';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useSearchStore } from '@/stores/searchStore';
import SocialSignupModal, { type AuthProvider } from '@/components/auth/SocialSignupModal';
import { supabase } from '@/lib/supabase/client';
import type {
  CategoryOption,
  RegionOption,
  SortOptionValue,
  ViewType
} from '@/types';

type FilterKey = 'region' | 'category' | 'sort';

const toggleOrder: ViewType[] = ['all', 'job', 'talent', 'experience'];

const toggleLabelMap: Record<ViewType, string> = {
  all: '모두보기',
  job: '공고',
  talent: '인력',
  experience: '체험'
};

const activeColorMap: Record<ViewType, string> = {
  all: 'bg-gray-500',
  job: 'bg-[#7aa3cc]',
  talent: 'bg-[#7db8a3]',
  experience: 'bg-[#f4c96b]'
};

// 슬라이더 위치: 토글 너비 76px (좌측 여백 2px, 이동 범위 0~52)
const sliderTranslateMap: Record<ViewType, number> = {
  all: 26,
  job: 0,
  talent: 26,
  experience: 52
};

export default function Header() {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSocialSignupOpen, setIsSocialSignupOpen] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
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

  const handleLoginClick = () => {
    // TODO: 이메일/비밀번호 로그인 모달 연동
    console.info('로그인 기능은 추후 구현 예정입니다.');
  };

  const handleSignupClick = () => {
    setIsSocialSignupOpen(true);
  };

  const handleSelectProvider = async (provider: AuthProvider) => {
    try {
      setLoadingProvider(provider);
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === 'kakao' ? { prompt: 'login' } : undefined
        } as Record<string, unknown>
      });

      if (error) {
        console.error('소셜 로그인 오류:', error.message);
      }
    } catch (error) {
      console.error('소셜 로그인 처리 중 오류:', error);
    } finally {
      setLoadingProvider(null);
      setIsSocialSignupOpen(false);
    }
  };

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
              className={`relative w-[76px] h-6 rounded-full overflow-hidden transition-colors duration-300 flex items-center justify-center ${
                viewType === 'all' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            >
              <span
                className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white leading-none pointer-events-none select-none transition-opacity duration-200 ${
                  viewType === 'all' ? 'opacity-100' : 'opacity-0'
                }`}
              >
                모두보기
              </span>

              <motion.div
                className={`absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none ${
                  activeColorMap[viewType]
                }`}
                initial={false}
                animate={{
                  x: sliderTranslateMap[viewType],
                  opacity: viewType === 'all' ? 0 : 1,
                  scale: viewType === 'all' ? 0.8 : 1
                }}
                style={{ left: '2px' }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 28
                }}
              >
                <span
                  className={`text-[8px] font-semibold text-white leading-none pointer-events-none select-none transition-opacity duration-150 ${
                    viewType === 'all' ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {viewType === 'all' ? '' : toggleLabelMap[viewType]}
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

          {/* 우측 인증 버튼 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoginClick}
              className="h-9 px-4 text-sm font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              로그인
            </button>
            <button
              type="button"
              onClick={handleSignupClick}
              className="h-9 px-4 text-sm font-semibold text-white rounded-md bg-gradient-to-r from-[#7aa3cc] to-[#5f89b4] shadow-sm hover:from-[#6b95be] hover:to-[#517aa5] transition-colors"
            >
              회원가입
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

      <SocialSignupModal
        isOpen={isSocialSignupOpen}
        onClose={() => {
          if (!loadingProvider) {
            setIsSocialSignupOpen(false);
          }
        }}
        onSelectProvider={handleSelectProvider}
        loadingProvider={loadingProvider}
      />
    </header>
  );
}