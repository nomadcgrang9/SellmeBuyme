import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconFilter, IconRefresh } from '@tabler/icons-react';

interface FilterTag {
  key: string;
  label: string;
  value: string;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'gray';
}

interface FilterTagsProps {
  /** 활성화된 필터들 */
  filters: FilterTag[];
  /** 개별 필터 제거 핸들러 */
  onRemove: (key: string) => void;
  /** 전체 필터 초기화 핸들러 */
  onClearAll: () => void;
  /** 컴팩트 모드 (모바일) */
  compact?: boolean;
  /** 필터 아이콘 표시 */
  showIcon?: boolean;
}

/** 색상별 스타일 */
const COLOR_STYLES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
};

/** 개별 필터 태그 */
function Tag({
  filter,
  onRemove,
  compact = false,
}: {
  filter: FilterTag;
  onRemove: () => void;
  compact?: boolean;
}) {
  const colorStyle = COLOR_STYLES[filter.color || 'blue'];

  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -5 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${colorStyle}
        ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        font-medium
      `}
    >
      {!compact && (
        <span className="text-gray-400 text-xs mr-0.5">{filter.label}:</span>
      )}
      <span>{filter.value}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={`
          ml-0.5 rounded-full transition-colors hover:bg-black/10
          ${compact ? 'p-0.5' : 'p-1'}
        `}
        aria-label={`${filter.value} 필터 제거`}
      >
        <IconX size={compact ? 10 : 12} />
      </button>
    </motion.span>
  );
}

export default function FilterTags({
  filters,
  onRemove,
  onClearAll,
  compact = false,
  showIcon = true,
}: FilterTagsProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {/* 필터 아이콘 */}
      {showIcon && !compact && (
        <div className="flex items-center gap-1 text-gray-400 mr-1">
          <IconFilter size={14} />
          <span className="text-xs">필터</span>
        </div>
      )}

      {/* 필터 태그들 */}
      <AnimatePresence mode="popLayout">
        {filters.map((filter) => (
          <Tag
            key={filter.key}
            filter={filter}
            onRemove={() => onRemove(filter.key)}
            compact={compact}
          />
        ))}
      </AnimatePresence>

      {/* 전체 초기화 버튼 */}
      {filters.length > 1 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClearAll}
          className={`
            inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors
            ${compact ? 'text-xs' : 'text-sm'}
          `}
        >
          <IconRefresh size={compact ? 12 : 14} />
          {!compact && <span>초기화</span>}
        </motion.button>
      )}
    </div>
  );
}

/** 필터 상태 요약 (모바일 헤더용) */
export function FilterSummaryBadge({
  count,
  onClick,
}: {
  count: number;
  onClick?: () => void;
}) {
  if (count === 0) {
    return null;
  }

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500 text-white text-xs font-medium"
    >
      <IconFilter size={12} />
      <span>{count}</span>
    </motion.button>
  );
}

/** 필터 선택 버튼 (드롭다운 트리거용) */
export function FilterButton({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
        ${active
          ? 'border-blue-300 bg-blue-50 text-blue-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
        }
      `}
    >
      <span className="text-sm font-medium">
        {value || label}
      </span>
      <svg
        className={`w-4 h-4 transition-transform ${active ? 'rotate-180' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}
