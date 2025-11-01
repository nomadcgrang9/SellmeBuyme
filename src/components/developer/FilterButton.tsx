// FilterButton - 필터 드롭다운 버튼
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterButtonProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export default function FilterButton({
  options,
  value,
  onChange,
}: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(opt => opt.value === value)?.label || '전체';

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {selectedLabel}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* 배경 클릭 감지 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 드롭다운 메뉴 - 우측 정렬, 너비 축소 */}
          <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors truncate ${
                  value === option.value
                    ? 'bg-[#a8c5e0] text-gray-900 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
