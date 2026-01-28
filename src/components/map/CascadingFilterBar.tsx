/**
 * 캐스케이딩 필터 바 (데스크톱)
 * 스마트 칩 변환형: 1줄 유지, 단계별 변환
 * 다크 글래스모피즘 디자인
 */

import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import {
  type CascadingFilter,
  type PrimaryCategory,
  PRIMARY_CATEGORIES,
  PRIMARY_COLORS,
  SECONDARY_OPTIONS,
  TERTIARY_OPTIONS,
} from '@/lib/utils/jobClassifier';

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

  const secondaryOptions = filter.primary ? SECONDARY_OPTIONS[filter.primary] : null;
  const showTertiaryLevel = filter.primary === '교과과목' && filter.secondary;

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

        return (
          <button
            key={key}
            onClick={() => handlePrimaryClick(key)}
            onMouseEnter={() => setHoveredItem(key)}
            onMouseLeave={() => setHoveredItem(null)}
            className="px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap rounded-lg"
            style={{
              color: isHovered ? colors.text : '#E2E8F0',
              backgroundColor: isHovered ? colors.light : 'transparent',
            }}
          >
            {label}
          </button>
        );
      })}
    </>
  );

  // 2차 필터 렌더링 (1차 선택 후)
  const renderSecondaryLevel = () => {
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
