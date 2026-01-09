import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchStore } from '@/stores/searchStore';
import { LOCATIONS, SCHOOL_LEVELS, JOB_TYPES, SUBJECTS } from '../constants';
import type { SortOptionValue } from '@/types';

type FilterKey = 'region' | 'schoolLevel' | 'category' | 'subject';

const FILTER_CONFIG = [
  { key: 'region' as FilterKey, label: '지역', options: LOCATIONS },
  { key: 'schoolLevel' as FilterKey, label: '학교급', options: SCHOOL_LEVELS },
  { key: 'category' as FilterKey, label: '유형', options: JOB_TYPES },
  { key: 'subject' as FilterKey, label: '과목', options: SUBJECTS },
];

export const JobFilters: React.FC = () => {
  const filters = useSearchStore(state => state.filters);
  const toggleFilter = useSearchStore(state => state.toggleFilter);
  const setFilter = useSearchStore(state => state.setFilter);
  const resetFilters = useSearchStore(state => state.resetFilters);

  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef<Record<FilterKey, HTMLButtonElement | null>>({
    region: null,
    schoolLevel: null,
    category: null,
    subject: null,
  });

  // 드롭다운 위치 업데이트 함수
  const updateDropdownPosition = (key: FilterKey) => {
    const button = buttonRefs.current[key];
    if (button) {
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  };

  // 스크롤/리사이즈 시 위치 업데이트
  useEffect(() => {
    if (!openDropdown) return;

    const handleUpdate = () => {
      updateDropdownPosition(openDropdown);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [openDropdown]);

  const handleToggleDropdown = (key: FilterKey) => {
    if (openDropdown === key) {
      setOpenDropdown(null);
    } else {
      updateDropdownPosition(key);
      setOpenDropdown(key);
    }
  };

  const handleSelectOption = (key: FilterKey, value: string) => {
    toggleFilter(key, value);
  };

  const handleReset = () => {
    resetFilters();
    setOpenDropdown(null);
  };

  const getCount = (key: FilterKey) => {
    const val = filters[key];
    return Array.isArray(val) ? val.length : 0;
  };

  const isChecked = (key: FilterKey, value: string) => {
    const val = filters[key];
    return Array.isArray(val) && val.includes(value);
  };

  // 선택된 필터들
  const selectedItems: { key: FilterKey; value: string; displayLabel: string }[] = [];
  FILTER_CONFIG.forEach(({ key, label }) => {
    const vals = filters[key];
    if (Array.isArray(vals)) {
      vals.forEach(v => selectedItems.push({ key, value: v, displayLabel: `${label}: ${v}` }));
    }
  });

  // 현재 열린 드롭다운의 옵션들
  const currentConfig = FILTER_CONFIG.find(c => c.key === openDropdown);

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          {/* 초기화 버튼 */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 flex-shrink-0"
            title="필터 초기화"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />

          {/* 필터 버튼들 */}
          {FILTER_CONFIG.map(({ key, label }) => {
            const count = getCount(key);
            const isOpen = openDropdown === key;

            return (
              <button
                key={key}
                ref={(el) => { buttonRefs.current[key] = el; }}
                type="button"
                onClick={() => handleToggleDropdown(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  count > 0
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
                {count > 0 && <span className="text-xs">({count})</span>}
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            );
          })}
        </div>

        {/* 정렬 */}
        <div className="hidden md:flex items-center text-sm text-gray-500 flex-shrink-0">
          <select
            value={filters.sort}
            onChange={(e) => setFilter('sort', e.target.value as SortOptionValue)}
            className="border-none bg-transparent outline-none cursor-pointer hover:text-gray-800"
          >
            <option value="최신순">최신순</option>
            <option value="마감임박순">마감임박순</option>
          </select>
        </div>
      </div>

      {/* 드롭다운 - Portal로 body에 렌더링 */}
      {openDropdown && currentConfig && createPortal(
        <>
          {/* 배경 오버레이 - 헤더(z-50) 아래에 위치 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenDropdown(null)}
          />
          {/* 드롭다운 메뉴 - 헤더(z-50) 아래에 위치 */}
          <div
            className="fixed w-32 bg-white rounded-xl shadow-xl border border-gray-200 z-40 max-h-64 overflow-y-auto"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
          >
            <div className="p-2">
              {currentConfig.options.map(option => (
                <label
                  key={option}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 ${
                    isChecked(openDropdown, option) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked(openDropdown, option)}
                    onChange={() => handleSelectOption(openDropdown, option)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className={`text-sm ${isChecked(openDropdown, option) ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 선택된 필터 태그 */}
      {selectedItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedItems.map(({ key, value, displayLabel }) => (
            <button
              key={`${key}-${value}`}
              type="button"
              onClick={() => toggleFilter(key, value)}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
            >
              {displayLabel}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
