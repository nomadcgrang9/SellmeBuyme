// SchoolLevelSelector - 학교급 선택 컴포넌트
// elementary (초등), middle (중등), high (고등), mixed (혼합/전체)

import { ChevronDown } from 'lucide-react';
import type { SchoolLevel } from '@/types';

interface SchoolLevelSelectorProps {
  value: SchoolLevel | null;
  onChange: (level: SchoolLevel | null) => void;
  disabled?: boolean;
  required?: boolean;
}

const SCHOOL_LEVELS: { value: SchoolLevel; label: string; description: string }[] = [
  {
    value: 'elementary',
    label: '초등',
    description: '초등학교 대상 채용 공고',
  },
  {
    value: 'middle',
    label: '중등',
    description: '중학교 대상 채용 공고',
  },
  {
    value: 'high',
    label: '고등',
    description: '고등학교 대상 채용 공고',
  },
  {
    value: 'mixed',
    label: '혼합/전체',
    description: '여러 학교급이 혼합되어 있거나 구분이 불분명한 경우',
  },
];

export default function SchoolLevelSelector({
  value,
  onChange,
  disabled = false,
  required = false,
}: SchoolLevelSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value as SchoolLevel | '';
    onChange(selectedValue || null);
  };

  const selectedLevel = SCHOOL_LEVELS.find((level) => level.value === value);

  return (
    <div>
      <label
        htmlFor="schoolLevel"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        학교급 {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          id="schoolLevel"
          value={value ?? ''}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
          required={required}
        >
          <option value="">-- 학교급 선택 --</option>
          {SCHOOL_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {/* 선택된 학교급 설명 표시 */}
      {selectedLevel && (
        <p className="text-xs text-gray-500 mt-1">
          💡 {selectedLevel.description}
        </p>
      )}

      {/* 도움말 */}
      {!value && (
        <p className="text-xs text-gray-500 mt-1">
          💡 게시판이 다루는 학교급을 선택해주세요. 불분명한 경우 "혼합/전체"를 선택하세요.
        </p>
      )}
    </div>
  );
}
