import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { IconSearch, IconMapPin, IconFilter, IconRefresh } from '@tabler/icons-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
}

interface EmptyStateProps {
  /** 커스텀 일러스트레이션 */
  illustration?: ReactNode;
  /** 제목 */
  title: string;
  /** 설명 텍스트 */
  description?: string;
  /** 액션 버튼들 */
  actions?: EmptyStateAction[];
  /** 추천 검색어 */
  suggestions?: string[];
  /** 추천 검색어 클릭 핸들러 */
  onSuggestionClick?: (suggestion: string) => void;
  /** 타입에 따른 스타일 */
  type?: 'search' | 'filter' | 'location' | 'default';
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
}

/** 기본 일러스트레이션 컴포넌트들 */
function SearchIllustration() {
  return (
    <div className="relative w-24 h-24">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
          <IconSearch size={36} className="text-blue-400" stroke={1.5} />
        </div>
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"
      >
        <span className="text-lg">🔍</span>
      </motion.div>
    </div>
  );
}

function FilterIllustration() {
  return (
    <div className="relative w-24 h-24">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
          <IconFilter size={36} className="text-purple-400" stroke={1.5} />
        </div>
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"
      >
        <span className="text-lg">✨</span>
      </motion.div>
    </div>
  );
}

function LocationIllustration() {
  return (
    <div className="relative w-24 h-24">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
          <IconMapPin size={36} className="text-green-400" stroke={1.5} />
        </div>
      </motion.div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"
      >
        <span className="text-lg">📍</span>
      </motion.div>
    </div>
  );
}

function DefaultIllustration() {
  return (
    <div className="relative w-24 h-24">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
          <span className="text-4xl">📋</span>
        </div>
      </motion.div>
    </div>
  );
}

/** 타입별 기본 일러스트레이션 */
function getDefaultIllustration(type: EmptyStateProps['type']) {
  switch (type) {
    case 'search':
      return <SearchIllustration />;
    case 'filter':
      return <FilterIllustration />;
    case 'location':
      return <LocationIllustration />;
    default:
      return <DefaultIllustration />;
  }
}

/** 크기별 스타일 */
function getSizeStyles(size: EmptyStateProps['size']) {
  switch (size) {
    case 'sm':
      return {
        container: 'py-8 px-4',
        title: 'text-base',
        description: 'text-sm',
        button: 'px-3 py-1.5 text-sm',
      };
    case 'lg':
      return {
        container: 'py-16 px-8',
        title: 'text-xl',
        description: 'text-base',
        button: 'px-5 py-2.5 text-base',
      };
    default:
      return {
        container: 'py-12 px-6',
        title: 'text-lg',
        description: 'text-sm',
        button: 'px-4 py-2 text-sm',
      };
  }
}

export default function EmptyState({
  illustration,
  title,
  description,
  actions,
  suggestions,
  onSuggestionClick,
  type = 'default',
  size = 'md',
}: EmptyStateProps) {
  const styles = getSizeStyles(size);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center text-center ${styles.container}`}
    >
      {/* 일러스트레이션 */}
      <div className="mb-4">
        {illustration || getDefaultIllustration(type)}
      </div>

      {/* 제목 */}
      <h3 className={`font-bold text-gray-800 mb-2 ${styles.title}`}>
        {title}
      </h3>

      {/* 설명 */}
      {description && (
        <p className={`text-gray-500 mb-4 max-w-sm ${styles.description}`}>
          {description}
        </p>
      )}

      {/* 추천 검색어 */}
      {suggestions && suggestions.length > 0 && onSuggestionClick && (
        <div className="flex flex-wrap gap-2 justify-center mb-4 max-w-md">
          <span className="text-xs text-gray-400 w-full mb-1">추천 검색어</span>
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      )}

      {/* 액션 버튼들 */}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={action.onClick}
              className={`
                inline-flex items-center gap-2 rounded-lg font-medium transition-all
                ${styles.button}
                ${action.variant === 'primary'
                  ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {action.icon}
              {action.label}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** 검색 결과 없음 프리셋 */
export function SearchEmptyState({
  query,
  onReset,
  onSuggestionClick,
}: {
  query?: string;
  onReset?: () => void;
  onSuggestionClick?: (suggestion: string) => void;
}) {
  return (
    <EmptyState
      type="search"
      title={query ? `"${query}" 검색 결과가 없어요` : '검색 결과가 없어요'}
      description="다른 검색어나 조건으로 다시 시도해 보세요"
      suggestions={['서울', '경기', '기간제교사', '방과후강사']}
      onSuggestionClick={onSuggestionClick}
      actions={onReset ? [
        {
          label: '필터 초기화',
          onClick: onReset,
          variant: 'secondary',
          icon: <IconRefresh size={16} />,
        },
      ] : undefined}
    />
  );
}

/** 필터 결과 없음 프리셋 */
export function FilterEmptyState({
  onReset,
}: {
  onReset?: () => void;
}) {
  return (
    <EmptyState
      type="filter"
      title="조건에 맞는 공고가 없어요"
      description="필터 조건을 조정하면 더 많은 공고를 볼 수 있어요"
      actions={onReset ? [
        {
          label: '필터 초기화',
          onClick: onReset,
          variant: 'primary',
          icon: <IconRefresh size={16} />,
        },
      ] : undefined}
    />
  );
}

/** 지역 검색 결과 없음 프리셋 */
export function LocationEmptyState({
  location,
  onChangeLocation,
}: {
  location?: string;
  onChangeLocation?: () => void;
}) {
  return (
    <EmptyState
      type="location"
      title={location ? `${location} 지역에 공고가 없어요` : '선택한 지역에 공고가 없어요'}
      description="다른 지역을 선택하거나 전체 지역에서 검색해 보세요"
      actions={onChangeLocation ? [
        {
          label: '다른 지역 선택',
          onClick: onChangeLocation,
          variant: 'primary',
          icon: <IconMapPin size={16} />,
        },
      ] : undefined}
    />
  );
}
