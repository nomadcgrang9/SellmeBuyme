interface StatsRow {
  rank: number;
  label: string;
  value: number;
}

interface StatsTableProps {
  title: string;
  data: StatsRow[];
  maxRows?: number;
  loading?: boolean;
}

export default function StatsTable({
  title,
  data,
  maxRows = 10,
  loading = false
}: StatsTableProps) {
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

  const displayData = data.slice(0, maxRows);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

      {displayData.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-slate-400">
          데이터가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {displayData.map((row) => (
            <div
              key={row.rank}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {/* 순위 + 라벨 */}
              <div className="flex items-center gap-3 flex-1">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    row.rank === 1
                      ? 'bg-yellow-100 text-yellow-700'
                      : row.rank === 2
                      ? 'bg-slate-100 text-slate-700'
                      : row.rank === 3
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  {row.rank}
                </span>
                <span className="text-sm font-medium text-slate-700 truncate">
                  {row.label}
                </span>
              </div>

              {/* 값 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {row.value.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">회</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 더보기 버튼 (데이터가 maxRows보다 많을 때) */}
      {data.length > maxRows && (
        <button className="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
          더보기 ({data.length - maxRows}개 항목)
        </button>
      )}
    </div>
  );
}
