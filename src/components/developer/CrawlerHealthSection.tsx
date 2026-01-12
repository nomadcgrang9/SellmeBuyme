// CrawlerHealthSection - 크롤러 상태 점검 섹션
import { useState } from 'react';
import { RefreshCw, Activity, CheckCircle, AlertTriangle, XCircle, MinusCircle, AlertOctagon } from 'lucide-react';
import { useCrawlerHealth } from '@/lib/hooks/useCrawlerHealth';
import CrawlerHealthCard from './CrawlerHealthCard';
import { REGION_BOARDS, CRAWLER_HEALTH_STATUS_CONFIG } from '@/types/developer';

type FilterType = 'all' | 'critical' | 'warning' | 'healthy' | 'inactive' | 'error';

export default function CrawlerHealthSection() {
  const { results, summary, loading, error, progress, checkHealth } = useCrawlerHealth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // 지역 선택 토글
  const toggleRegion = (code: string) => {
    setSelectedRegions(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  // 전체 선택/해제
  const toggleAllRegions = () => {
    if (selectedRegions.length === Object.keys(REGION_BOARDS).length) {
      setSelectedRegions([]);
    } else {
      setSelectedRegions(Object.keys(REGION_BOARDS));
    }
  };

  // 점검 시작
  const handleCheck = () => {
    const regions = selectedRegions.length > 0 ? selectedRegions : undefined;
    checkHealth(regions);
    setIsSelectMode(false);
  };

  // 필터링된 결과
  const filteredResults = results.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  // 활성 지역만 표시
  const activeRegions = Object.entries(REGION_BOARDS).filter(([, config]) => config.active);
  const inactiveRegions = Object.entries(REGION_BOARDS).filter(([, config]) => !config.active);

  return (
    <div className="space-y-4">
      {/* 점검 컨트롤 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">크롤러 상태 자동 점검</span>
          </div>
          <button
            onClick={() => setIsSelectMode(!isSelectMode)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isSelectMode ? '취소' : '지역 선택'}
          </button>
        </div>

        {/* 지역 선택 모드 */}
        {isSelectMode && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">점검할 지역 선택</span>
              <button
                onClick={toggleAllRegions}
                className="text-xs text-blue-600 hover:underline"
              >
                {selectedRegions.length === Object.keys(REGION_BOARDS).length ? '전체 해제' : '전체 선택'}
              </button>
            </div>

            {/* 활성 지역 */}
            <div className="mb-2">
              <span className="text-xs text-gray-500 mb-1 block">활성 지역</span>
              <div className="flex flex-wrap gap-2">
                {activeRegions.map(([code, config]) => (
                  <button
                    key={code}
                    onClick={() => toggleRegion(code)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      selectedRegions.includes(code)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 비활성 지역 */}
            {inactiveRegions.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 mb-1 block">비활성 지역</span>
                <div className="flex flex-wrap gap-2">
                  {inactiveRegions.map(([code, config]) => (
                    <button
                      key={code}
                      onClick={() => toggleRegion(code)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        selectedRegions.includes(code)
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {config.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 점검 버튼 */}
        <button
          onClick={handleCheck}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
            loading
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          {loading
            ? `점검 중... (${progress.current}/${progress.total}) - 원본 사이트 분석 중`
            : selectedRegions.length > 0
              ? `선택 지역 점검 (${selectedRegions.length}개)`
              : '전체 지역 점검'
          }
        </button>

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            점검 중 오류가 발생했습니다: {error.message}
          </div>
        )}
      </div>

      {/* 결과 요약 */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">점검 결과 요약</h4>
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => setFilter('critical')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'critical' ? 'ring-2 ring-red-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.critical.bgColor}`}
            >
              <XCircle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.critical.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.critical.textColor}`}>
                {summary.critical}
              </div>
              <div className="text-xs text-gray-600">긴급</div>
            </button>

            <button
              onClick={() => setFilter('warning')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'warning' ? 'ring-2 ring-yellow-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.warning.bgColor}`}
            >
              <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.warning.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.warning.textColor}`}>
                {summary.warning}
              </div>
              <div className="text-xs text-gray-600">주의</div>
            </button>

            <button
              onClick={() => setFilter('healthy')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'healthy' ? 'ring-2 ring-green-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.healthy.bgColor}`}
            >
              <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.healthy.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.healthy.textColor}`}>
                {summary.healthy}
              </div>
              <div className="text-xs text-gray-600">정상</div>
            </button>

            <button
              onClick={() => setFilter('inactive')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'inactive' ? 'ring-2 ring-gray-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.inactive.bgColor}`}
            >
              <MinusCircle className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.inactive.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.inactive.textColor}`}>
                {summary.inactive}
              </div>
              <div className="text-xs text-gray-600">비활성</div>
            </button>

            <button
              onClick={() => setFilter('error')}
              className={`p-3 rounded-lg text-center transition-colors ${
                filter === 'error' ? 'ring-2 ring-orange-500' : ''
              } ${CRAWLER_HEALTH_STATUS_CONFIG.error.bgColor}`}
            >
              <AlertOctagon className={`w-5 h-5 mx-auto mb-1 ${CRAWLER_HEALTH_STATUS_CONFIG.error.textColor}`} />
              <div className={`text-lg font-bold ${CRAWLER_HEALTH_STATUS_CONFIG.error.textColor}`}>
                {summary.error || 0}
              </div>
              <div className="text-xs text-gray-600">오류</div>
            </button>
          </div>

          {/* 필터 리셋 */}
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-3 w-full py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg"
            >
              전체 보기 ({summary.total}개)
            </button>
          )}
        </div>
      )}

      {/* 결과 카드 목록 */}
      {filteredResults.length > 0 && (
        <div className="space-y-3">
          {filteredResults.map(result => (
            <CrawlerHealthCard key={result.regionCode} result={result} />
          ))}
        </div>
      )}

      {/* 점검 전 안내 */}
      {!loading && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="mb-2">아직 점검을 실행하지 않았습니다</p>
          <p className="text-sm">위의 버튼을 클릭하여 크롤러 상태를 점검하세요</p>
        </div>
      )}
    </div>
  );
}
