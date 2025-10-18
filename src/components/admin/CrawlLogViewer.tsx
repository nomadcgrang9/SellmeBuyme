import { useEffect, useState } from 'react';
import { fetchCrawlLogs } from '@/lib/supabase/queries';
import type { CrawlLog, CrawlBoard } from '@/types';

interface CrawlLogViewerProps {
  board?: CrawlBoard;
  statusFilter?: string;
  open: boolean;
  onClose: () => void;
}

export default function CrawlLogViewer({ board, statusFilter, open, onClose }: CrawlLogViewerProps) {
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void loadLogs();
  }, [open, board?.id, statusFilter]);

  const loadLogs = async () => {
    if (!board) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCrawlLogs(board.id, statusFilter);
      setLogs(data);
    } catch (err) {
      console.error(err);
      setError('크롤 로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !board) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">크롤링 로그</h2>
            <p className="text-sm text-gray-500">{board.name} 게시판의 최근 기록</p>
          </div>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">닫기</button>
        </div>

        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 text-xs text-gray-500">
            <span>총 {logs.length}건</span>
            <button onClick={loadLogs} className="text-primary hover:underline">새로고침</button>
          </div>

          {error && (
            <div className="m-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                로그를 불러오는 중입니다...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                로그가 없습니다.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">시작 시간</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">상태</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">발견</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">신규</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">중복 스킵</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">토큰</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">오류</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">
                        {log.startedAt ? new Date(log.startedAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">{log.itemsFound}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{log.itemsNew}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{log.itemsSkipped}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{log.aiTokensUsed}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        {log.errorLog ? log.errorLog.slice(0, 120) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
