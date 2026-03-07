import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronRight, X, MoreVertical, Trash2 } from 'lucide-react';
import {
  getAiReplyLogs,
  cancelAiReply,
  deletePostedAiReply,
  getAiPersonas,
  loadAiConfig,
  saveAiConfig,
} from '@/lib/supabase/wagleAdmin';
import type { AdminAiReplyLog, AdminAiPersona, WagleAiConfig } from '@/types/wagle';

// ━━━ 상태 뱃지 색상 ━━━
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  posted: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
  error: 'bg-red-100 text-red-800',
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function WagleAiRepliesTab() {
  // ━━━ AI 설정 ━━━
  const [config, setConfig] = useState<WagleAiConfig | null>(null);
  const [configDirty, setConfigDirty] = useState(false);
  const [configOpen, setConfigOpen] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // ━━━ 답변 로그 ━━━
  const [logs, setLogs] = useState<AdminAiReplyLog[]>([]);
  const [logStatus, setLogStatus] = useState<string>('all');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // ━━━ 페르소나 ━━━
  const [personas, setPersonas] = useState<AdminAiPersona[]>([]);
  const [personasOpen, setPersonasOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ━━━ 데이터 로드 ━━━
  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [configRes, logsRes, personasRes] = await Promise.all([
        loadAiConfig(),
        getAiReplyLogs(logStatus),
        getAiPersonas(),
      ]);

      if (configRes.error) throw configRes.error;
      if (logsRes.error) throw logsRes.error;
      if (personasRes.error) throw personasRes.error;

      setConfig(configRes.data);
      setLogs(logsRes.data);
      setPersonas(personasRes.data);
      setConfigDirty(false);
    } catch (err) {
      console.error('AI 답변 관리 로드 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    }
  }, [logStatus]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ━━━ 로그 필터 변경 시 재로드 ━━━
  const reloadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data, error: err } = await getAiReplyLogs(logStatus);
      if (err) throw err;
      setLogs(data);
    } catch (err) {
      console.error('로그 로드 실패:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logStatus]);

  useEffect(() => {
    reloadLogs();
  }, [reloadLogs]);

  // ━━━ 설정 변경 핸들러 ━━━
  const updateConfig = (key: keyof WagleAiConfig, value: unknown) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setConfigDirty(true);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSavingConfig(true);
    try {
      const { error: err } = await saveAiConfig(config);
      if (err) throw err;
      setConfigDirty(false);
      alert('설정이 저장되었습니다.');
    } catch (err) {
      alert(`설정 저장 실패: ${err}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // ━━━ 로그 액션 ━━━
  const handleCancelLog = async (logId: string) => {
    if (!window.confirm('이 예약 답변을 취소하시겠습니까?')) return;
    try {
      const { error: err } = await cancelAiReply(logId);
      if (err) throw err;
      reloadLogs();
    } catch (err) {
      alert(`취소 실패: ${err}`);
    }
    setActionMenuId(null);
  };

  const handleDeletePosted = async (logId: string, replyId: string | null) => {
    if (!replyId) return;
    if (!window.confirm('이 AI 답변을 삭제하시겠습니까?')) return;
    try {
      const { error: err } = await deletePostedAiReply(logId, replyId);
      if (err) throw err;
      reloadLogs();
    } catch (err) {
      alert(`삭제 실패: ${err}`);
    }
    setActionMenuId(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* ━━━ (A) AI 설정 패널 ━━━ */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>AI 설정</span>
          {configOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {configOpen && config && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
            {/* 킬스위치 경고 */}
            {!config.enabled && (
              <div className="mt-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                AI 자동 답변이 비활성화되어 있습니다
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-3">
              {/* 킬스위치 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>킬스위치</span>
                <button
                  onClick={() => updateConfig('enabled', !config.enabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    config.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                      config.enabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
                <span className={`text-xs ${config.enabled ? 'text-green-600' : 'text-red-500'}`}>
                  {config.enabled ? 'ON' : 'OFF'}
                </span>
              </label>

              {/* 1회 한도 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>1회 한도</span>
                <input
                  type="number"
                  value={config.max_replies_per_run}
                  onChange={(e) => updateConfig('max_replies_per_run', Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min={1}
                  max={20}
                />
              </label>

              {/* 일일 한도 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>일일 한도</span>
                <input
                  type="number"
                  value={config.max_replies_per_day}
                  onChange={(e) => updateConfig('max_replies_per_day', Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min={1}
                  max={100}
                />
              </label>

              {/* 답변 확률 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>답변 확률</span>
                <input
                  type="number"
                  value={config.reply_probability}
                  onChange={(e) => updateConfig('reply_probability', Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min={0}
                  max={1}
                  step={0.1}
                />
              </label>

              {/* 최소 딜레이 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>최소 딜레이(분)</span>
                <input
                  type="number"
                  value={config.min_delay_minutes}
                  onChange={(e) => updateConfig('min_delay_minutes', Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min={1}
                />
              </label>

              {/* 최대 딜레이 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>최대 딜레이(분)</span>
                <input
                  type="number"
                  value={config.max_delay_minutes}
                  onChange={(e) => updateConfig('max_delay_minutes', Number(e.target.value))}
                  className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min={1}
                />
              </label>

              {/* 활동 시간 시작 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>활동 시작(KST)</span>
                <select
                  value={config.active_hours.start}
                  onChange={(e) =>
                    updateConfig('active_hours', { ...config.active_hours, start: Number(e.target.value) })
                  }
                  className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}시
                    </option>
                  ))}
                </select>
              </label>

              {/* 활동 시간 종료 */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span>활동 종료(KST)</span>
                <select
                  value={config.active_hours.end}
                  onChange={(e) =>
                    updateConfig('active_hours', { ...config.active_hours, end: Number(e.target.value) })
                  }
                  className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}시
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* 저장 버튼 */}
            {configDirty && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600
                             disabled:bg-blue-300 rounded-lg transition-colors"
                >
                  {savingConfig ? '저장 중...' : '설정 저장'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ━━━ (B) 답변 로그 테이블 ━━━ */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">답변 로그</span>
          <div className="flex items-center gap-2">
            <select
              value={logStatus}
              onChange={(e) => setLogStatus(e.target.value)}
              className="px-2 py-1 text-xs rounded border bg-white border-gray-200 text-gray-600
                         focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="pending">pending</option>
              <option value="posted">posted</option>
              <option value="cancelled">cancelled</option>
              <option value="error">error</option>
            </select>
            <button
              onClick={reloadLogs}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              title="새로고침"
            >
              <RefreshCw size={14} className={`text-gray-600 ${loadingLogs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 로그 헤더 */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <div className="grid grid-cols-7 gap-3 text-xs font-medium text-gray-600">
            <span>상태</span>
            <span>페르소나</span>
            <span className="col-span-2">대상 글</span>
            <span>분류</span>
            <span>예약/발송</span>
            <span className="text-right">관리</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
          {loadingLogs ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">답변 로그가 없습니다.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="grid grid-cols-7 gap-3 px-4 py-2.5 hover:bg-gray-50 items-center">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full text-center ${
                    STATUS_COLORS[log.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-xs text-gray-700 truncate">{log.persona_name}</span>
                <span className="col-span-2 text-xs text-gray-500 truncate" title={log.thread_preview}>
                  {log.thread_preview}
                </span>
                <span
                  className={`text-xs ${
                    log.classification === 'safe' ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {log.classification}
                </span>
                <span className="text-xs text-gray-500">
                  {log.status === 'posted' ? formatDateTime(log.posted_at) : formatDateTime(log.scheduled_at)}
                </span>
                <div className="text-right relative">
                  {(log.status === 'pending' || log.status === 'posted' || log.status === 'error') && (
                    <>
                      <button
                        onClick={() => setActionMenuId(actionMenuId === log.id ? null : log.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreVertical size={14} className="text-gray-400" />
                      </button>

                      {actionMenuId === log.id && (
                        <div className="absolute right-0 mt-1 w-28 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20">
                          {log.status === 'pending' && (
                            <button
                              onClick={() => handleCancelLog(log.id)}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <X size={14} />
                              취소
                            </button>
                          )}
                          {log.status === 'posted' && log.reply_id && (
                            <button
                              onClick={() => handleDeletePosted(log.id, log.reply_id)}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              답변 삭제
                            </button>
                          )}
                          {log.status === 'error' && log.error_message && (
                            <div className="px-3 py-2 text-xs text-red-600 max-w-xs break-words">
                              {log.error_message}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 text-xs text-gray-400 text-right border-t border-gray-100">
          총 {logs.length}건
        </div>
      </div>

      {/* ━━━ (C) 페르소나 현황 ━━━ */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setPersonasOpen(!personasOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <span>페르소나 현황 ({personas.length}명)</span>
          {personasOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {personasOpen && (
          <div className="border-t border-gray-100">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div className="grid grid-cols-6 gap-3 text-xs font-medium text-gray-600">
                <span>이름</span>
                <span>역할</span>
                <span>전문분야</span>
                <span>총 답변</span>
                <span>마지막 사용</span>
                <span>활성</span>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {personas.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  페르소나가 없습니다. seed-personas를 먼저 실행하세요.
                </div>
              ) : (
                personas.map((p) => (
                  <div key={p.id} className="grid grid-cols-6 gap-3 px-4 py-2.5 items-center">
                    <span className="text-sm text-gray-800 truncate">{p.display_name}</span>
                    <span className="text-xs text-gray-600 truncate">{p.persona_background?.role || '-'}</span>
                    <span className="text-xs text-gray-500 truncate">
                      {p.persona_background?.specialties?.slice(0, 3).join(', ') || '-'}
                    </span>
                    <span className="text-xs text-gray-600">{p.total_replies}</span>
                    <span className="text-xs text-gray-500">
                      {p.last_used_at ? formatDateTime(p.last_used_at) : '-'}
                    </span>
                    <span className={`text-xs font-medium ${p.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {p.is_active ? 'O' : 'X'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
