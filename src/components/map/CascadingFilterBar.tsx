/**
 * 캐스케이딩 필터 바 (데스크톱)
 * 스마트 칩 변환형: 1줄 유지, 단계별 변환
 * 다크 글래스모피즘 디자인
 * v2: 방과후/돌봄 실시간 검색 UI 추가
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, X, Search } from 'lucide-react';
import {
  type CascadingFilter,
  type PrimaryCategory,
  PRIMARY_CATEGORIES,
  PRIMARY_COLORS,
  SECONDARY_OPTIONS,
  TERTIARY_OPTIONS,
} from '@/lib/utils/jobClassifier';

// 방과후/돌봄 카테고리 칩 (6개 그룹핑 - 분석 기반 최적화)
const AFTERSCHOOL_CATEGORY_CHIPS = [
  '체육',   // 놀이체육, 스포츠, 축구, 댄스 등 (25.9%)
  '영어',   // 영어, 중국어, 일본어 등 (14.5%)
  '코딩',   // 코딩, 컴퓨터, 로봇, 과학 등 (12.4%)
  '논술',   // 독서, 논술, 한자, 책놀이 (5.3%)
  '미술',   // 미술, 공예, 도예, 웹툰 등 (11.7%)
  '돌봄',   // 돌봄, 늘봄, 에듀케어 등 (43.3%)
];

// 색상 배경을 적용할 카테고리 (마커 색상과 연동)
const COLORED_CATEGORIES: PrimaryCategory[] = [
  '유치원', '초등담임', '교과과목', '비교과', '특수'
];

interface CascadingFilterBarProps {
  filter: CascadingFilter;
  onFilterChange: (filter: CascadingFilter) => void;
}

const glassStyle = {
  background: 'rgba(30, 30, 30, 0.92)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
  border: '1px solid rgba(255,255,255,0.1)',
};

export default function CascadingFilterBar({
  filter,
  onFilterChange,
}: CascadingFilterBarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const secondaryOptions = filter.primary ? SECONDARY_OPTIONS[filter.primary] : null;
  const showTertiaryLevel = filter.primary === '교과과목' && filter.secondary;
  const isAfterSchoolSearch = filter.primary === '방과후/돌봄';

  // 방과후/돌봄 선택 시 검색창 포커스
  useEffect(() => {
    if (isAfterSchoolSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isAfterSchoolSearch]);

  // 검색어 변경 시 debounce 처리 (150ms)
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      // 검색어를 secondary에 저장 (빈 문자열이면 null)
      onFilterChange({
        ...filter,
        secondary: value.trim() || null,
        tertiary: null,
      });
    }, 150);
  }, [filter, onFilterChange]);

  // 인기 키워드 클릭
  const handlePopularKeywordClick = useCallback((keyword: string) => {
    setSearchQuery(keyword);
    onFilterChange({
      ...filter,
      secondary: keyword,
      tertiary: null,
    });
  }, [filter, onFilterChange]);

  // 현재 단계 결정
  const getCurrentLevel = (): 'primary' | 'secondary' | 'tertiary' => {
    if (showTertiaryLevel) return 'tertiary';
    if (filter.primary && secondaryOptions) return 'secondary';
    return 'primary';
  };

  const currentLevel = getCurrentLevel();

  // 뒤로가기 핸들러
  const handleBack = () => {
    if (currentLevel === 'tertiary') {
      // 3차 → 2차: secondary 초기화
      onFilterChange({ ...filter, secondary: null, tertiary: null });
    } else if (currentLevel === 'secondary') {
      // 2차 → 1차: primary 초기화
      onFilterChange({ primary: null, secondary: null, tertiary: null });
    }
  };

  // 1차 카테고리 선택
  const handlePrimaryClick = (key: PrimaryCategory) => {
    onFilterChange({ primary: key, secondary: null, tertiary: null });
  };

  // 2차 옵션 선택
  const handleSecondaryClick = (key: string) => {
    if (filter.secondary === key) {
      onFilterChange({ ...filter, secondary: null, tertiary: null });
    } else {
      onFilterChange({ ...filter, secondary: key, tertiary: null });
    }
  };

  // 3차 옵션 선택
  const handleTertiaryClick = (key: string | null) => {
    onFilterChange({ ...filter, tertiary: key });
  };

  // 전체 초기화
  const handleReset = () => {
    onFilterChange({ primary: null, secondary: null, tertiary: null });
  };

  // 현재 선택된 카테고리 색상
  const currentColors = filter.primary ? PRIMARY_COLORS[filter.primary] : null;

  // 1차 필터 렌더링 (초기 상태)
  const renderPrimaryLevel = () => (
    <>
      {PRIMARY_CATEGORIES.map(({ key, label }) => {
        const isHovered = hoveredItem === key;
        const colors = PRIMARY_COLORS[key];
        const hasColoredBg = COLORED_CATEGORIES.includes(key);

        return (
          <button
            key={key}
            onClick={() => handlePrimaryClick(key)}
            onMouseEnter={() => setHoveredItem(key)}
            onMouseLeave={() => setHoveredItem(null)}
            className="px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-lg"
            style={{
              // 색상 배경 카테고리: 기본=흰글씨+진한배경, hover=어두운글씨+밝은배경
              // 무색 카테고리: 기존처럼 hover 시만 색상
              color: hasColoredBg
                ? (isHovered ? colors.text : '#FFFFFF')
                : (isHovered ? colors.text : '#E2E8F0'),
              backgroundColor: hasColoredBg
                ? (isHovered ? colors.light : colors.base)
                : (isHovered ? colors.light : 'transparent'),
            }}
          >
            {label}
          </button>
        );
      })}
    </>
  );

  // 방과후/돌봄 검색 UI 렌더링
  const renderAfterSchoolSearch = () => {
    const primaryLabel = PRIMARY_CATEGORIES.find(c => c.key === filter.primary)?.label || '';

    return (
      <>
        {/* 뒤로가기 버튼 */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-white/10 flex-shrink-0"
          style={{ color: currentColors?.light || '#E2E8F0' }}
        >
          <ChevronLeft size={16} />
          <span>{primaryLabel}</span>
        </button>

        <div className="w-px h-5 bg-gray-500 mx-1 flex-shrink-0" />

        {/* 검색 입력창 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Search size={14} className="text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="과목 검색 (예: 체육, 피아노...)"
            className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-[160px]"
            style={{ caretColor: currentColors?.light }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                onFilterChange({ ...filter, secondary: null });
              }}
              className="p-0.5 text-gray-400 hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-gray-500 mx-1 flex-shrink-0" />

        {/* 인기 키워드 칩 */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {AFTERSCHOOL_CATEGORY_CHIPS.map((keyword) => {
            const isSelected = filter.secondary === keyword;
            const isHovered = hoveredItem === `kw-${keyword}`;

            return (
              <button
                key={keyword}
                onClick={() => handlePopularKeywordClick(keyword)}
                onMouseEnter={() => setHoveredItem(`kw-${keyword}`)}
                onMouseLeave={() => setHoveredItem(null)}
                className="px-2 py-1 text-xs font-medium transition-all duration-200 whitespace-nowrap rounded-md flex-shrink-0"
                style={{
                  color: isSelected ? currentColors?.text : isHovered ? currentColors?.text : '#94A3B8',
                  backgroundColor: isSelected ? currentColors?.light : isHovered ? `${currentColors?.light}60` : 'rgba(255,255,255,0.05)',
                }}
              >
                {keyword}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  // 2차 필터 렌더링 (1차 선택 후)
  const renderSecondaryLevel = () => {
    // 방과후/돌봄은 검색 UI로 대체
    if (filter.primary === '방과후/돌봄') {
      return renderAfterSchoolSearch();
    }

    if (!filter.primary || !secondaryOptions) return null;

    const primaryLabel = PRIMARY_CATEGORIES.find(c => c.key === filter.primary)?.label || '';

    return (
      <>
        {/* 뒤로가기 버튼 + 현재 카테고리 */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-white/10"
          style={{ color: currentColors?.light || '#E2E8F0' }}
        >
          <ChevronLeft size={16} />
          <span>{primaryLabel}</span>
        </button>

        <div className="w-px h-5 bg-gray-500 mx-1" />

        {/* 2차 옵션들 */}
        {secondaryOptions.map(({ key, label }) => {
          const isSelected = filter.secondary === key;
          const isHovered = hoveredItem === key;

          return (
            <button
              key={key}
              onClick={() => handleSecondaryClick(key)}
              onMouseEnter={() => setHoveredItem(key)}
              onMouseLeave={() => setHoveredItem(null)}
              className="px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-lg flex-shrink-0"
              style={{
                color: isSelected ? currentColors?.text : isHovered ? currentColors?.text : '#E2E8F0',
                backgroundColor: isSelected ? currentColors?.light : isHovered ? `${currentColors?.light}80` : 'transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </>
    );
  };

  // 3차 필터 렌더링 (교과과목 → 과목 선택 후)
  const renderTertiaryLevel = () => {
    if (!filter.secondary) return null;

    const secondaryLabel = secondaryOptions?.find(o => o.key === filter.secondary)?.label || '';

    return (
      <>
        {/* 뒤로가기 버튼 + 현재 과목 */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-2 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-white/10"
          style={{ color: currentColors?.light || '#E2E8F0' }}
        >
          <ChevronLeft size={16} />
          <span>{secondaryLabel}</span>
        </button>

        <div className="w-px h-5 bg-gray-500 mx-1" />

        {/* 전체 옵션 */}
        <button
          onClick={() => handleTertiaryClick(null)}
          onMouseEnter={() => setHoveredItem('all')}
          onMouseLeave={() => setHoveredItem(null)}
          className="px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-lg"
          style={{
            color: !filter.tertiary ? currentColors?.text : hoveredItem === 'all' ? currentColors?.text : '#E2E8F0',
            backgroundColor: !filter.tertiary ? currentColors?.light : hoveredItem === 'all' ? `${currentColors?.light}80` : 'transparent',
          }}
        >
          전체
        </button>

        {/* 학교급 옵션들 */}
        {TERTIARY_OPTIONS.map(({ key, label }) => {
          const isSelected = filter.tertiary === key;
          const isHovered = hoveredItem === key;

          return (
            <button
              key={key}
              onClick={() => handleTertiaryClick(key)}
              onMouseEnter={() => setHoveredItem(key)}
              onMouseLeave={() => setHoveredItem(null)}
              className="px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-lg"
              style={{
                color: isSelected ? currentColors?.text : isHovered ? currentColors?.text : '#E2E8F0',
                backgroundColor: isSelected ? currentColors?.light : isHovered ? `${currentColors?.light}80` : 'transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </>
    );
  };

  return (
    <div
      className="flex items-center gap-1 px-3 py-2 rounded-2xl max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-hide transition-all duration-300"
      style={glassStyle}
    >
      {/* 현재 단계에 맞는 UI 렌더링 */}
      {currentLevel === 'primary' && renderPrimaryLevel()}
      {currentLevel === 'secondary' && renderSecondaryLevel()}
      {currentLevel === 'tertiary' && renderTertiaryLevel()}

      {/* 필터 초기화 (필터가 활성화된 경우만) */}
      {filter.primary && (
        <>
          <div className="w-px h-5 bg-gray-500 mx-1 flex-shrink-0" />
          <button
            onClick={handleReset}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
            title="필터 초기화"
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}
