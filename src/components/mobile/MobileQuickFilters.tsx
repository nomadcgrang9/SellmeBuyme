import React, { useRef, useState, useEffect } from 'react';

// 학교급별 색상 (프로젝트 컬러 팔레트 기반)
const SCHOOL_LEVEL_COLORS: Record<string, { border: string; bg: string; text: string; activeBg: string; activeText: string }> = {
  urgent: { border: 'border-red-400', bg: 'bg-white', text: 'text-red-500', activeBg: 'bg-red-500', activeText: 'text-white' },
  kindergarten: { border: 'border-amber-600', bg: 'bg-white', text: 'text-amber-700', activeBg: 'bg-amber-600', activeText: 'text-white' },
  elementary: { border: 'border-green-500', bg: 'bg-white', text: 'text-green-600', activeBg: 'bg-green-500', activeText: 'text-white' },
  middle: { border: 'border-blue-500', bg: 'bg-white', text: 'text-blue-600', activeBg: 'bg-blue-500', activeText: 'text-white' },
  high: { border: 'border-blue-800', bg: 'bg-white', text: 'text-blue-800', activeBg: 'bg-blue-800', activeText: 'text-white' },
  special: { border: 'border-violet-500', bg: 'bg-white', text: 'text-violet-600', activeBg: 'bg-violet-500', activeText: 'text-white' },
  etc: { border: 'border-gray-400', bg: 'bg-white', text: 'text-gray-600', activeBg: 'bg-gray-500', activeText: 'text-white' },
};

// 과목 목록 (중등/고등용)
const SUBJECTS = ['전체', '국어', '영어', '수학', '사회', '과학', '체육', '음악', '미술', '정보', '보건', '사서', '상담'] as const;

interface QuickFilter {
  id: string;
  label: string;
  shortLabel: string;
  colorKey: keyof typeof SCHOOL_LEVEL_COLORS;
  hasSubjects?: boolean; // 과목 선택 가능 여부
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'kindergarten', label: '유치원', shortLabel: '유', colorKey: 'kindergarten' },
  { id: 'elementary', label: '초등', shortLabel: '초', colorKey: 'elementary' },
  { id: 'middle', label: '중등', shortLabel: '중', colorKey: 'middle', hasSubjects: true },
  { id: 'high', label: '고등', shortLabel: '고', colorKey: 'high', hasSubjects: true },
  { id: 'special', label: '특수', shortLabel: '특', colorKey: 'special' },
  { id: 'etc', label: '기타', shortLabel: '기타', colorKey: 'etc' },
];

interface MobileQuickFiltersProps {
  selectedFilters: string[];
  selectedSubjects: Record<string, string[]>; // { middle: ['국어', '영어'], high: ['수학'] }
  onFilterToggle: (filterId: string) => void;
  onSubjectsChange: (filterId: string, subjects: string[]) => void;
  onReset: () => void;
  urgentCount?: number;
  bottomSheetHeight?: 'collapsed' | 'half' | 'full';
  // 전역 과목 필터 (검색바 필터 버튼 대체)
  globalSubjects: string[];
  onGlobalSubjectsChange: (subjects: string[]) => void;
}

