import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { REGION_OPTIONS_HIERARCHICAL, GYEONGGI_SUBREGIONS } from '@/lib/constants/filters';
import { RECOMMENDED_KEYWORDS } from '@/lib/utils/searchHistory';

interface FilterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FilterSidebar({ isOpen, onClose }: FilterSidebarProps) {
    const { filters, toggleFilter, resetFilters, setFilter } = useSearchStore();
    const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

    const sections = [
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

    // 지역 필터가 해당 시도 또는 해당 시도의 하위지역을 포함하는지 확인
    const isRegionSelected = (regionName: string) => {
        // 시도 자체가 선택된 경우
        if (filters.region.includes(regionName)) return true;
        // 해당 시도의 하위지역이 선택된 경우 (경기도만)
        if (regionName === '경기') {
            return filters.region.some(r => r.startsWith('경기-'));
        }
        return false;
    };

    // 하위지역 선택 여부 확인
    const isSubregionSelected = (subregion: string) => {
        return filters.region.includes(`경기-${subregion}`);
    };

    // 경기 전체 선택 여부 확인
    const isGyeonggiAllSelected = () => {
        return filters.region.includes('경기');
    };

    // 시도 클릭 핸들러
    const handleRegionClick = (regionName: string, hasSubregions: boolean) => {
        if (hasSubregions) {
            // 하위 지역이 있는 경우 확장/축소 토글
            setExpandedRegion(expandedRegion === regionName ? null : regionName);
        } else {
            // 하위 지역이 없는 경우 바로 토글
            toggleFilter('region', regionName);
        }
    };

    // 경기 전체 선택 핸들러
    const handleGyeonggiAllClick = () => {
        const currentGyeonggiFilters = filters.region.filter(r => r === '경기' || r.startsWith('경기-'));

        if (filters.region.includes('경기')) {
            // 경기 전체가 이미 선택된 경우 → 해제
            setFilter('region', filters.region.filter(r => r !== '경기'));
        } else {
            // 경기 전체 선택 → 기존 경기 하위지역 모두 제거하고 '경기'만 추가
            const otherRegions = filters.region.filter(r => !r.startsWith('경기-') && r !== '경기');
            setFilter('region', [...otherRegions, '경기']);
        }
    };

    // 경기 하위지역 선택 핸들러
    const handleSubregionClick = (subregion: string) => {
        const subregionKey = `경기-${subregion}`;

        if (filters.region.includes(subregionKey)) {
            // 이미 선택된 하위지역 해제
            setFilter('region', filters.region.filter(r => r !== subregionKey));
        } else {
            // 하위지역 추가 (경기 전체가 선택되어 있으면 제거)
            const newRegions = filters.region.filter(r => r !== '경기');
            setFilter('region', [...newRegions, subregionKey]);
        }
    };

    // 선택된 경기 하위지역 개수
    const selectedGyeonggiSubregionsCount = filters.region.filter(r => r.startsWith('경기-')).length;

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
                                    onClick={() => {
                                        resetFilters();
                                        setExpandedRegion(null);
                                    }}
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
                            {/* 지역 섹션 (계층적) */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3">📍 지역</h3>
                                <div className="flex flex-wrap gap-2">
                                    {REGION_OPTIONS_HIERARCHICAL.map((region) => {
                                        const hasSubregions = !!region.subregions;
                                        const isSelected = isRegionSelected(region.name);
                                        const isExpanded = expandedRegion === region.name;

                                        return (
                                            <button
                                                key={region.name}
                                                onClick={() => handleRegionClick(region.name, hasSubregions)}
                                                className={`
                                                    px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border flex items-center gap-1
                                                    ${isSelected
                                                        ? 'bg-[#68B2FF] border-[#68B2FF] text-white shadow-md'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }
                                                `}
                                            >
                                                {region.name}
                                                {hasSubregions && (
                                                    isExpanded
                                                        ? <ChevronUp className="w-3.5 h-3.5" />
                                                        : <ChevronDown className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 경기도 하위 지역 (확장 시 표시) */}
                                <AnimatePresence>
                                    {expandedRegion === '경기' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="mt-3 overflow-hidden"
                                        >
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-gray-500">
                                                        경기도 시군 선택
                                                        {selectedGyeonggiSubregionsCount > 0 && (
                                                            <span className="text-[#68B2FF] font-medium ml-1">
                                                                ({selectedGyeonggiSubregionsCount}개 선택)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {/* 경기 전체 버튼 */}
                                                    <button
                                                        onClick={handleGyeonggiAllClick}
                                                        className={`
                                                            px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                                                            ${isGyeonggiAllSelected()
                                                                ? 'bg-[#68B2FF] border-[#68B2FF] text-white shadow-sm'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                                                            }
                                                        `}
                                                    >
                                                        전체
                                                    </button>
                                                    {/* 개별 시군 버튼 */}
                                                    {GYEONGGI_SUBREGIONS.map((subregion) => (
                                                        <button
                                                            key={subregion}
                                                            onClick={() => handleSubregionClick(subregion)}
                                                            disabled={isGyeonggiAllSelected()}
                                                            className={`
                                                                px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border
                                                                ${isGyeonggiAllSelected()
                                                                    ? 'bg-blue-50 border-blue-100 text-blue-400 cursor-not-allowed'
                                                                    : isSubregionSelected(subregion)
                                                                        ? 'bg-[#5aa0eb] border-[#5aa0eb] text-white shadow-sm'
                                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                                                                }
                                                            `}
                                                        >
                                                            {subregion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* 나머지 섹션들 (학교급, 교과목) */}
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
