import React, { useState, useEffect } from 'react';

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    schoolLevels: string[];
    subjects: string[];
    searchQuery: string;
  };
  onApply: (filters: { schoolLevels: string[]; subjects: string[] }) => void;
  schoolLevels: readonly string[];
  subjects: readonly string[];
}

const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  schoolLevels,
  subjects,
}) => {
  const [localFilters, setLocalFilters] = useState({
    schoolLevels: filters.schoolLevels,
    subjects: filters.subjects,
  });

  // 필터 열릴 때 현재 상태 동기화
  useEffect(() => {
    if (isOpen) {
      setLocalFilters({
        schoolLevels: filters.schoolLevels,
        subjects: filters.subjects,
      });
    }
  }, [isOpen, filters]);

  // 바디 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleSchoolLevel = (level: string) => {
    setLocalFilters(prev => ({
      ...prev,
      schoolLevels: prev.schoolLevels.includes(level)
        ? prev.schoolLevels.filter(l => l !== level)
        : [...prev.schoolLevels, level],
    }));
  };

  const toggleSubject = (subject: string) => {
    setLocalFilters(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleReset = () => {
    setLocalFilters({ schoolLevels: [], subjects: [] });
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const activeCount = localFilters.schoolLevels.length + localFilters.subjects.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/40" />

      {/* 시트 */}
      <div
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">필터</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto px-5 py-5" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          {/* 학교급 */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">학교급</h3>
            <div className="flex flex-wrap gap-2">
              {schoolLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => toggleSchoolLevel(level)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200 active:scale-95
                    ${localFilters.schoolLevels.includes(level)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* 과목 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">과목</h3>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => toggleSubject(subject)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200 active:scale-95
                    ${localFilters.subjects.includes(subject)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white safe-area-inset-bottom">
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:bg-gray-200"
            >
              초기화
            </button>
            <button
              onClick={handleApply}
              className="flex-[2] py-3 bg-blue-500 text-white rounded-xl font-medium active:bg-blue-600"
            >
              {activeCount > 0 ? `${activeCount}개 적용` : '적용하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileFilterSheet;
