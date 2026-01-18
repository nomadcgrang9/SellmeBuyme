import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconSearch } from '@tabler/icons-react';

interface SearchResultSummaryProps {
  /** 검색어 */
  query?: string;
  /** 검색 결과 수 */
  count: number;
  /** 로딩 상태 */
  loading?: boolean;
  /** 활성화된 필터들 */
  filters?: {
    schoolLevel?: string;
    subject?: string;
    region?: string;
    viewType?: 'job' | 'talent' | 'experience' | 'all';
  };
  /** 필터 제거 핸들러 */
  onRemoveFilter?: (key: string) => void;
  /** 전체 초기화 핸들러 */
  onClearAll?: () => void;
}

/** 뷰 타입 한글 매핑 */
const VIEW_TYPE_LABELS: Record<string, string> = {
  job: '학교공고',
  talent: '구직교사',
  experience: '체험 프로그램',
  all: '전체',
};

/** 필터 태그 컴포넌트 */
function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove?: () => void;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 p-0.5 rounded-full hover:bg-blue-100 transition-colors"
          aria-label={`${label} 필터 제거`}
        >
          <IconX size={12} />
        </button>
      )}
    </motion.span>
  );
}

export default function SearchResultSummary({
  query,
  count,
  loading = false,
  filters,
  onRemoveFilter,
  onClearAll,
}: SearchResultSummaryProps) {
  // 활성화된 필터 목록 생성
  const activeFilters: Array<{ key: string; label: string }> = [];

  if (filters?.region) {
    activeFilters.push({ key: 'region', label: filters.region });
  }
  if (filters?.schoolLevel) {
    activeFilters.push({ key: 'schoolLevel', label: filters.schoolLevel });
  }
  if (filters?.subject) {
    activeFilters.push({ key: 'subject', label: filters.subject });
  }

  const viewTypeLabel = filters?.viewType && filters.viewType !== 'all'
    ? VIEW_TYPE_LABELS[filters.viewType]
    : null;

  // 검색어나 필터가 없으면 표시하지 않음
  const hasContext = query || activeFilters.length > 0;

  if (!hasContext && !loading) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {/* 검색 아이콘 */}
      {query && (
        <IconSearch size={16} className="text-gray-400 flex-shrink-0" />
      )}

      {/* 검색 결과 텍스트 */}
      <span className="text-gray-600">
        {loading ? (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            검색 중...
          </motion.span>
        ) : (
          <>
            {query && (
              <span className="font-medium text-gray-900">"{query}"</span>
            )}
            {viewTypeLabel && (
              <span className="text-gray-500">
                {query ? ' · ' : ''}{viewTypeLabel}
              </span>
            )}
            {activeFilters.length > 0 && !query && !viewTypeLabel && (
              <span className="text-gray-500">필터 적용됨</span>
            )}
            <span className="ml-1">
              검색 결과 <span className="font-semibold text-blue-600">{count.toLocaleString()}</span>개
            </span>
          </>
        )}
      </span>

      {/* 필터 태그들 */}
      <AnimatePresence mode="popLayout">
        {activeFilters.map((filter) => (
          <FilterTag
            key={filter.key}
            label={filter.label}
            onRemove={onRemoveFilter ? () => onRemoveFilter(filter.key) : undefined}
          />
        ))}
      </AnimatePresence>

      {/* 전체 초기화 버튼 */}
      {onClearAll && (query || activeFilters.length > 0) && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClearAll}
          className="ml-2 text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
        >
          초기화
        </motion.button>
      )}
    </div>
  );
}

/** 컴팩트 버전 (모바일용) */
export function CompactSearchResultSummary({
  count,
  viewType,
}: {
  count: number;
  viewType?: 'job' | 'talent' | 'experience' | 'all';
}) {
  const label = viewType && viewType !== 'all' ? VIEW_TYPE_LABELS[viewType] : '공고';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label} 목록</span>
      <span className="text-sm font-semibold text-blue-600">{count.toLocaleString()}개</span>
    </div>
  );
}
