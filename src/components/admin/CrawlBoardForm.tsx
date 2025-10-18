import { useState } from 'react';
import type { CrawlBoard, CreateCrawlBoardInput } from '@/types';
import CrawlBatchSizeInput from './CrawlBatchSizeInput';

interface CrawlBoardFormProps {
  initialValue?: CrawlBoard;
  onSubmit: (payload: CreateCrawlBoardInput, id?: string) => Promise<void>;
  onClose: () => void;
}

export default function CrawlBoardForm({ initialValue, onSubmit, onClose }: CrawlBoardFormProps) {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [boardUrl, setBoardUrl] = useState(initialValue?.boardUrl ?? '');
  const [category, setCategory] = useState(initialValue?.category ?? '');
  const [crawlBatchSize, setCrawlBatchSize] = useState(initialValue?.crawlBatchSize ?? 20);
  const [isActive, setIsActive] = useState(initialValue?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: CreateCrawlBoardInput = {
      name,
      boardUrl,
      category: category.trim() ? category.trim() : null,
      isActive,
      crawlBatchSize,
    };

    if (!payload.name.trim()) {
      setError('게시판 이름을 입력해 주세요.');
      setSubmitting(false);
      return;
    }

    if (!payload.boardUrl.trim()) {
      setError('게시판 URL을 입력해 주세요.');
      setSubmitting(false);
      return;
    }

    try {
      await onSubmit(payload, initialValue?.id);
      onClose();
    } catch (err) {
      console.error(err);
      setError('게시판 정보를 저장하는 데 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {initialValue ? '게시판 설정 수정' : '새 게시판 등록'}
            </h2>
            <p className="text-sm text-gray-500">게시판 URL과 크롤링 설정을 입력해 주세요.</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">닫기</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="board-name" className="text-sm font-medium text-gray-700">
              게시판 이름
            </label>
            <input
              id="board-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="예: 성남교육지원청 구인구직"
            />
          </div>

          <div>
            <label htmlFor="board-url" className="text-sm font-medium text-gray-700">
              게시판 URL
            </label>
            <input
              id="board-url"
              type="url"
              value={boardUrl}
              onChange={(event) => setBoardUrl(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="https://example.go.kr/board"
            />
          </div>

          <div>
            <label htmlFor="board-category" className="text-sm font-medium text-gray-700">
              분류 / 태그 (선택)
            </label>
            <input
              id="board-category"
              type="text"
              value={category ?? ''}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="예: 성남교육지원청"
            />
          </div>

          <CrawlBatchSizeInput value={crawlBatchSize} onChange={setCrawlBatchSize} />

          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">활성화 상태로 등록</span>
          </label>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
