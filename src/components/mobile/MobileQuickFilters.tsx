/**
 * 모바일 퀵 필터
 * Option B: 2줄 그리드 + 방과후/돌봄 검색 UI
 * 카테고리별 최적화: 유치원/비교과/행정 1줄, 교과과목 2줄
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, X, Search, Check } from 'lucide-react';
import {
  type CascadingFilter,
  type PrimaryCategory,
  PRIMARY_CATEGORIES,
  PRIMARY_COLORS,
  SECONDARY_OPTIONS,
  TERTIARY_OPTIONS,
  SCIENCE_TERTIARY_OPTIONS,
  FOREIGN_LANG_TERTIARY_OPTIONS,
  SUBJECTS_WITH_SPECIAL_TERTIARY,
} from '@/lib/utils/jobClassifier';

// 방과후/돌봄 인기 키워드 칩 (데스크톱과 동일)
const AFTERSCHOOL_CATEGORY_CHIPS = [
  '체육',
  '영어',
  '코딩',
  '논술',
  '미술',
  '돌봄',
];

// 초등 카테고리 (다중 선택 가능)
function isElementaryCategory(key: PrimaryCategory): boolean {
  return key === '초등담임' || key === '초등전담';
}

interface MobileQuickFiltersProps {
  filter: CascadingFilter;
  onFilterChange: (filter: CascadingFilter) => void;
  onReset: () => void;
  bottomSheetHeight?: 'collapsed' | 'half' | 'full';
}

const MobileQuickFilters: React.FC<MobileQuickFiltersProps> = ({
  filter,
  onFilterChange,
  onReset,
  bottomSheetHeight = 'collapsed',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const secondaryOptions = filter.primary ? SECONDARY_OPTIONS[filter.primary] : null;
  const showTertiaryLevel = filter.primary === '교과과목' && filter.secondary;
  const isAfterSchoolSearch = filter.primary === '방과후/돌봄';

  // 현재 단계 결정
  const getCurrentLevel = (): 'primary' | 'secondary' | 'tertiary' => {
    if (showTertiaryLevel) return 'tertiary';
    if (filter.primary && (secondaryOptions || isAfterSchoolSearch)) return 'secondary';
    return 'primary';
  };

  const currentLevel = getCurrentLevel();
  const currentColors = filter.primary ? PRIMARY_COLORS[filter.primary] : null;

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

  // 뒤로가기 핸들러
  const handleBack = () => {
    if (currentLevel === 'tertiary') {
      onFilterChange({ ...filter, secondary: null, tertiary: null });
    } else if (currentLevel === 'secondary') {
      setSearchQuery('');
      onFilterChange({ primary: null, secondary: null, tertiary: null });
    }
  };

  // 1차 카테고리 선택 (초등 다중 선택 지원)
  const handlePrimaryClick = (key: PrimaryCategory) => {
    const currentPrimary = filter.primary;
    const currentAdditional = filter.additionalPrimary;

    // 초등 카테고리 간 다중 선택 처리
    if (isElementaryCategory(key)) {
      if (currentPrimary === key) {
        // 이미 선택된 초등 카테고리 클릭 → 해제
        if (currentAdditional && isElementaryCategory(currentAdditional)) {
          onFilterChange({ primary: currentAdditional, additionalPrimary: undefined, secondary: null, tertiary: null });
        } else {
          onFilterChange({ primary: null, additionalPrimary: undefined, secondary: null, tertiary: null });
        }
      } else if (currentAdditional === key) {
        // additionalPrimary 해제
        onFilterChange({ ...filter, additionalPrimary: undefined });
      } else if (currentPrimary && isElementaryCategory(currentPrimary)) {
        // 다른 초등 카테고리 추가 선택
        onFilterChange({ ...filter, additionalPrimary: key, secondary: null, tertiary: null });
      } else {
        // 일반 선택
        onFilterChange({ primary: key, additionalPrimary: undefined, secondary: null, tertiary: null });
      }
    } else {
      // 비-초등 카테고리
      if (currentPrimary === key) {
        onFilterChange({ primary: null, additionalPrimary: undefined, secondary: null, tertiary: null });
      } else {
        onFilterChange({ primary: key, additionalPrimary: undefined, secondary: null, tertiary: null });
      }
    }
  };

  // 2차 옵션 선택
  const handleSecondaryClick = (key: string) => {
    if (filter.secondary === key) {
      onFilterChange({ ...filter, secondary: null, tertiary: null });
    } else {
      onFilterChange({ ...filter, secondary: key, tertiary: null });
    }
  };

  // 3차 옵션 선택 (단일 선택)
  const handleTertiaryClick = (key: string | null) => {
    onFilterChange({ ...filter, tertiary: key });
  };

  // 과학/제2외국어 3단 필터용 중복 선택 토글
  const handleMultiTertiaryToggle = (key: string) => {
    const currentSelections = filter.tertiary ? filter.tertiary.split(',').filter(Boolean) : [];
    const isSelected = currentSelections.includes(key);

    let newSelections: string[];
    if (isSelected) {
      // 선택 해제
      newSelections = currentSelections.filter(k => k !== key);
    } else {
      // 선택 추가
      newSelections = [...currentSelections, key];
    }

    // 빈 배열이면 null, 아니면 쉼표로 연결
    const newTertiary = newSelections.length > 0 ? newSelections.join(',') : null;
    onFilterChange({ ...filter, tertiary: newTertiary });
  };

  const getAnimationStyle = (): React.CSSProperties => {
    switch (bottomSheetHeight) {
      case 'full':
        return { opacity: 0, transform: 'translateY(-10px)', pointerEvents: 'none' as const };
      case 'half':
        return { opacity: 0.7, transform: 'translateY(-2px)' };
      default:
        return { opacity: 1, transform: 'translateY(0)' };
    }
  };

  // 1차 필터 렌더링 (단일 flex-wrap - 화면 크기에 맞게 자동 배치)
  // 2차 옵션이 없는 카테고리(초등담임, 특수, 기타)는 선택 시 색상 반전
  const renderPrimaryLevel = () => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRIMARY_CATEGORIES.map(({ key, label }) => {
        const colors = PRIMARY_COLORS[key];
        const hasSecondary = !!SECONDARY_OPTIONS[key];
        // 다중 선택: primary 또는 additionalPrimary에 포함되면 선택 상태
        const isSelected = (filter.primary === key || filter.additionalPrimary === key) && !hasSecondary;

        return (
          <button
            key={key}
            onClick={() => handlePrimaryClick(key)}
            className="flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium border-2 transition-all duration-200 active:scale-95"
            style={{
              borderColor: colors.base + '60',
              backgroundColor: isSelected ? colors.base : 'white',
              color: isSelected ? 'white' : colors.text,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  // 방과후/돌봄 검색 UI 렌더링
  const renderAfterSchoolSearch = () => {
    return (
      <div className="flex flex-col gap-2">
        {/* 1줄: 뒤로가기 + 검색창 */}
        <div className="flex items-center gap-2 max-w-full">
          <button
            onClick={handleBack}
            className="flex items-center gap-0.5 flex-shrink-0 px-2 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
            style={{
              backgroundColor: currentColors?.base,
              color: 'white',
            }}
          >
            <ChevronLeft size={14} />
            방과후/돌봄
          </button>

          {/* 검색 입력창 */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-[180px] px-2 py-1.5 bg-gray-100 rounded-full">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="과목 검색..."
              className="bg-transparent border-none outline-none text-xs text-gray-800 placeholder-gray-400 flex-1 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  onFilterChange({ ...filter, secondary: null });
                }}
                className="p-0.5 text-gray-400 active:text-gray-600 transition-colors flex-shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* 2줄: 인기 키워드 칩 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {AFTERSCHOOL_CATEGORY_CHIPS.map((keyword) => {
            const isSelected = filter.secondary === keyword;

            return (
              <button
                key={keyword}
                onClick={() => handlePopularKeywordClick(keyword)}
                className="flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                style={{
                  backgroundColor: isSelected ? currentColors?.light : '#F1F5F9',
                  color: isSelected ? currentColors?.text : '#64748B',
                  border: isSelected ? `1px solid ${currentColors?.base}40` : '1px solid transparent',
                }}
              >
                {keyword}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 2차 필터 렌더링 (카테고리별 최적화)
  const renderSecondaryLevel = () => {
    // 방과후/돌봄은 검색 UI로 대체
    if (filter.primary === '방과후/돌봄') {
      return renderAfterSchoolSearch();
    }

    if (!filter.primary || !secondaryOptions) return null;

    const primaryLabel = PRIMARY_CATEGORIES.find(c => c.key === filter.primary)?.label || '';
    const optionCount = secondaryOptions.length;

    // 카테고리별 줄 수 결정
    // 유치원 (2개), 비교과 (4개), 행정 (7개): 1줄
    // 교과과목 (12개): 2줄 (6개씩)
    let rows: { key: string; label: string }[][] = [];

    if (optionCount <= 8) {
      // 1줄: 유치원, 비교과, 행정·교육지원
      rows = [secondaryOptions];
    } else {
      // 2줄: 교과과목
      // 1줄: 국어, 영어, 수학, 과학, 사회 (5개) + 뒤로가기 버튼
      // 2줄: 체육, 음악, 미술, 기술가정, 정보, 도덕, 제2외국어 (7개)
      rows = [
        secondaryOptions.slice(0, 5),   // 국어~사회
        secondaryOptions.slice(5),      // 체육~제2외국어
      ];
    }

    return (
      <div className="flex flex-col gap-1.5">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-1.5 flex-wrap"
          >
            {/* 첫 줄에만 뒤로가기 버튼 */}
            {rowIndex === 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-0.5 flex-shrink-0 px-2 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                style={{
                  backgroundColor: currentColors?.base,
                  color: 'white',
                }}
              >
                <ChevronLeft size={14} />
                {primaryLabel}
              </button>
            )}

            {row.map(({ key, label }) => {
              const isSelected = filter.secondary === key;

              return (
                <button
                  key={key}
                  onClick={() => handleSecondaryClick(key)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                  style={{
                    backgroundColor: isSelected ? currentColors?.light : '#F1F5F9',
                    color: isSelected ? currentColors?.text : '#64748B',
                    border: isSelected ? `1px solid ${currentColors?.base}40` : '1px solid transparent',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // 3차 필터 렌더링 (교과과목 → 과목 선택 후)
  const renderTertiaryLevel = () => {
    if (!filter.secondary) return null;

    const secondaryLabel = secondaryOptions?.find(o => o.key === filter.secondary)?.label || '';

    // 과학/제2외국어는 특수 3단 필터 사용 (중복 선택 가능)
    const isSpecialTertiary = SUBJECTS_WITH_SPECIAL_TERTIARY.includes(filter.secondary as typeof SUBJECTS_WITH_SPECIAL_TERTIARY[number]);
    const specialOptions = filter.secondary === '과학'
      ? SCIENCE_TERTIARY_OPTIONS
      : filter.secondary === '제2외국어'
        ? FOREIGN_LANG_TERTIARY_OPTIONS
        : null;

    if (isSpecialTertiary && specialOptions) {
      // 특수 3단 필터 (중복 선택 체크박스 - 칩 스타일)
      const currentSelections = filter.tertiary ? filter.tertiary.split(',').filter(Boolean) : [];

      return (
        <div className="flex flex-col gap-2">
          {/* 1줄: 뒤로가기 + 전체 + 학교급 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={handleBack}
              className="flex items-center gap-0.5 flex-shrink-0 px-2 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
              style={{
                backgroundColor: currentColors?.base,
                color: 'white',
              }}
            >
              <ChevronLeft size={14} />
              {secondaryLabel}
            </button>

            {/* 전체 옵션 */}
            <button
              onClick={() => onFilterChange({ ...filter, tertiary: null })}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: currentSelections.length === 0 ? currentColors?.light : '#F1F5F9',
                color: currentSelections.length === 0 ? currentColors?.text : '#64748B',
                border: currentSelections.length === 0 ? `1px solid ${currentColors?.base}40` : '1px solid transparent',
              }}
            >
              전체
            </button>

            {/* 학교급 옵션 (초등/중등/고등) */}
            {specialOptions
              .filter(opt => opt.type === 'schoolLevel')
              .map(({ key, label }) => {
                const isSelected = currentSelections.includes(key);

                return (
                  <button
                    key={key}
                    onClick={() => handleMultiTertiaryToggle(key)}
                    className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: isSelected ? currentColors?.light : '#F1F5F9',
                      color: isSelected ? currentColors?.text : '#64748B',
                      border: isSelected ? `1px solid ${currentColors?.base}40` : '1px solid transparent',
                    }}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} />}
                    {label}
                  </button>
                );
              })}
          </div>

          {/* 2줄: 세부과목/언어 */}
          <div className="flex items-center gap-1.5 flex-wrap pl-1">
            {specialOptions
              .filter(opt => opt.type !== 'schoolLevel')
              .map(({ key, label }) => {
                const isSelected = currentSelections.includes(key);

                return (
                  <button
                    key={key}
                    onClick={() => handleMultiTertiaryToggle(key)}
                    className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: isSelected ? currentColors?.light : '#F1F5F9',
                      color: isSelected ? currentColors?.text : '#64748B',
                      border: isSelected ? `1px solid ${currentColors?.base}40` : '1px solid transparent',
                    }}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} />}
                    {label}
                  </button>
                );
              })}
          </div>
        </div>
      );
    }

    // 기본 3차 필터 (단일 선택)
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 뒤로가기 버튼 */}
        <button
          onClick={handleBack}
          className="flex items-center gap-0.5 flex-shrink-0 px-2 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
          style={{
            backgroundColor: currentColors?.base,
            color: 'white',
          }}
        >
          <ChevronLeft size={14} />
          {secondaryLabel}
        </button>

        {/* 전체 옵션 */}
        <button
          onClick={() => handleTertiaryClick(null)}
          className="flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
          style={{
            backgroundColor: !filter.tertiary ? currentColors?.light : '#F1F5F9',
            color: !filter.tertiary ? currentColors?.text : '#64748B',
            border: !filter.tertiary ? `1px solid ${currentColors?.base}40` : '1px solid transparent',
          }}
        >
          전체
        </button>

        {/* 학교급 옵션들 */}
        {TERTIARY_OPTIONS.map(({ key, label }) => {
          const isSelected = filter.tertiary === key;

          return (
            <button
              key={key}
              onClick={() => handleTertiaryClick(key)}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-95"
              style={{
                backgroundColor: isSelected ? currentColors?.light : '#F1F5F9',
                color: isSelected ? currentColors?.text : '#64748B',
                border: isSelected ? `1px solid ${currentColors?.base}40` : '1px solid transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="px-4 pb-2 transition-all duration-300 ease-out"
      style={getAnimationStyle()}
    >
      {/* 현재 단계에 맞는 UI 렌더링 */}
      {currentLevel === 'primary' && renderPrimaryLevel()}
      {currentLevel === 'secondary' && renderSecondaryLevel()}
      {currentLevel === 'tertiary' && renderTertiaryLevel()}
    </div>
  );
};

export default MobileQuickFilters;
