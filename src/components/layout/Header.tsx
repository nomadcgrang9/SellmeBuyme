'use client';

import { IconSearch } from '@tabler/icons-react';
import { MessageCircle } from 'lucide-react';
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
import { useAuthStore } from '@/stores/authStore';
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

interface HeaderProps {
  onProfileClick?: () => void;
  onChatClick?: () => void;
}

export default function Header({ onProfileClick, onChatClick }: HeaderProps) {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login'>('signup');
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const { status, user } = useAuthStore((state) => ({
    status: state.status,
    user: state.user
  }));
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
    if (debouncedSearchQuery.length > 0 || searchQuery.length > 0) {
      setSearchQuery(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, setSearchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setLocalSearchQuery(e.currentTarget.value);
      setSearchQuery(e.currentTarget.value);
    }
  };

  const sortOptions = useMemo(() => Array.from(SORT_OPTIONS), []);

  const handleLoginClick = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleSignupClick = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
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
      setIsAuthModalOpen(false);
    }
  };


  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 font-esamanru">
      {/* PC: 1줄 레이아웃 (로고 + 토글 + 검색 + 버튼) */}
      <div className="hidden sm:block">
        <div className="max-w-container mx-auto px-6 py-2.5">
          <div className="flex items-center gap-3">
            {/* 로고 */}
            <h1
              className="text-xl font-extrabold bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] bg-clip-text text-transparent shrink-0"
              style={{ letterSpacing: '-0.5px' }}
            >
              셀미바이미
            </h1>

            {/* 스위치 토글 */}
            <button
              onClick={handleToggle}
              title={`${toggleLabelMap[toggleOrder[(toggleOrder.indexOf(viewType) + 1) % toggleOrder.length]]} 보기`}
              className={`relative w-[76px] h-6 rounded-full overflow-hidden transition-colors duration-300 flex items-center justify-center shrink-0 ${
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

            {/* 검색창 - 중앙 */}
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
                  placeholder="수원 중등 기간제 또는 성남 자원봉사자 등 원하는 키워드로 입력해보세요"
                  className="flex-1 h-full pl-10 pr-3 text-sm bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* 로그인/회원가입 버튼 */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {status === 'authenticated' && user ? (
                <>
                  <button
                    type="button"
                    onClick={() => onChatClick?.()}
                    className="flex items-center gap-2 h-9 px-4 text-sm font-semibold text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                    title="채팅"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>채팅</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onProfileClick?.()}
                    className="flex items-center gap-2 h-9 px-4 text-sm font-semibold text-white rounded-md bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] shadow-md hover:from-[#8BC8FF] hover:to-[#58A8FF] transition-colors"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/40 text-[#68B2FF] text-xs font-bold">
                      {user.email?.[0]?.toUpperCase() ?? 'P'}
                    </span>
                    <span>프로필</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    className="group relative h-9 rounded-md bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] p-[1px] shadow-sm transition-colors hover:from-[#8BC8FF] hover:to-[#58A8FF]"
                  >
                    <span className="flex h-full w-full items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-[#68B2FF] transition-colors group-hover:bg-slate-50">
                      로그인
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSignupClick}
                    className="h-9 px-4 text-sm font-semibold text-white rounded-md bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] shadow-sm hover:from-[#8BC8FF] hover:to-[#58A8FF] transition-colors"
                  >
                    회원가입
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 모바일: 1줄 레이아웃 (로고 + 검색창 + 로그인) */}
      <div className="sm:hidden">
        <div className="max-w-container mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            {/* 로고 */}
            <h1
              className="text-sm font-extrabold bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] bg-clip-text text-transparent shrink-0"
              style={{ letterSpacing: '-0.5px' }}
            >
              셀바
            </h1>

            {/* 검색창 - 로그아웃시만 60% 제한, 로그인시 넓게 */}
            <div className={`flex-1 min-w-0 ${status !== 'authenticated' ? 'max-w-[60%]' : ''}`}>
              <div className="relative flex items-center h-7 border border-gray-300 rounded-md focus-within:border-primary transition-colors">
                <IconSearch
                  className="absolute left-2 text-gray-400 pointer-events-none"
                  size={12}
                  stroke={1.5}
                />
                <input
                  type="text"
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="검색"
                  className="w-full h-full pl-7 pr-2 text-xs bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {/* 로그인/회원가입/프로필 버튼 */}
            {status === 'authenticated' && user ? (
              <div className="flex items-center gap-1 shrink-0 relative z-10 ml-auto">
                <button
                  type="button"
                  onClick={() => onChatClick?.()}
                  className="h-7 px-2 text-[10px] font-semibold text-gray-700 rounded-md border border-gray-300"
                  title="채팅"
                >
                  <MessageCircle className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onProfileClick?.()}
                  className="h-7 px-2 text-[10px] font-semibold text-white rounded-md bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF]"
                >
                  프로필
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 shrink-0 relative z-10">
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="h-7 px-2 text-[10px] font-semibold text-[#68B2FF] rounded-md border border-[#68B2FF] whitespace-nowrap"
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={handleSignupClick}
                  className="h-7 px-2 text-[10px] font-semibold text-white rounded-md bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] whitespace-nowrap"
                >
                  가입
                </button>
              </div>
            )}
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
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (!loadingProvider) {
            setIsAuthModalOpen(false);
          }
        }}
        onSelectProvider={handleSelectProvider}
        loadingProvider={loadingProvider}
        mode={authModalMode}
      />
    </header>
  );
}
