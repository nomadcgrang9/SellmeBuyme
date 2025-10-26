import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

interface CategorySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
}

const CATEGORY_OPTIONS = [
  '진로체험',
  '문화예술',
  '과학기술',
  '스포츠/건강',
  '창의융합',
  '환경/생태',
  '안전/보건',
  '인문/역사',
  '사회/경제',
  '기타'
];

export default function CategorySelector({ value, onChange, error }: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getDisplayText = () => {
    if (value.length === 0) return '카테고리 선택';
    if (value.length === 1) return value[0];
    return `${value[0]} 외 ${value.length - 1}개`;
  };

  const handleToggle = (category: string) => {
    if (value.includes(category)) {
      onChange(value.filter(c => c !== category));
    } else {
      onChange([...value, category]);
    }
  };

  return (
    <div className="space-y-0.5 relative">
      <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
        카테고리 <span className="text-red-500">*</span>
      </label>

      {/* 드롭다운 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors flex items-center justify-between"
      >
        <span className={value.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
          {getDisplayText()}
        </span>
        <IconChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-2">
          <div className="space-y-1">
            {CATEGORY_OPTIONS.map(category => (
              <label key={category} className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.includes(category)}
                  onChange={() => handleToggle(category)}
                  className="w-4 h-4"
                />
                <span className="text-[14px] text-gray-700">{category}</span>
              </label>
            ))}
          </div>

          {/* 선택 완료 버튼 */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 h-8 bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] text-gray-900 text-[14px] font-semibold rounded hover:opacity-90 transition-opacity"
          >
            선택 완료
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <p className="text-[13px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
