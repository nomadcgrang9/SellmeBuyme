import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconChevronDown, IconChevronUp, IconArrowLeft, IconCheck, IconBook, IconPalette, IconHeadphones, IconBriefcase, IconGlobe, IconStar } from '@tabler/icons-react';
import { HIERARCHICAL_FIELDS } from '@/lib/constants/hierarchicalFields';

interface HierarchicalFieldSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function HierarchicalFieldSelector({ value, onChange }: HierarchicalFieldSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState<string>('');
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);

  const currentCategory = HIERARCHICAL_FIELDS.find(c => c.id === selectedCategory);

  const getDisplayText = () => {
    if (value.length === 0) return '관심분야 선택';
    if (value.length === 1) return value[0];
    return `${value[0]} 외 ${value.length - 1}개`;
  };

  const getIconComponent = (iconName?: string) => {
    const iconProps = { size: 20, className: 'text-gray-700' };
    switch (iconName) {
      case 'book':
        return <IconBook {...iconProps} />;
      case 'palette':
        return <IconPalette {...iconProps} />;
      case 'headphones':
        return <IconHeadphones {...iconProps} />;
      case 'briefcase':
        return <IconBriefcase {...iconProps} />;
      case 'globe':
        return <IconGlobe {...iconProps} />;
      case 'star':
        return <IconStar {...iconProps} />;
      default:
        return null;
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleBackClick = () => {
    setSelectedCategory(null);
  };

  const handleSubcategoryToggle = (label: string) => {
    if (value.includes(label)) {
      onChange(value.filter(v => v !== label));
    } else {
      onChange([...value, label]);
    }
  };

  const handleComplete = () => {
    setIsOpen(false);
    setSelectedCategory(null);
  };

  return (
    <div className="w-full">
      {/* 상태 1: 버튼만 보임 */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(true)}
            className="w-full px-4 py-3 text-left bg-white border-2 border-gray-300 rounded-lg hover:border-blue-400 transition-colors flex items-center justify-between"
          >
            <span className={`text-[15px] ${value.length > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {getDisplayText()}
            </span>
            <div className="text-gray-400">
              <IconChevronDown size={20} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 상태 2: 대분류만 보임 (버튼 사라짐) */}
      <AnimatePresence>
        {isOpen && !selectedCategory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            {/* 대분류 - 좌우 균등 배치 */}
            <div className="grid grid-cols-3 gap-3 mb-6 justify-items-stretch">
              {HIERARCHICAL_FIELDS.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="px-5 py-2.5 text-[15px] font-medium text-gray-900 bg-white border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all"
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* 하단 버튼 */}
            <div className="border-t border-gray-200 pt-4 flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2.5 text-[14px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2.5 text-[14px] font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors shadow-sm"
              >
                완료 ({value.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상태 3: 소분류만 보임 (대분류 사라짐) */}
      <AnimatePresence>
        {isOpen && selectedCategory && currentCategory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            {/* 헤더 */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <button
                onClick={handleBackClick}
                className="text-[14px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <IconArrowLeft size={18} /> 돌아가기
              </button>
              <h3 className="text-[16px] font-bold text-gray-900 mt-2">{currentCategory.label}</h3>
            </div>
            {/* 소분류 - 좌우 균등 배치 */}
            <div className="grid grid-cols-2 gap-3 mb-6 max-h-[350px] overflow-y-auto">
              {currentCategory.subcategories.map(subcategory => {
                const isSelected = value.includes(subcategory.label);
                const isCustomInput = subcategory.id === 'elementary' || subcategory.id === 'middle';
                const isEditing = editingSubcategory === subcategory.id;

                return (
                  <div key={subcategory.id}>
                    <button
                      onClick={() => {
                        handleSubcategoryToggle(subcategory.label);
                        if (isCustomInput && !isSelected) {
                          setEditingSubcategory(subcategory.id);
                        }
                      }}
                      className={`w-full px-5 py-2.5 text-[15px] font-medium rounded-full transition-all ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 border border-blue-400'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                      }`}
                    >
                      {subcategory.label}
                    </button>

                    {/* 초등/중등교과 직접 입력 필드 */}
                    {isCustomInput && isSelected && isEditing && (
                      <div className="mt-2 mb-2">
                        <input
                          type="text"
                          placeholder={subcategory.id === 'elementary' ? '예: 국어, 수학, 과학' : '예: 영어, 수학, 과학'}
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          onBlur={() => {
                            if (customInput.trim()) {
                              onChange([...value.filter(v => v !== subcategory.label), `${subcategory.label}(${customInput})`]);
                              setCustomInput('');
                              setEditingSubcategory(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customInput.trim()) {
                              onChange([...value.filter(v => v !== subcategory.label), `${subcategory.label}(${customInput})`]);
                              setCustomInput('');
                              setEditingSubcategory(null);
                            }
                          }}
                          autoFocus
                          className="w-full px-4 py-2 text-[14px] border border-blue-300 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 하단 버튼 */}
            <div className="border-t border-gray-200 pt-4 flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2.5 text-[14px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2.5 text-[14px] font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors shadow-sm"
              >
                완료 ({value.length})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
