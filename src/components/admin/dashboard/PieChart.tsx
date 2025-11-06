interface PieDataPoint {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

interface PieChartProps {
  title: string;
  data: PieDataPoint[];
  loading?: boolean;
}

const DEFAULT_COLORS = [
  '#68B2FF',
  '#7DB8A3',
  '#F4C96B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
];

export default function PieChart({ title, data, loading = false }: PieChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-slate-200" />
          </div>
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

  // 색상 할당
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  // SVG 파이 차트 계산
  const radius = 60;
  const centerX = 70;
  const centerY = 70;
  let currentAngle = -90; // 12시 방향부터 시작

  const slices = dataWithColors.map((item) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    // 라디안 변환
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // 좌표 계산
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    // 큰 호 플래그
    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    currentAngle = endAngle;

    return {
      ...item,
      path,
    };
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* 파이 차트 */}
        <div className="flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            {slices.map((slice, index) => (
              <g key={index}>
                <path
                  d={slice.path}
                  fill={slice.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              </g>
            ))}
            {/* 중앙 흰색 원 (도넛 차트 효과) */}
            <circle cx={centerX} cy={centerY} r="30" fill="white" />
          </svg>
        </div>

        {/* 범례 */}
        <div className="flex-1 space-y-2">
          {dataWithColors.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {item.percentage}%
                </span>
                <span className="text-xs text-slate-400">
                  ({item.value.toLocaleString()}명)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
