'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
          <div className="h-64 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-slate-400">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  // 색상 할당
  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.value,
    percentage: item.percentage,
    fill: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

      {/* Recharts 파이 차트 */}
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ percentage }) => `${percentage}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#F1F5F9' }}
            formatter={(value: number) => [value.toLocaleString() + '명', '인원']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => {
              const item = chartData.find((d) => d.name === value);
              return `${value} (${item?.percentage}%)`;
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
