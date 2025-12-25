import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';
import { useSearchStore } from '@/stores/searchStore';
import { REGION_OPTIONS } from '@/lib/constants/filters';
import { RECOMMENDED_KEYWORDS } from '@/lib/utils/searchHistory';

interface FilterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FilterSidebar({ isOpen, onClose }: FilterSidebarProps) {
    const { filters, toggleFilter, resetFilters } = useSearchStore();

    const sections = [
        {
            id: 'region',
            title: '📍 지역',
            options: REGION_OPTIONS.filter(r => r !== '서울 전체' && r !== '경기도 전체'), // "전체" 옵션은 별도 처리하거나 제외
            key: 'region' as const,
        },
        {
            id: 'schoolLevel',
            title: '📚 학교급',
            options: RECOMMENDED_KEYWORDS.schoolLevel,
            key: 'schoolLevel' as const,
        },
        {
            id: 'subject',
            title: '📖 교과목',
            options: RECOMMENDED_KEYWORDS.subjects,
            key: 'subject' as const,
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
                    />

                    {/* Sidebar (Bottom Sheet style on mobile, Sidebar on desktop could be different but assuming mobile-first) */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[100] max-h-[85vh] flex flex-col shadow-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900">필터 설정</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetFilters}
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors px-2 py-1"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>초기화</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Content (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {sections.map((section) => (
                                <div key={section.id}>
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">{section.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {section.options.map((option) => {
                                            const isSelected = filters[section.key].includes(option);
                                            return (
                                                <button
                                                    key={option}
                                                    onClick={() => toggleFilter(section.key, option)}
                                                    className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border
                            ${isSelected
                                                            ? 'bg-[#68B2FF] border-[#68B2FF] text-white shadow-md'
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                        }
                          `}
                                                >
                                                    {option}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer containing Apply button */}
                        <div className="p-4 border-t border-gray-100 bg-white pb-8">
                            <button
                                onClick={onClose}
                                className="w-full bg-[#68B2FF] text-white font-bold py-3.5 rounded-xl hover:bg-[#5aa0eb] active:scale-[0.98] transition-all shadow-lg shadow-blue-100"
                            >
                                필터 적용하기 ({filters.region.length + filters.schoolLevel.length + filters.subject.length}개)
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
