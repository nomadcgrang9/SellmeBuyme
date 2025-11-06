interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  title: string;
  data: DataPoint[];
  loading?: boolean;
}

export default function LineChart({ title, data, loading = false }: LineChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
          <div className="h-48 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-slate-400">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  // SVG 차트 크기
  const width = 100; // 퍼센트
  const height = 200; // px
  const padding = 20;

  // 포인트 계산
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = ((maxValue - point.value) / range) * (height - padding * 2) + padding;
    return { x, y, value: point.value, label: point.label };
  });

  // SVG path 생성
  const pathD = points
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `L ${point.x} ${point.y}`;
    })
    .join(' ');

  // 영역 채우기 path
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

      {/* SVG 차트 */}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* 배경 그리드 */}
          <line
            x1="0"
            y1={height / 2}
            x2="100"
            y2={height / 2}
            stroke="#E2E8F0"
            strokeWidth="0.5"
          />

          {/* 영역 채우기 */}
          <path d={areaD} fill="url(#gradient)" opacity="0.2" />

          {/* 선 */}
          <path d={pathD} fill="none" stroke="#68B2FF" strokeWidth="2" />

          {/* 포인트 */}
          {points.map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r="3" fill="#68B2FF" />
              <circle cx={point.x} cy={point.y} r="1.5" fill="white" />
            </g>
          ))}

          {/* 그라디언트 정의 */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#68B2FF" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#68B2FF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* 호버 툴팁 (간단 버전) */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-slate-500">
          {data.map((point, index) => (
            <div key={index} className="text-center">
              <div className="font-medium">{point.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
        <div>
          <span className="text-slate-500">최대: </span>
          <span className="font-semibold text-slate-900">{maxValue}</span>
        </div>
        <div>
          <span className="text-slate-500">최소: </span>
          <span className="font-semibold text-slate-900">{minValue}</span>
        </div>
        <div>
          <span className="text-slate-500">평균: </span>
          <span className="font-semibold text-slate-900">
            {Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)}
          </span>
        </div>
      </div>
    </div>
  );
}