const MobileQuickFilters: React.FC<MobileQuickFiltersProps> = ({
  selectedFilters,
  selectedSubjects,
  onFilterToggle,
  onSubjectsChange,
  onReset,
  bottomSheetHeight = 'collapsed',
  globalSubjects,
  onGlobalSubjectsChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSubjectSheet, setShowSubjectSheet] = useState<string | null>(null);
  const [showGlobalSubjectSheet, setShowGlobalSubjectSheet] = useState(false);
  const [tempSubjects, setTempSubjects] = useState<string[]>([]);

  // 필터 클릭 핸들러
  const handleFilterClick = (filter: QuickFilter) => {
    const isSelected = selectedFilters.includes(filter.id);

    if (filter.hasSubjects) {
      // 중등/고등 - 과목 있는 필터
      if (isSelected) {
        // 이미 선택됨
        const hasSubjects = selectedSubjects[filter.id] && selectedSubjects[filter.id].length > 0;
        if (hasSubjects) {
          // 과목이 선택되어 있으면 → 과목만 초기화 (필터는 유지)
          onSubjectsChange(filter.id, []);
        } else {
          // 과목이 없으면 → 필터 해제
          onFilterToggle(filter.id);
        }
      } else {
        // 선택 안됨 → 과목 모달 열기
        setTempSubjects(selectedSubjects[filter.id] || []);
        setShowSubjectSheet(filter.id);
      }
    } else {
      // 유치원/초등/특수/기타 - 단순 토글
      onFilterToggle(filter.id);
    }
  };

  // 과목 선택 적용
  const handleApplySubjects = () => {
    if (showSubjectSheet) {
      onSubjectsChange(showSubjectSheet, tempSubjects);
      // 과목을 선택했으면 해당 필터도 자동 활성화
      if (!selectedFilters.includes(showSubjectSheet)) {
        onFilterToggle(showSubjectSheet);
      }
      setShowSubjectSheet(null);
    }
  };

  // 전역 과목 시트 열기
  const handleGlobalSubjectClick = () => {
    setTempSubjects(globalSubjects);
    setShowGlobalSubjectSheet(true);
  };

  // 전역 과목 선택 적용
  const handleApplyGlobalSubjects = () => {
    onGlobalSubjectsChange(tempSubjects);
    setShowGlobalSubjectSheet(false);
  };

  // 과목 토글
  const toggleSubject = (subject: string) => {
    if (subject === '전체') {
      // '전체' 클릭 시 모든 과목 선택 해제
      setTempSubjects([]);
    } else {
      setTempSubjects(prev =>
        prev.includes(subject)
          ? prev.filter(s => s !== subject)
          : [...prev, subject]
      );
    }
  };

  // 칩에 표시할 라벨 (과목 포함)
  const getChipLabel = (filter: QuickFilter): string => {
    const subjects = selectedSubjects[filter.id];
    if (subjects && subjects.length > 0) {
      if (subjects.length === 1) {
        return `${filter.shortLabel}:${subjects[0]}`;
      }
      return `${filter.shortLabel}:${subjects.length}개`;
    }
    return filter.shortLabel;
  };

  const hasActiveFilters = selectedFilters.length > 0 || Object.values(selectedSubjects).some(s => s.length > 0) || globalSubjects.length > 0;

  // 과목 칩 라벨
  const getGlobalSubjectLabel = (): string => {
    if (globalSubjects.length === 0) return '과목';
    if (globalSubjects.length === 1) return globalSubjects[0];
    return `과목 ${globalSubjects.length}`;
  };

  // 바텀시트 높이에 따른 애니메이션 스타일
  const getAnimationStyle = (): React.CSSProperties => {
    switch (bottomSheetHeight) {
      case 'full':
        return {
          opacity: 0,
          transform: 'translateY(-10px)',
          pointerEvents: 'none' as const,
        };
      case 'half':
        return {
          opacity: 0.7,
          transform: 'translateY(-2px)',
        };
      default:
        return {
          opacity: 1,
          transform: 'translateY(0)',
        };
    }
  };

  return (
    <>
      {/* 빠른 필터 칩 영역 */}
      <div
        className="px-4 pb-2 transition-all duration-300 ease-out"
        style={getAnimationStyle()}
      >
        <div
          ref={scrollRef}
          className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {QUICK_FILTERS.map((filter) => {
            const isSelected = selectedFilters.includes(filter.id);
            const colors = SCHOOL_LEVEL_COLORS[filter.colorKey];
            const label = getChipLabel(filter);

            return (
              <button
                key={filter.id}
                onClick={() => handleFilterClick(filter)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium
                  border-2 transition-all duration-200 active:scale-95
                  ${isSelected
                    ? `${colors.activeBg} ${colors.activeText} border-transparent`
                    : `${colors.bg} ${colors.text} ${colors.border}`
                  }
                `}
              >
                {label}
              </button>
            );
          })}

        </div>
      </div>

      {/* 과목 선택 센터 모달 */}
      {showSubjectSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowSubjectSheet(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {QUICK_FILTERS.find(f => f.id === showSubjectSheet)?.label} 과목 선택
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">
                  {tempSubjects.length > 0 ? `${tempSubjects.length}개 선택` : '전체'}
                </span>
                <button
                  onClick={() => setShowSubjectSheet(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 과목 그리드 - 구분 없이 모두 동일하게 */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-wrap gap-2 mb-4">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium
                      transition-all duration-200 active:scale-95
                      ${subject === '전체'
                        ? (tempSubjects.length === 0
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700')
                        : (tempSubjects.includes(subject)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700')
                      }
                    `}
                  >
                    {subject}
                  </button>
                ))}
              </div>

              {/* 적용하기 버튼 */}
              <button
                onClick={handleApplySubjects}
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl active:bg-blue-600 transition-colors"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전역 과목 선택 센터 모달 */}
      {showGlobalSubjectSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowGlobalSubjectSheet(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">과목 선택</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">
                  {tempSubjects.length > 0 ? `${tempSubjects.length}개 선택` : '전체'}
                </span>
                <button
                  onClick={() => setShowGlobalSubjectSheet(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 과목 그리드 - 구분 없이 모두 동일하게 */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="flex flex-wrap gap-2 mb-4">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium
                      transition-all duration-200 active:scale-95
                      ${subject === '전체'
                        ? (tempSubjects.length === 0
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700')
                        : (tempSubjects.includes(subject)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700')
                      }
                    `}
                  >
                    {subject}
                  </button>
                ))}
              </div>

              {/* 적용하기 버튼 */}
              <button
                onClick={handleApplyGlobalSubjects}
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl active:bg-blue-600 transition-colors"
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileQuickFilters;
