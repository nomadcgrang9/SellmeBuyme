// IdeaForm - 아이디어 작성 폼 (모달)
import { X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import ImageUploader from './ImageUploader';
import CategoryBadge from './CategoryBadge';
import type { IdeaCategory } from '@/types/developer';

interface IdeaFormProps {
  onClose: () => void;
  onSubmit: (data: {
    authorName: string;
    content: string;
    category: IdeaCategory;
    images: File[];
  }) => Promise<void>;
}

export default function IdeaForm({ onClose, onSubmit }: IdeaFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: IdeaCategory[] = ['feature', 'bug', 'design', 'other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (!authorName.trim()) {
      alert('작성자를 입력해주세요');
      return;
    }
    if (!content.trim()) {
      alert('내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ authorName, content, category, images });
      onClose();
    } catch (error) {
      console.error('Failed to submit idea:', error);
      alert('아이디어 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative w-full max-w-screen-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            새 아이디어 작성
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 작성자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              작성자 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent"
              required
            />
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    category === cat
                      ? 'border-[#a8c5e0] bg-[#d4e4f0]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CategoryBadge category={cat} showIcon={false} />
                </button>
              ))}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="아이디어에 대해 자세히 설명해주세요"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent resize-none"
              required
            />
          </div>

          {/* 이미지 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이미지 (선택)
            </label>
            <ImageUploader files={images} onChange={setImages} maxFiles={5} />
          </div>

          {/* 버튼 영역 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#a8c5e0] hover:bg-[#7aa3cc] text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                '작성 완료'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
