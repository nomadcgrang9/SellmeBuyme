import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

interface SchoolLevelData {
  kindergarten: boolean;
  elementary: boolean;
  secondary: boolean;
  high: boolean;
  special: boolean;
  adultTraining: boolean;
  other?: string;
}

interface SchoolLevelSelectorProps {
  value: SchoolLevelData;
  onChange: (value: SchoolLevelData) => void;
  error?: string;
}

const SCHOOL_LEVELS = [
  { key: 'kindergarten', label: '유치원' },
  { key: 'elementary', label: '초등' },
  { key: 'secondary', label: '중등' },
  { key: 'high', label: '고등' },
  { key: 'special', label: '특수' },
  { key: 'adultTraining', label: '성인대상 강의연수' },
] as const;

export default function SchoolLevelSelector({ value, onChange, error }: SchoolLevelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getDisplayText = () => {
    const selected: string[] = SCHOOL_LEVELS.filter(level => value[level.key]).map(level => level.label);
    if (value.other) selected.push('기타');

    if (selected.length === 0) return '학교급 선택';
    if (selected.length === 1) return selected[0];
    return `${selected[0]} 외 ${selected.length - 1}개`;
  };

  const handleCheckboxChange = (key: keyof Omit<SchoolLevelData, 'other'>) => {
    onChange({
      ...value,
      [key]: !value[key],
    });
  };

  const handleOtherChange = (otherValue: string) => {
    onChange({
      ...value,
      other: otherValue,
    });
  };

  return (
    <div className="space-y-0.5 relative">
      <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
        학교급 <span className="text-red-500">*</span>
      </label>

      {/* 드롭다운 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors flex items-center justify-between"
      >
        <span className={value && Object.values(value).some(v => v) ? 'text-gray-900' : 'text-gray-400'}>
          {getDisplayText()}
        </span>
        <IconChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-2 max-h-[200px] overflow-y-auto">
          <div className="space-y-1">
            {/* 학교급 체크박스 */}
            {SCHOOL_LEVELS.map(level => (
              <label key={level.key} className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={value[level.key]}
                  onChange={() => handleCheckboxChange(level.key)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-[12px] text-gray-700">{level.label}</span>
              </label>
            ))}

            {/* 기타 입력 */}
            <div className="pt-1 border-t border-gray-200">
              <label className="flex items-start gap-1.5 p-1">
                <input
                  type="checkbox"
                  checked={!!value.other}
                  onChange={() => {
                    if (value.other) {
                      handleOtherChange('');
                    }
                  }}
                  className="w-3.5 h-3.5 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-[12px] text-gray-700 block mb-0.5">기타</span>
                  {(value.other !== undefined) && (
                    <input
                      type="text"
                      value={value.other || ''}
                      onChange={(e) => handleOtherChange(e.target.value)}
                      placeholder="직접 입력"
                      className="w-full h-6 px-1.5 text-[11px] border border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* 선택 완료 버튼 */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 h-7 bg-gradient-to-r from-[#7aa3cc] to-[#68B2FF] text-white text-[12px] font-semibold rounded hover:opacity-90 transition-opacity"
          >
            선택 완료
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <p className="text-[11px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
