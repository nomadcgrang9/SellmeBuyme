'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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

  // Recharts 형식으로 데이터 변환
  const chartData = data.map((point) => ({
    name: point.label,
    value: point.value,
  }));

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const avgValue = Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>

      {/* Recharts 라인 차트 */}
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="name"
            stroke="#94A3B8"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#94A3B8"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#F1F5F9' }}
            formatter={(value: number) => [value.toLocaleString(), '방문자']}
            cursor={{ stroke: '#68B2FF', strokeWidth: 2 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={() => '방문자 수'}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#68B2FF"
            strokeWidth={3}
            dot={{ fill: '#68B2FF', r: 5 }}
            activeDot={{ r: 7 }}
            isAnimationActive={true}
            animationDuration={800}
          />
        </RechartsLineChart>
      </ResponsiveContainer>

      {/* 통계 요약 */}
      <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-sm text-slate-500 mb-1">최대</div>
          <div className="text-2xl font-bold text-slate-900">{maxValue}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-500 mb-1">평균</div>
          <div className="text-2xl font-bold text-slate-900">{avgValue}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-500 mb-1">최소</div>
          <div className="text-2xl font-bold text-slate-900">{minValue}</div>
        </div>
      </div>
    </div>
  );
}
