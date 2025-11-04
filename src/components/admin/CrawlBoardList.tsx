import { useEffect, useState } from 'react';
import {
  createCrawlBoard,
  fetchCrawlBoards,
  triggerCrawlBoardRun,
  triggerCrawlBoardTest,
  updateCrawlBoard,
  unapproveCrawlBoard,
  deleteCrawlBoard
} from '@/lib/supabase/queries';
import type { CrawlBoard, UpdateCrawlBoardInput } from '@/types';
import CrawlBatchSizeInput from './CrawlBatchSizeInput';

interface CrawlBoardListProps {
  onCreate?: () => void;
  onEdit?: (board: CrawlBoard) => void;
  onLogs?: (board: CrawlBoard) => void;
  refreshToken?: number;
  filterApproved?: boolean | null;
}

export default function CrawlBoardList({ onCreate, onEdit, onLogs, refreshToken, filterApproved }: CrawlBoardListProps) {
  const [boards, setBoards] = useState<CrawlBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);
  const [runningBoardId, setRunningBoardId] = useState<string | null>(null);
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');

  // 디바운싱: 500ms 후에 검색 실행
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(searchKeyword);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  useEffect(() => {
    void loadBoards();
  }, [refreshToken, debouncedSearchKeyword, filterApproved]);

  const loadBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCrawlBoards({
        searchKeyword: debouncedSearchKeyword || undefined,
        filterApproved: filterApproved,
        useSimilaritySearch: true
      });
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

  const handleUnapprove = async (board: CrawlBoard) => {
    if (!confirm(`"${board.name}" 게시판의 승인을 취소하시겠습니까?\n\n승인이 취소되면 "승인 대기" 상태로 돌아갑니다.`)) {
      return;
    }

    setSavingBoardId(board.id);
    try {
      await unapproveCrawlBoard(board.id);
      // 승인 취소 후 필터 해제 (승인 대기 상태 보이도록)
      setFilterApproved(null);
      await loadBoards();
    } catch (err) {
      console.error(err);
      setError('승인 취소에 실패했습니다.');
    } finally {
      setSavingBoardId(null);
    }
  };

  const handleDelete = async (board: CrawlBoard) => {
    if (!confirm(`"${board.name}" 게시판을 완전히 삭제하시겠습니까?\n\n관련된 크롤링 로그와 제출 기록도 모두 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setSavingBoardId(board.id);
    try {
      await deleteCrawlBoard(board.id);
      await loadBoards();
    } catch (err) {
      console.error(err);
      setError('게시판 삭제에 실패했습니다.');
    } finally {
      setSavingBoardId(null);
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
          <p className="mt-1 text-sm text-gray-500">
            {searchKeyword ? `"${searchKeyword}" 검색 결과 ${boards.length}개` : `총 ${boards.length}개 게시판`}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          + 게시판 등록
        </button>
      </div>

      {/* 검색 필터 */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="게시판 이름, URL, 지역으로 검색... (예: 경기도, 성남, 의정부)"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {loading && debouncedSearchKeyword !== searchKeyword && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
            </div>
          )}
        </div>
        {searchKeyword && (
          <button
            onClick={() => setSearchKeyword('')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            초기화
          </button>
        )}
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-md border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
          게시판 목록을 불러오는 중입니다...
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-12 text-center text-sm text-gray-500">
          {searchKeyword
            ? `"${searchKeyword}" 검색 결과가 없습니다. 다른 키워드로 시도해보세요.`
            : '등록된 게시판이 없습니다. "게시판 등록" 버튼을 눌러 시작하세요.'
          }
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
                      {board.approvedAt ? (
                        <span className="text-green-600">
                          승인됨: {new Date(board.approvedAt).toLocaleDateString('ko-KR')}
                        </span>
                      ) : (
                        <span className="text-amber-600">승인 대기</span>
                      )}
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
                  {board.approvedAt && (
                    <button
                      onClick={() => handleUnapprove(board)}
                      disabled={savingBoardId === board.id}
                      className="rounded-md border border-amber-200 px-3 py-1.5 text-sm text-amber-700 hover:border-amber-400 hover:text-amber-800 disabled:opacity-50"
                    >
                      승인 취소
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(board)}
                    disabled={savingBoardId === board.id}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:border-red-400 hover:text-red-700 disabled:opacity-50"
                  >
                    삭제
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
