import { useEffect, useState } from 'react';
import {
  createCrawlBoard,
  fetchCrawlBoards,
  triggerCrawlBoardRun,
  triggerCrawlBoardTest,
  updateCrawlBoard
} from '@/lib/supabase/queries';
import type { CrawlBoard, UpdateCrawlBoardInput } from '@/types';
import CrawlBatchSizeInput from './CrawlBatchSizeInput';

interface CrawlBoardListProps {
  onCreate?: () => void;
  onEdit?: (board: CrawlBoard) => void;
  onLogs?: (board: CrawlBoard) => void;
  refreshToken?: number;
}

export default function CrawlBoardList({ onCreate, onEdit, onLogs, refreshToken }: CrawlBoardListProps) {
  const [boards, setBoards] = useState<CrawlBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);
  const [runningBoardId, setRunningBoardId] = useState<string | null>(null);
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadBoards();
  }, [refreshToken]);

  const loadBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCrawlBoards();
      setBoards(data);
      setExpandedBoardIds((prev) => {
        const next = new Set<string>();
        data.forEach((board) => {
          if (prev.has(board.id)) {
            next.add(board.id);
          }
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      setError('게시판 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (board: CrawlBoard) => {
    setSavingBoardId(board.id);
    try {
      await updateBoard(board.id, { isActive: !board.isActive });
    } finally {
      setSavingBoardId(null);
    }
  };

  const handleBatchSizeChange = async (board: CrawlBoard, value: number) => {
    setSavingBoardId(board.id);
    try {
      await updateBoard(board.id, { crawlBatchSize: value });
    } finally {
      setSavingBoardId(null);
    }
  };

  const handleRunNow = async (board: CrawlBoard) => {
    setRunningBoardId(board.id);
    try {
      await triggerCrawlBoardRun(board.id);
    } catch (err) {
      console.error(err);
      setError('즉시 크롤링 실행에 실패했습니다.');
    } finally {
      setRunningBoardId(null);
    }
  };

  const handleTest = async (board: CrawlBoard) => {
    setRunningBoardId(board.id);
    try {
      await triggerCrawlBoardTest(board.id);
    } catch (err) {
      console.error(err);
      setError('테스트 크롤링 실행에 실패했습니다.');
    } finally {
      setRunningBoardId(null);
    }
  };

  const updateBoard = async (id: string, payload: UpdateCrawlBoardInput) => {
    try {
      const updated = await updateCrawlBoard(id, payload);
      setBoards((prev) => prev.map((board) => (board.id === id ? updated : board)));
    } catch (err) {
      console.error(err);
      setError('게시판 정보를 저장하지 못했습니다.');
    }
  };

  const toggleBoardExpansion = (id: string) => {
    setExpandedBoardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">크롤링 게시판 목록</h2>
        </div>
        <button
          onClick={onCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          + 게시판 등록
        </button>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-md border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          게시판 목록을 불러오는 중입니다...
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center text-sm text-gray-500">
          등록된 게시판이 없습니다. "게시판 등록" 버튼을 눌러 시작하세요.
        </div>
      ) : (
        <div className="space-y-3">
          {boards.map((board) => (
            <div
              key={board.id}
              className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleBoardExpansion(board.id)}
                    className="mt-0.5 rounded-md border border-gray-200 p-1 text-xs text-gray-600 hover:border-primary hover:text-primary"
                    aria-expanded={expandedBoardIds.has(board.id)}
                    aria-label={`${board.name} ${expandedBoardIds.has(board.id) ? '접기' : '펼치기'}`}
                  >
                    {expandedBoardIds.has(board.id) ? '−' : '+'}
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-gray-900">{board.name}</span>
                      <span className="text-xs text-gray-400">{board.boardUrl}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>상태: {board.status}</span>
                      <span>활성화: {board.isActive ? '사용' : '중지'}</span>
                      <span>최근 성공: {board.lastSuccessAt ? new Date(board.lastSuccessAt).toLocaleString() : '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleRunNow(board)}
                    disabled={!!runningBoardId}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    즉시 실행
                  </button>
                  <button
                    onClick={() => handleTest(board)}
                    disabled={!!runningBoardId}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    테스트
                  </button>
                  <button
                    onClick={() => onEdit?.(board)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:border-primary hover:text-primary"
                  >
                    설정
                  </button>
                  <button
                    onClick={() => onLogs?.(board)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:border-primary hover:text-primary"
                  >
                    로그 보기
                  </button>
                  <button
                    onClick={() => handleToggleActive(board)}
                    disabled={savingBoardId === board.id}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {board.isActive ? '비활성화' : '활성화'}
                  </button>
                </div>
              </div>
              {expandedBoardIds.has(board.id) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <CrawlBatchSizeInput
                    value={board.crawlBatchSize}
                    onChange={(value) => void handleBatchSizeChange(board, value)}
                    disabled={savingBoardId === board.id}
                  />

                  <div className="flex flex-col gap-2 text-xs text-gray-500">
                    <span>마지막 크롤링: {board.lastCrawledAt ? new Date(board.lastCrawledAt).toLocaleString() : '-'}</span>
                    <span>연속 실패 횟수: {board.errorCount}</span>
                    {board.errorMessage && <span className="text-red-500">최근 오류: {board.errorMessage}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
