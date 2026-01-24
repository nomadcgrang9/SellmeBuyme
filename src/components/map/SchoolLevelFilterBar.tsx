// 학교급 필터 하단 메뉴바 컴포넌트
// 6가지 학교급(유치원, 초등학교, 중학교, 고등학교, 특수학교, 기타) 필터 버튼
// 다중 선택 지원, 라이트 글래스모피즘 + 학교급별 컬러 포인트
// 작성일: 2026-01-24
// 업데이트: 개선된 색상 팔레트 (마커와 동일), 공고 개수 배지 제거

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface SchoolLevelFilterBarProps {
  selectedLevels: string[];
  onToggleLevel: (level: string) => void;
  /** 전체 초기화 콜백 (선택적) */
  onClearAll?: () => void;
  /** 긴급 공고만 필터링 상태 */
  urgentOnly?: boolean;
  /** 긴급 필터 토글 콜백 */
  onToggleUrgent?: () => void;
}

// 개선된 색상 팔레트 - 마커와 동일, 색상환에서 균등 분산
// 유치원: Warm Brown, 초등: Green, 중학: Blue, 고등: Deep Purple, 특수: Amber, 기타: Blue Grey
const SCHOOL_LEVEL_COLORS: Record<string, { base: string; light: string; text: string }> = {
  '유치원':   { base: '#8D6E63', light: '#EFEBE9', text: '#3E2723' },
  '초등학교': { base: '#4CAF50', light: '#E8F5E9', text: '#1B5E20' },
  '중학교':   { base: '#2196F3', light: '#E3F2FD', text: '#0D47A1' },
  '고등학교': { base: '#7C4DFF', light: '#EDE7F6', text: '#4A148C' },
  '특수학교': { base: '#FF9800', light: '#FFF3E0', text: '#E65100' },
  '기타':     { base: '#607D8B', light: '#ECEFF1', text: '#263238' },
};

const SCHOOL_LEVELS = [
  { key: '유치원', label: '유치원' },
  { key: '초등학교', label: '초등학교' },
  { key: '중학교', label: '중학교' },
  { key: '고등학교', label: '고등학교' },
  { key: '특수학교', label: '특수학교' },
  { key: '기타', label: '기타' },
];

export default function SchoolLevelFilterBar({
  selectedLevels,
  onToggleLevel,
  onClearAll,
  urgentOnly = false,
  onToggleUrgent,
}: SchoolLevelFilterBarProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [isUrgentHovered, setIsUrgentHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-hide"
      style={{
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* 긴급 공고 필터 버튼 */}
      {onToggleUrgent && (
        <>
          <button
            onClick={onToggleUrgent}
            onMouseEnter={() => setIsUrgentHovered(true)}
            onMouseLeave={() => setIsUrgentHovered(false)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap snap-center"
            style={{
              color: urgentOnly ? '#DC2626' : isUrgentHovered ? '#DC2626' : '#64748B',
              backgroundColor: urgentOnly ? '#FEE2E2' : isUrgentHovered ? '#FEF2F2' : 'transparent',
              borderRadius: '8px',
              transform: isUrgentHovered && !urgentOnly ? 'scale(1.02)' : 'scale(1)',
            }}
            title="D-3 이하 임박 공고만 표시"
          >
            <span
              className="flex items-center justify-center transition-all duration-200 flex-shrink-0"
              style={{
                width: urgentOnly ? '16px' : isUrgentHovered ? '15px' : '14px',
                height: urgentOnly ? '16px' : isUrgentHovered ? '15px' : '14px',
              }}
            >
              <AlertTriangle
                size={urgentOnly ? 14 : isUrgentHovered ? 13 : 12}
                className={urgentOnly ? 'text-red-600' : isUrgentHovered ? 'text-red-500' : 'text-gray-400'}
                style={{
                  filter: urgentOnly ? 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))' : 'none',
                }}
              />
            </span>
            <span>임박</span>
          </button>
          {/* 구분선 */}
          <div className="w-px h-5 bg-gray-200 mx-1" />
        </>
      )}

      {SCHOOL_LEVELS.map(({ key, label }) => {
        const isSelected = selectedLevels.includes(key);
        const isHovered = hoveredKey === key;
        const colors = SCHOOL_LEVEL_COLORS[key];

        // 상태별 스타일 계산
        const getDotSize = () => {
          if (isSelected) return '7px';
          if (isHovered) return '6px';
          return '5px';
        };

        const getDotShadow = () => {
          if (isSelected) return `0 0 6px ${colors.base}`;
          if (isHovered) return `0 0 4px ${colors.base}80`;
          return `0 0 2px ${colors.base}40`;
        };

        const getBackgroundColor = () => {
          if (isSelected) return colors.light;
          if (isHovered) return colors.light;
          return 'transparent';
        };

        const getTextColor = () => {
          if (isSelected) return colors.text;
          if (isHovered) return colors.text;
          return '#64748B';
        };

        return (
          <button
            key={key}
            onClick={() => onToggleLevel(key)}
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap snap-center"
            style={{
              color: getTextColor(),
              backgroundColor: getBackgroundColor(),
              borderRadius: '8px',
              transform: isHovered && !isSelected ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {/* 색상 도트 인디케이터 */}
            <span
              className="rounded-full transition-all duration-200 flex-shrink-0"
              style={{
                width: getDotSize(),
                height: getDotSize(),
                backgroundColor: colors.base,
                boxShadow: getDotShadow(),
              }}
            />
            <span>{label}</span>
          </button>
        );
      })}

      {/* 선택된 필터 개수 표시 + 전체 초기화 버튼 */}
      {selectedLevels.length > 0 && onClearAll && (
        <>
          {/* 구분선 */}
          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* 선택된 개수 */}
          <span className="text-xs font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {selectedLevels.length}
          </span>

          {/* 초기화 버튼 */}
          <button
            onClick={onClearAll}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="필터 초기화"
          >
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}
