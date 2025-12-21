import { useState, useEffect } from 'react';
import { IconChevronDown, IconChevronUp, IconCheck, IconX, IconClock, IconRefresh } from '@tabler/icons-react';
import { fetchCrawlBoardStatusData, type CrawlBoardStatusData } from '@/lib/supabase/queries';

// 17개 시도 목록
const ALL_REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

interface CrawlBoardStatusProps {
  refreshToken?: number;
}

export default function CrawlBoardStatus({ refreshToken }: CrawlBoardStatusProps) {
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CrawlBoardStatusData | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusData = await fetchCrawlBoardStatusData();
      setData(statusData);
    } catch (err) {
      console.error('크롤링 현황 조회 실패:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshToken]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg p-3 h-20 border border-slate-200" />
            ))}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="h-6 w-48 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-9 gap-2">
            {[...Array(17)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <IconX size={20} />
            <span className="text-sm">{error || '데이터를 불러올 수 없습니다.'}</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
          >
            <IconRefresh size={16} />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 등록된 시도 목록
  const registeredRegions = data.registeredBoards.map(b => b.region);
  const coverageCount = registeredRegions.length;
  const coveragePercent = Math.round((coverageCount / 17) * 100);

  // 지역별 게시판 수 맵
  const regionBoardMap = new Map(data.registeredBoards.map(b => [b.region, b]));

  return (
    <div className="space-y-4">
      {/* 오늘 크롤링 현황 */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">
            오늘 크롤링 현황 ({new Date().toLocaleDateString('ko-KR')})
          </h4>
          <button
            onClick={loadData}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <IconRefresh size={14} />
            새로고침
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* 성공 */}
          <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <IconCheck size={18} />
              <span className="text-xs font-medium">성공</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {data.todayStatus.success}개
            </div>
          </div>

          {/* 실패 */}
          <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
            <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
              <IconX size={18} />
              <span className="text-xs font-medium">실패</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {data.todayStatus.failed}개
            </div>
          </div>

          {/* 미실행 */}
          <div className="bg-white rounded-lg p-3 text-center border border-slate-200">
            <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
              <IconClock size={18} />
              <span className="text-xs font-medium">미실행</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {data.todayStatus.pending}개
            </div>
          </div>
        </div>

        {/* 최근 실패 목록 */}
        {data.todayStatus.recentFailures.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <div className="text-xs font-medium text-red-700 mb-2">최근 실패:</div>
            {data.todayStatus.recentFailures.map((failure, idx) => (
              <div key={idx} className="text-sm text-red-600">
                • {failure.name} - {failure.error} ({failure.time})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 17개 시도 커버리지 */}
      <div className="bg-slate-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-700">
            전국 17개 시도 커버리지
          </h4>
          <span className="text-sm font-bold text-blue-600">
            {coverageCount}/17 ({coveragePercent}%)
          </span>
        </div>

        {/* 시도 체크박스 그리드 */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2 mb-4">
          {ALL_REGIONS.map((region) => {
            const isRegistered = registeredRegions.includes(region);
            const regionData = regionBoardMap.get(region);
            const boardCount = regionData?.boardCount || 0;
            return (
              <div
                key={region}
                className={`relative px-2 py-2 rounded-lg text-center text-xs font-medium transition-colors ${
                  isRegistered
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-white text-slate-400 border border-slate-200'
                }`}
              >
                <div className="mb-1">{region}</div>
                <div className="text-base">
                  {isRegistered ? '✅' : '⬜'}
                </div>
                {boardCount > 0 && (
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    {boardCount}개
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 상세보기 버튼 */}
        <button
          onClick={() => setIsDetailExpanded(!isDetailExpanded)}
          className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isDetailExpanded ? (
            <>
              <IconChevronUp size={18} />
              접기
            </>
          ) : (
            <>
              <IconChevronDown size={18} />
              상세보기
            </>
          )}
        </button>

        {/* 상세 테이블 (확장 시) */}
        {isDetailExpanded && (
          <div className="mt-4 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">시도</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">상태</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">등록 게시판 수</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">마지막 크롤링</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ALL_REGIONS.map((region) => {
                  const regionData = regionBoardMap.get(region);
                  const isRegistered = !!regionData;
                  const boardCount = regionData?.boardCount || 0;

                  // 가장 최근 크롤링 시간 찾기
                  let lastCrawledDisplay = '-';
                  if (regionData) {
                    const lastCrawled = regionData.boards
                      .filter(b => b.lastCrawledAt)
                      .sort((a, b) => new Date(b.lastCrawledAt!).getTime() - new Date(a.lastCrawledAt!).getTime())[0];
                    if (lastCrawled?.lastCrawledAt) {
                      const date = new Date(lastCrawled.lastCrawledAt);
                      lastCrawledDisplay = date.toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    }
                  }

                  return (
                    <tr key={region} className={isRegistered ? '' : 'bg-slate-50/50 opacity-60'}>
                      <td className="px-3 py-2 font-medium text-slate-700">{region}</td>
                      <td className="px-3 py-2">
                        {isRegistered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <IconCheck size={12} />
                            등록됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                            미등록
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {boardCount > 0 ? `${boardCount}개` : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {lastCrawledDisplay}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 등록된 게시판 요약 */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          등록된 게시판 요약
        </h4>

        {/* 통계 */}
        <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
          <span>총 등록: <strong className="text-slate-900">{data.boardStats.total}개</strong></span>
          <span className="text-slate-300">|</span>
          <span>활성: <strong className="text-emerald-600">{data.boardStats.active}개</strong></span>
          <span className="text-slate-300">|</span>
          <span>비활성: <strong className="text-slate-400">{data.boardStats.inactive}개</strong></span>
        </div>

        {/* 시도별 게시판 목록 */}
        {data.registeredBoards.length > 0 ? (
          <div className="space-y-2">
            {data.registeredBoards.map((regionData) => (
              <div key={regionData.region} className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {regionData.region}
                  </span>
                  <span className="text-xs text-slate-500">
                    {regionData.boardCount}개 게시판
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  {regionData.boards.map(b => b.name).join(', ')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm">
            등록된 게시판이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
