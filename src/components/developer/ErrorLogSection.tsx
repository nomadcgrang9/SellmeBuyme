// Error Log Section - 에러 로그 표시 컴포넌트

import { useState, useEffect } from 'react';
import { storageManager, ErrorReport } from '@/lib/utils/storageManager';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

type ErrorTypeFilter = 'all' | 'network' | 'script' | 'page_load' | 'service_worker' | 'app_lifecycle';

export default function ErrorLogSection() {
  const [errorLogs, setErrorLogs] = useState<ErrorReport[]>([]);
  const [filter, setFilter] = useState<ErrorTypeFilter>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 에러 로그 로드
  useEffect(() => {
    loadErrorLogs();
  }, []);

  const loadErrorLogs = async () => {
    setLoading(true);
    try {
      const logs = await storageManager.getAllLogs();
      // 🚫 모바일 에러만 표시 (데스크톱 에러 제외)
      const mobileLogs = logs.filter(log => log.deviceType === 'mobile');
      setErrorLogs(mobileLogs);
    } catch (error) {
      console.error('Failed to load error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 필터링
  const filteredLogs = filter === 'all'
    ? errorLogs
    : errorLogs.filter(log => log.errorType === filter);

  // 통계
  const stats = {
    total: errorLogs.length,
    mobile: errorLogs.filter(log => log.deviceType === 'mobile').length,
    network: errorLogs.filter(log => log.errorType === 'network').length,
    recent24h: errorLogs.filter(log => Date.now() - log.timestamp < 24 * 60 * 60 * 1000).length,
  };

  // 에러 타입별 아이콘
  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'network': return '🌐';
      case 'script': return '📜';
      case 'page_load': return '⚡';
      case 'service_worker': return '🔧';
      case 'app_lifecycle': return '📱';
      default: return '❌';
    }
  };

  // 상세 토글
  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  // 재업로드
  const handleRetryUpload = async () => {
    await storageManager.retryUpload();
    await loadErrorLogs();
    alert('재업로드 완료!');
  };

  // 로그 초기화
  const handleClearLogs = async () => {
    if (confirm('모바일 에러 로그를 삭제하시겠습니까?')) {
      await storageManager.clearLogs();
      setErrorLogs([]);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 통계 요약 */}
      <div className="border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">📊 통계 요약</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}건</div>
            <div className="text-xs text-gray-600">전체</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.mobile}건</div>
            <div className="text-xs text-gray-600">모바일</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.network}건</div>
            <div className="text-xs text-gray-600">네트워크</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          최근 24시간: {stats.recent24h}건
        </div>
      </div>

      {/* 필터 버튼 */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter('network')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'network'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🌐 네트워크
        </button>
        <button
          onClick={() => setFilter('page_load')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'page_load'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚡ 페이지
        </button>
        <button
          onClick={() => setFilter('script')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'script'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📜 스크립트
        </button>
        <button
          onClick={() => setFilter('service_worker')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'service_worker'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🔧 SW
        </button>
        <button
          onClick={() => setFilter('app_lifecycle')}
          className={`px-3 py-1 rounded text-sm ${
            filter === 'app_lifecycle'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📱 앱
        </button>
      </div>

      {/* 에러 로그 목록 */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-900"></div>
          <p className="mt-2">에러 로그를 불러오는 중...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-900 font-medium mb-1">에러 로그가 없습니다</p>
          <p className="text-sm text-gray-600">
            모바일에서 발생하는 에러가 자동으로 이곳에 기록됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              {/* 에러 카드 헤더 */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getErrorIcon(log.errorType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 break-words">
                      {log.errorMessage}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleString('ko-KR')}
                    </p>

                    {/* 기본 정보 */}
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">📱 디바이스:</span>
                        <span className="text-gray-900">
                          {log.deviceType === 'mobile' ? 'Mobile' : 'Desktop'} ({log.screenSize})
                        </span>
                      </div>
                      {log.networkType && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">🌐 네트워크:</span>
                          <span className="text-gray-900">{log.networkType}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">📍 URL:</span>
                        <span className="text-gray-900 truncate">{log.url}</span>
                      </div>
                    </div>

                    {/* 상세보기 버튼 */}
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {expandedLogId === log.id ? (
                        <>
                          접기 <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          상세보기 <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 상세 정보 (펼침) */}
              {expandedLogId === log.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 text-sm space-y-4">
                  {/* 환경 정보 */}
                  {log.environment && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">🌍 환경 정보</h5>
                      <div className="space-y-1 text-xs">
                        <div>• 온라인: {log.environment.online ? 'Yes' : 'No'}</div>
                        {log.environment.batteryLevel && (
                          <div>• 배터리: {log.environment.batteryLevel}% {log.environment.charging ? '(충전 중)' : ''}</div>
                        )}
                        {log.environment.deviceMemory && (
                          <div>• 메모리: {log.environment.deviceMemory}GB</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Breadcrumbs */}
                  {log.breadcrumbs && log.breadcrumbs.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">🔍 최근 활동</h5>
                      <div className="space-y-1 font-mono text-xs">
                        {log.breadcrumbs.slice(-10).reverse().map((bc: any, idx: number) => (
                          <div key={idx} className="text-gray-700">
                            <span className="text-gray-500">
                              {new Date(bc.timestamp).toLocaleTimeString()}
                            </span>
                            {' '}
                            <span className="text-blue-600">[{bc.type}]</span>
                            {' '}
                            {bc.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 네트워크 로그 */}
                  {log.networkLogs && log.networkLogs.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">🌐 최근 네트워크 요청</h5>
                      <div className="space-y-1 text-xs">
                        {log.networkLogs.slice(-5).map((nl: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className={nl.success ? 'text-green-600' : 'text-red-600'}>
                              {nl.success ? '✅' : '❌'}
                            </span>
                            <span className="text-gray-700">
                              {nl.method} {nl.url.substring(nl.url.lastIndexOf('/') + 1)}
                            </span>
                            {nl.status && <span className="text-gray-500">({nl.status})</span>}
                            <span className="text-gray-500">{nl.duration}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 에러 스택 */}
                  {log.errorStack && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">📋 스택 트레이스</h5>
                      <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-auto">
                        {log.errorStack}
                      </pre>
                    </div>
                  )}

                  {/* 성능 메트릭 */}
                  {log.performanceMetrics && Object.keys(log.performanceMetrics).length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">📊 성능 메트릭</h5>
                      <div className="space-y-1 text-xs">
                        {log.performanceMetrics.fcp && <div>• FCP: {Math.round(log.performanceMetrics.fcp)}ms</div>}
                        {log.performanceMetrics.lcp && <div>• LCP: {Math.round(log.performanceMetrics.lcp)}ms</div>}
                        {log.performanceMetrics.ttfb && <div>• TTFB: {Math.round(log.performanceMetrics.ttfb)}ms</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 관리 버튼 */}
      {errorLogs.length > 0 && (
        <div className="flex gap-2 pt-4">
          <button
            onClick={handleRetryUpload}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Supabase 재업로드
          </button>
          <button
            onClick={handleClearLogs}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            로그 삭제
          </button>
        </div>
      )}
    </div>
  );
}
