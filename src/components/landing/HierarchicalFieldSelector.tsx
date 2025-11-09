import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconArrowLeft } from '@tabler/icons-react';
import { HIERARCHICAL_FIELDS } from '@/lib/constants/hierarchicalFields';

interface HierarchicalFieldSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function HierarchicalFieldSelector({ value, onChange }: HierarchicalFieldSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [customInput, setCustomInput] = useState<string>('');
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);

  const currentCategory = HIERARCHICAL_FIELDS.find(c => c.id === selectedCategory);

  const findSelectionIndex = (label: string) => {
    return value.findIndex(item => item === label || item.startsWith(`${label}(`));
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setHoveredCategory(null);
    setEditingSubcategory(null);
    setCustomInput('');
  };

  const handleBackClick = () => {
    setSelectedCategory(null);
    setHoveredCategory(null);
    setPreviewSlideIndex(0);
    setEditingSubcategory(null);
    setCustomInput('');
  };

  // 네비게이션 없이 모든 소분류를 한번에 표시

  const handleSubcategoryToggle = (label: string) => {
    const matchedIndex = findSelectionIndex(label);

    if (matchedIndex !== -1) {
      const updated = [...value];
      updated.splice(matchedIndex, 1);
      onChange(updated);
    } else {
      onChange([...value, label]);
    }
  };

  const handleSelectionRemove = (label: string) => {
    const matchedIndex = findSelectionIndex(label);
    if (matchedIndex !== -1) {
      const updated = [...value];
      updated.splice(matchedIndex, 1);
      onChange(updated);
    }
  };

  return (
    <div className="w-full space-y-5">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          <motion.div
            key="category"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <h3 className="text-[16px] font-semibold text-gray-900 mb-4">관심분야를 선택하세요</h3>
            <div
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {HIERARCHICAL_FIELDS.map(category => {
                const isHovered = hoveredCategory === category.id;
                return (
                  <div
                    key={category.id}
                    className="relative"
                    onMouseEnter={() => setHoveredCategory(category.id)}
                    onFocus={() => setHoveredCategory(category.id)}
                    onMouseLeave={() => {
                      setHoveredCategory(prev => (prev === category.id ? null : prev));
                    }}
                    onBlur={() => setHoveredCategory(null)}
                  >
                    <button
                      onClick={() => handleCategoryClick(category.id)}
                      className={`px-5 py-2.5 text-[15px] font-medium rounded-full transition-all border ${
                        isHovered
                          ? 'bg-blue-50 text-blue-600 border-blue-400'
                          : 'bg-white text-gray-900 border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {category.label}
                    </button>

                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          key={`${category.id}-preview`}
                          initial={{ opacity: 0, y: -4, scale: 0.98 }}
                          animate={{ opacity: 1, y: 6, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.96 }}
                          transition={{ duration: 0.16 }}
                          className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-lg border border-gray-200 bg-white shadow-sm w-[420px] max-w-[90vw]"
                        >
                          <div className="px-4 py-2.5">
                            {/* 모든 소분류를 한번에 표시 */}
                            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                              {category.subcategories.map((sub: { id: string; label: string }) => (
                                <span
                                  key={sub.id}
                                  className="text-[11px] text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis"
                                >
                                  {sub.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : currentCategory ? (
          <motion.div
            key="subcategory"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-gray-200 p-6"
          >
            <div className="mb-4 pb-4 border-b border-gray-200 flex items-center justify-between">
              <button
                onClick={handleBackClick}
                className="text-gray-900 hover:text-gray-700"
              >
                <IconArrowLeft size={18} />
              </button>
              <h3 className="text-[16px] font-bold text-gray-900">{currentCategory.label}</h3>
              <div className="w-12" />
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4 max-h-[360px] overflow-y-auto pr-1">
              {currentCategory.subcategories.map(subcategory => {
                const matchedIndex = findSelectionIndex(subcategory.label);
                const isSelected = matchedIndex !== -1;
                const isCustomInput = subcategory.id === 'elementary' || subcategory.id === 'middle';
                const isEditing = editingSubcategory === subcategory.id;

                return (
                  <div key={subcategory.id}>
                    <button
                      onClick={() => {
                        handleSubcategoryToggle(subcategory.label);
                        if (isCustomInput && !isSelected) {
                          setEditingSubcategory(subcategory.id);
                          setCustomInput('');
                        }
                        if (isSelected) {
                          setEditingSubcategory(null);
                          setCustomInput('');
                        }
                      }}
                      className={`w-full px-5 py-2.5 text-[15px] font-medium rounded-full transition-all ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 border border-blue-400'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                      }`}
                    >
                      {isSelected && value[matchedIndex].includes('(')
                        ? value[matchedIndex].split('(')[0]
                        : subcategory.label}
                    </button>

                    {isCustomInput && isSelected && isEditing && (
                      <div className="mt-2 mb-2">
                        <input
                          type="text"
                          placeholder={subcategory.id === 'elementary' ? '예: 국어, 수학, 과학' : '예: 영어, 수학, 과학'}
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          onBlur={() => {
                            if (customInput.trim()) {
                              const updated = [...value];
                              updated[matchedIndex] = `${subcategory.label}(${customInput})`;
                              onChange(updated);
                              setCustomInput('');
                              setEditingSubcategory(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customInput.trim()) {
                              const updated = [...value];
                              updated[matchedIndex] = `${subcategory.label}(${customInput})`;
                              onChange(updated);
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
          </motion.div>
        ) : null}
      </AnimatePresence>

      {value.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-5"
        >
          <h4 className="text-[15px] font-semibold text-gray-900 mb-3">선택한 관심분야</h4>
          <div className="flex flex-wrap gap-2">
            {value.map(selection => (
              <button
                key={selection}
                onClick={() => handleSelectionRemove(selection.includes('(') ? selection.split('(')[0] : selection)}
                className="px-4 py-2 text-[14px] font-medium rounded-full border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {selection}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
