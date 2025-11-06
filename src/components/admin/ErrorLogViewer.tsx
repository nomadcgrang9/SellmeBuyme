/**
 * 에러 로그 뷰어 컴포넌트
 * 관리자 페이지에서 모바일 에러를 확인하기 위한 컴포넌트
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ErrorLog {
  id: string;
  timestamp: string;
  user_agent: string;
  url: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  device_info: {
    isMobile: boolean;
    platform: string;
    screenSize: string;
    connection?: string;
  };
  created_at: string;
}

export default function ErrorLogViewer() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('error_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function getErrorTypeColor(type: string) {
    switch (type) {
      case 'network':
        return 'bg-red-100 text-red-800';
      case 'page_load':
        return 'bg-orange-100 text-orange-800';
      case 'service_worker':
        return 'bg-purple-100 text-purple-800';
      case 'uncaught_error':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhandled_rejection':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">에러 로그 (모바일 디버깅)</h2>
        
        {/* 필터 버튼 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('network')}
            className={`px-4 py-2 rounded ${filter === 'network' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
          >
            네트워크
          </button>
          <button
            onClick={() => setFilter('page_load')}
            className={`px-4 py-2 rounded ${filter === 'page_load' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
          >
            페이지 로드
          </button>
          <button
            onClick={() => setFilter('uncaught_error')}
            className={`px-4 py-2 rounded ${filter === 'uncaught_error' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
          >
            런타임 에러
          </button>
          <button
            onClick={fetchLogs}
            className="px-4 py-2 rounded bg-green-500 text-white ml-auto"
          >
            새로고침
          </button>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">전체 에러</div>
            <div className="text-2xl font-bold">{logs.length}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">모바일 에러</div>
            <div className="text-2xl font-bold">
              {logs.filter(log => log.device_info.isMobile).length}
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">네트워크 에러</div>
            <div className="text-2xl font-bold">
              {logs.filter(log => log.error_type === 'network').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">페이지 로드 실패</div>
            <div className="text-2xl font-bold">
              {logs.filter(log => log.error_type === 'page_load').length}
            </div>
          </div>
        </div>
      </div>

      {/* 에러 로그 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">에러 로그가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="bg-white p-4 rounded shadow cursor-pointer hover:bg-gray-50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getErrorTypeColor(log.error_type)}`}>
                  {log.error_type}
                </span>
                <span className="text-xs text-gray-500">{formatDate(log.timestamp)}</span>
              </div>
              <div className="text-sm font-medium mb-1">{log.error_message}</div>
              <div className="text-xs text-gray-500">
                {log.device_info.isMobile ? '📱 모바일' : '💻 데스크톱'} | 
                {log.device_info.platform} | 
                {log.device_info.screenSize} | 
                {log.device_info.connection || 'unknown'}
              </div>
              <div className="text-xs text-gray-400 truncate">{log.url}</div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">에러 상세 정보</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">타입</div>
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getErrorTypeColor(selectedLog.error_type)}`}>
                  {selectedLog.error_type}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">시간</div>
                <div>{formatDate(selectedLog.timestamp)}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">URL</div>
                <div className="text-sm break-all">{selectedLog.url}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">에러 메시지</div>
                <div className="text-sm bg-red-50 p-3 rounded">{selectedLog.error_message}</div>
              </div>
              
              {selectedLog.stack_trace && (
                <div>
                  <div className="text-sm font-medium text-gray-500">스택 트레이스</div>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}
              
              <div>
                <div className="text-sm font-medium text-gray-500">디바이스 정보</div>
                <div className="text-sm bg-gray-50 p-3 rounded">
                  <div>모바일: {selectedLog.device_info.isMobile ? '예' : '아니오'}</div>
                  <div>플랫폼: {selectedLog.device_info.platform}</div>
                  <div>화면 크기: {selectedLog.device_info.screenSize}</div>
                  <div>연결 상태: {selectedLog.device_info.connection || 'unknown'}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">User Agent</div>
                <div className="text-xs bg-gray-50 p-3 rounded break-all">
                  {selectedLog.user_agent}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
