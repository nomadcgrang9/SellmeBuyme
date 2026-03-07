import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, MoreVertical, Eye, EyeOff, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getAiThreads, generateAiThreads } from '@/lib/supabase/wagleAdmin';
import type { WagleThreadRow, ReactionCounts } from '@/types/wagle';

interface AiThread extends WagleThreadRow {
  persona_name: string;
}

interface Props {
  onCountChange: (count: number) => void;
  refreshToken: number;
}

function getTotalReactions(counts: ReactionCounts): number {
  return (counts.like || 0) + (counts.cheer || 0) + (counts.curious || 0) + (counts.thanks || 0);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export default function WagleAiThreadsTab({ onCountChange, refreshToken }: Props) {
  const [threads, setThreads] = useState<AiThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await getAiThreads();
      if (err) throw err;
      setThreads(data as AiThread[]);
      onCountChange(data.length);
    } catch (err) {
      console.error('AI 글 로드 실패:', err);
      setError('AI 글 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshToken, localRefresh]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error: err } = await generateAiThreads(3);
      if (err) throw err;
      alert(data?.message || '생성 완료');
      setLocalRefresh((t) => t + 1);
    } catch (err) {
      console.error('AI 글 생성 실패:', err);
      alert(`AI 글 생성에 실패했습니다: ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleHide = async (thread: AiThread) => {
    const newDeleted = !thread.is_deleted;
    try {
      const { data, error } = await supabase
        .from('wagle_threads')
        .update({ is_deleted: newDeleted })
        .eq('id', thread.id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        alert('권한이 없습니다. 관리자 역할(admin)이 필요합니다.');
        return;
      }
      setLocalRefresh((t) => t + 1);
    } catch (err) {
      alert(`상태 변경에 실패했습니다: ${err}`);
    }
    setActionMenuId(null);
  };

  const handleDelete = async (thread: AiThread) => {
    if (!window.confirm('이 AI 글을 완전히 삭제하시겠습니까?\n(댓글, 리액션 모두 함께 삭제됩니다)')) return;

    try {
      const { data, error } = await supabase
        .from('wagle_threads')
        .delete()
        .eq('id', thread.id)
        .select('id');

      if (error) throw error;
      if (!data || data.length === 0) {
        alert('삭제 권한이 없습니다.');
        return;
      }
      setLocalRefresh((t) => t + 1);
    } catch (err) {
      alert('삭제에 실패했습니다.');
    }
    setActionMenuId(null);
  };

  // 필터링
  const filtered = threads.filter((t) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !t.content.toLowerCase().includes(s) &&
        !t.persona_name.toLowerCase().includes(s) &&
        !t.hashtags.some((h) => h.toLowerCase().includes(s))
      )
        return false;
    }
    if (statusFilter === 'active' && t.is_deleted) return false;
    if (statusFilter === 'inactive' && !t.is_deleted) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 필터 + 생성 버튼 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="페르소나, 내용, 해시태그 검색..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg
                       placeholder:text-gray-400 focus:outline-none focus:ring-2
                       focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-3 py-2 text-sm rounded-lg border bg-white border-gray-200
                     text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 상태</option>
          <option value="active">공개</option>
          <option value="inactive">숨김</option>
        </select>

        <button
          onClick={() => setLocalRefresh((t) => t + 1)}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={16} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white
                     bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 rounded-lg transition-colors"
        >
          <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />
          {isGenerating ? '생성 중...' : 'AI 글 생성'}
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-visible">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-8 gap-4 text-xs font-medium text-gray-600">
            <span>페르소나</span>
            <span className="col-span-2">내용</span>
            <span>해시태그</span>
            <span>반응/댓글</span>
            <span>생성일시</span>
            <span>상태</span>
            <span className="text-right">관리</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">AI 생성 글이 없습니다.</div>
          ) : (
            filtered.map((thread) => (
              <div
                key={thread.id}
                className={`grid grid-cols-8 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors items-center ${
                  thread.is_deleted ? 'opacity-50 bg-gray-50' : ''
                }`}
              >
                <span className="text-sm text-blue-600 font-medium truncate">{thread.persona_name}</span>
                <span className="col-span-2 text-sm text-gray-600 truncate">
                  {thread.content.length > 50 ? thread.content.slice(0, 50) + '...' : thread.content}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {thread.hashtags.length > 0 ? thread.hashtags.map((h) => `#${h}`).join(' ') : '-'}
                </span>
                <span className="text-xs text-gray-500">
                  <span title="반응">♡{getTotalReactions(thread.reaction_counts)}</span>{' '}
                  <span title="댓글">댓{thread.reply_count}</span>
                </span>
                <span className="text-xs text-gray-500">{formatDate(thread.created_at)}</span>
                <span
                  className={`text-xs font-medium ${thread.is_deleted ? 'text-red-500' : 'text-green-600'}`}
                >
                  {thread.is_deleted ? '숨김' : '공개'}
                </span>
                <div className="text-right relative">
                  <button
                    onClick={() => setActionMenuId(actionMenuId === thread.id ? null : thread.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>

                  {actionMenuId === thread.id && (
                    <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20">
                      <button
                        onClick={() => {
                          handleToggleHide(thread);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        {thread.is_deleted ? <Eye size={14} /> : <EyeOff size={14} />}
                        {thread.is_deleted ? '공개 복구' : '숨기기'}
                      </button>
                      <button
                        onClick={() => handleDelete(thread)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        완전삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500 text-right">총 {filtered.length}건</div>
    </div>
  );
}
