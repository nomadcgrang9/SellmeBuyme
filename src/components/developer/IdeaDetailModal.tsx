import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { DevIdea } from '@/types/developer';

interface IdeaDetailModalProps {
  idea: DevIdea | null;
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  new_feature: 'bg-blue-100 text-blue-800',
  improvement: 'bg-green-100 text-green-800',
  bug_fix: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

const categoryLabels: Record<string, string> = {
  new_feature: '새 기능',
  improvement: '개선사항',
  bug_fix: '버그 수정',
  other: '기타',
};

export function IdeaDetailModal({ idea, isOpen, onClose }: IdeaDetailModalProps) {
  if (!idea) return null;

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
            className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="sticky top-4 right-4 float-right z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Content */}
              <div className="p-8">
                {/* Category Badge */}
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    categoryColors[idea.category]
                  }`}
                >
                  💡 {categoryLabels[idea.category]}
                </span>

                {/* Title */}
                <h2 className="mt-4 text-2xl font-bold text-gray-900 leading-tight">
                  {idea.title}
                </h2>

                {/* Metadata */}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">👤</span>
                    {idea.authorName || '익명'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">📅</span>
                    {new Date(idea.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Content */}
                <div className="mt-6 text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {idea.content}
                </div>

                {/* Images */}
                {idea.images && idea.images.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      첨부 이미지 ({idea.images.length}개)
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {idea.images.map((imageUrl, index) => (
                        <div
                          key={index}
                          className="relative overflow-hidden rounded-lg border border-gray-200"
                        >
                          <img
                            src={imageUrl}
                            alt={`${idea.title} - 이미지 ${index + 1}`}
                            className="w-full h-auto object-contain max-h-[500px]"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
