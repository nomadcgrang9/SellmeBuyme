// IdeaForm - 아이디어 작성/수정 폼 (모달)
import { X, Loader2, Trash2, Plus, CheckSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import FileUploader from './FileUploader';
import CategoryBadge from './CategoryBadge';
import type { IdeaCategory, DevIdea, IdeaTodo } from '@/types/developer';

interface TodoInput {
  id: string;
  content: string;
  isCompleted: boolean;
}

interface IdeaFormProps {
  onClose: () => void;
  onSubmit: (data: {
    authorName: string;
    content: string;
    category: IdeaCategory;
    images: File[];
    todos: IdeaTodo[];
  }) => Promise<void>;
  editingIdea?: DevIdea | null;
}

export default function IdeaForm({ onClose, onSubmit, editingIdea }: IdeaFormProps) {
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [todos, setTodos] = useState<TodoInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusNewTodo, setFocusNewTodo] = useState(false);
  const lastTodoInputRef = useRef<HTMLInputElement>(null);

  // 수정 모드일 때 초기값 설정
  useEffect(() => {
    if (editingIdea) {
      setAuthorName(editingIdea.authorName);
      setContent(editingIdea.content);
      setCategory(editingIdea.category);
      setExistingImages(editingIdea.images || []);
      // 기존 Todo 로드
      setTodos(
        (editingIdea.todos || []).map((t) => ({
          id: t.id,
          content: t.content,
          isCompleted: t.isCompleted,
        }))
      );
    } else {
      // 폼 초기화
      setAuthorName('');
      setContent('');
      setCategory('feature');
      setImages([]);
      setExistingImages([]);
      setTodos([]);
    }
  }, [editingIdea]);

  const categories: IdeaCategory[] = ['feature', 'bug', 'design', 'other'];

  // 새 Todo 추가 후 포커스 이동
  useEffect(() => {
    if (focusNewTodo && lastTodoInputRef.current) {
      lastTodoInputRef.current.focus();
      setFocusNewTodo(false);
    }
  }, [focusNewTodo, todos]);

  // Todo 추가
  const handleAddTodo = () => {
    setTodos([
      ...todos,
      { id: `todo-${Date.now()}`, content: '', isCompleted: false },
    ]);
    setFocusNewTodo(true);
  };

  // Todo 삭제
  const handleRemoveTodo = (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  // Todo 내용 변경
  const handleTodoChange = (id: string, content: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, content } : t)));
  };

  // Todo 완료 상태 토글 (수정 모드에서만)
  const handleTodoToggle = (id: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)));
  };

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

    // 빈 Todo 항목 필터링
    const validTodos: IdeaTodo[] = todos
      .filter((t) => t.content.trim())
      .map((t, index) => ({
        id: t.id,
        content: t.content.trim(),
        isCompleted: t.isCompleted,
        completedAt: t.isCompleted ? new Date().toISOString() : null,
      }));

    setIsSubmitting(true);
    try {
      await onSubmit({ authorName, content, category, images, todos: validTodos });
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
            {editingIdea ? '아이디어 수정' : '새 아이디어 작성'}
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

          {/* Todo 체크리스트 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <CheckSquare className="w-4 h-4" />
              <span>할 일 (선택)</span>
              <button
                type="button"
                onClick={handleAddTodo}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-[#7aa3cc] hover:bg-gray-100 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </label>
            {todos.length > 0 && (
              <div className="space-y-2">
                {todos.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-2">
                    {/* 수정 모드에서만 체크박스 표시 */}
                    {editingIdea && (
                      <button
                        type="button"
                        onClick={() => handleTodoToggle(todo.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          todo.isCompleted
                            ? 'bg-[#a8c5e0] border-[#a8c5e0] text-white'
                            : 'border-gray-300 hover:border-[#a8c5e0]'
                        }`}
                      >
                        {todo.isCompleted && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    )}
                    <input
                      ref={todos.indexOf(todo) === todos.length - 1 ? lastTodoInputRef : null}
                      type="text"
                      value={todo.content}
                      onChange={(e) => handleTodoChange(todo.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTodo();
                        }
                      }}
                      placeholder="할 일을 입력하세요"
                      className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent text-sm ${
                        todo.isCompleted ? 'line-through text-gray-400' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTodo(todo.id)}
                      className="flex-shrink-0 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 기존 이미지 (수정 모드) */}
          {editingIdea && existingImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기존 이미지
              </label>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative w-20 h-20">
                    <img
                      src={url}
                      alt={`기존 이미지 ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setExistingImages(prev => prev.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 파일 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {editingIdea ? '새 파일 추가 (선택)' : '첨부파일 (선택)'}
            </label>
            <FileUploader files={images} onChange={setImages} maxFiles={30} maxSizeMB={50} />
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
                  {editingIdea ? '수정 중...' : '등록 중...'}
                </>
              ) : (
                editingIdea ? '수정 완료' : '작성 완료'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
