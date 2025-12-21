import { useState } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';

interface RegionData {
  rank: number;
  label: string;
  value: number;
}

interface RegionStatsProps {
  title: string;
  data: RegionData[];
  loading?: boolean;
  initialDisplayCount?: number;
}

// 17개 시도 목록
const ALL_REGIONS = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
];

export default function RegionStats({
  title,
  data,
  loading = false,
  initialDisplayCount = 5,
}: RegionStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 17개 시도 전체 데이터 생성 (데이터 없는 시도는 0으로)
  const fullData: RegionData[] = ALL_REGIONS.map((region) => {
    const found = data.find((d) => d.label === region);
    return found || { rank: 0, label: region, value: 0 };
  });

  // 값 기준 정렬 후 순위 재할당
  const sortedData = [...fullData]
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  // 총 접속자 수
  const totalVisitors = sortedData.reduce((sum, item) => sum + item.value, 0);

  // 최대값 (비율 바 계산용)
  const maxValue = Math.max(...sortedData.map((d) => d.value), 1);

  // 데이터 없는 시도 수
  const emptyRegionCount = sortedData.filter((d) => d.value === 0).length;

  // 표시할 데이터
  const displayData = isExpanded ? sortedData : sortedData.slice(0, initialDisplayCount);

  // 순위별 메달 이모지
  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

      {sortedData.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-400">
          데이터가 없습니다
        </div>
      ) : (
        <>
          {/* 테이블 헤더 */}
          <div className="flex items-center text-xs text-slate-500 font-medium pb-2 border-b border-slate-100 mb-2">
            <div className="w-12">순위</div>
            <div className="flex-1">지역</div>
            <div className="w-20 text-right">접속자</div>
            <div className="w-16 text-right">비율</div>
            <div className="w-32 ml-3"></div>
          </div>

          {/* 데이터 목록 */}
          <div className="space-y-1">
            {displayData.map((row, index) => {
              const percentage = totalVisitors > 0
                ? ((row.value / totalVisitors) * 100).toFixed(1)
                : '0.0';
              const barWidth = (row.value / maxValue) * 100;
              const isTop5 = row.rank <= 5;
              const medal = getRankBadge(row.rank);

              return (
                <div
                  key={row.label}
                  className={`flex items-center py-2 px-2 rounded-lg transition-colors ${
                    row.value === 0
                      ? 'bg-slate-50/50 opacity-60'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* 순위 */}
                  <div className="w-12 flex items-center gap-1">
                    {medal ? (
                      <span className="text-base">{medal}</span>
                    ) : (
                      <span
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          isTop5
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {row.rank}
                      </span>
                    )}
                  </div>

                  {/* 지역명 */}
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      row.value === 0 ? 'text-slate-400' : 'text-slate-700'
                    }`}>
                      {row.label}
                    </span>
                  </div>

                  {/* 접속자 수 */}
                  <div className="w-20 text-right">
                    <span className={`text-sm font-semibold ${
                      row.value === 0 ? 'text-slate-400' : 'text-slate-900'
                    }`}>
                      {row.value.toLocaleString()}명
                    </span>
                  </div>

                  {/* 비율 */}
                  <div className="w-16 text-right">
                    <span className={`text-xs ${
                      row.value === 0 ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {percentage}%
                    </span>
                  </div>

                  {/* 비율 바 */}
                  <div className="w-32 ml-3">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          row.rank === 1
                            ? 'bg-blue-500'
                            : row.rank <= 3
                            ? 'bg-blue-400'
                            : row.rank <= 5
                            ? 'bg-blue-300'
                            : 'bg-slate-300'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 구분선 (확장 시) */}
          {isExpanded && initialDisplayCount < sortedData.length && (
            <div className="border-t border-dashed border-slate-200 my-3" />
          )}

          {/* 확장/접기 버튼 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
          >
            {isExpanded ? (
              <>
                <IconChevronUp size={18} />
                접기
              </>
            ) : (
              <>
                <IconChevronDown size={18} />
                전체 17개 시도 보기
              </>
            )}
          </button>

          {/* 하단 요약 (확장 시에만) */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <span>총 접속자: <strong className="text-slate-700">{totalVisitors.toLocaleString()}명</strong></span>
              {emptyRegionCount > 0 && (
                <span>데이터 없음: <strong className="text-orange-500">{emptyRegionCount}개 시도</strong></span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
