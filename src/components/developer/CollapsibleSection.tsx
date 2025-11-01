import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  filterButton?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  count,
  defaultOpen = false,
  filterButton,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 헤더 (토글 버튼) */}
      <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        {/* 좌측: 토글 + 아이콘 + 제목 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1"
        >
          {/* 토글 아이콘 */}
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}

          {/* 섹션 아이콘 */}
          {icon && (
            <div className="text-gray-700">
              {icon}
            </div>
          )}

          {/* 제목 */}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>

          {/* 개수 배지 */}
          {count !== undefined && (
            <span className="px-2.5 py-0.5 text-sm font-medium bg-[#a8c5e0] text-gray-900 rounded-full">
              {count}개
            </span>
          )}
        </button>

        {/* 우측: 필터 버튼 (섹션 열려있을 때만 표시) */}
        {isOpen && filterButton && (
          <div onClick={(e) => e.stopPropagation()} className="ml-2 flex-shrink-0">
            {filterButton}
          </div>
        )}
      </div>

      {/* 컨텐츠 (접혔다 펼쳐지는 부분) */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-200">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
