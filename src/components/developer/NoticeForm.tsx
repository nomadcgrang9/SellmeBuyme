// NoticeForm - 공지사항 작성/수정 폼 컴포넌트
import { useState, useEffect } from 'react';
import { X, Megaphone, Bell, Gift, AlertTriangle, Pin } from 'lucide-react';
import type { DevNotice, NoticeCategory, NoticeFormData } from '@/types/developer';
import RichTextEditor from './RichTextEditor';
import FileUploader from './FileUploader';

interface NoticeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NoticeFormData) => Promise<void>;
  editingNotice?: DevNotice | null;
}

const NOTICE_CATEGORIES: Array<{
  value: NoticeCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { value: 'notice', label: '공지', icon: <Megaphone className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'update', label: '업데이트', icon: <Bell className="w-4 h-4" />, color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'event', label: '이벤트', icon: <Gift className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'important', label: '중요', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function NoticeForm({
  isOpen,
  onClose,
  onSubmit,
  editingNotice,
}: NoticeFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoticeCategory>('notice');
  const [isPinned, setIsPinned] = useState(false);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 수정 모드일 때 초기값 설정
  useEffect(() => {
    if (editingNotice) {
      setAuthorName(editingNotice.authorName);
      setTitle(editingNotice.title);
      setContent(editingNotice.content);
      setCategory(editingNotice.category);
      setIsPinned(editingNotice.isPinned);
      // 수정 모드에서는 기존 첨부파일 URL만 있고 File 객체는 없음
      // 새 파일만 추가 가능
      setAttachments([]);
    } else {
      // 폼 초기화
      setAuthorName('');
      setTitle('');
      setContent('');
      setCategory('notice');
      setIsPinned(false);
      setAttachments([]);
    }
  }, [editingNotice, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('제목을 입력해주세요');
      return;
    }

    if (!content.trim()) {
      alert('내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        authorName: authorName.trim() || '관리자',
        title: title.trim(),
        content: content.trim(),
        category,
        isPinned,
        attachments,
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit notice:', error);
      alert('공지사항 저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingNotice ? '공지사항 수정' : '새 공지사항'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-130px)]">
          {/* 작성자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작성자
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="관리자"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent"
            />
          </div>

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <div className="flex flex-wrap gap-2">
              {NOTICE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    category === cat.value
                      ? `${cat.color} ring-2 ring-offset-1`
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent"
              required
            />
          </div>

          {/* 내용 - 리치 텍스트 에디터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              내용 <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="공지 내용을 입력하세요"
              rows={8}
            />
          </div>

          {/* 첨부파일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              첨부파일
            </label>
            <FileUploader
              files={attachments}
              onChange={setAttachments}
              maxFiles={30}
              maxSizeMB={50}
            />
          </div>

          {/* 고정 여부 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                isPinned
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">
                {isPinned ? '상단 고정됨' : '상단에 고정하기'}
              </span>
            </button>
          </div>
        </form>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-[#7aa3cc] rounded-lg hover:bg-[#5a8ab0] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '저장 중...' : editingNotice ? '수정' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}
