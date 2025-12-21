'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarDataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  data: BarDataPoint[];
  loading?: boolean;
  color?: string;
  highlightPeak?: boolean;
  unit?: string;
  subtitle?: string;
}

export default function BarChart({
  title,
  data,
  loading = false,
  color = '#68B2FF',
  highlightPeak = true,
  unit = '',
  subtitle,
}: BarChartProps) {
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

  const chartData = data.map((point) => ({
    name: point.label,
    value: point.value,
  }));

  const maxValue = Math.max(...data.map((d) => d.value));
  const peakIndex = data.findIndex((d) => d.value === maxValue);
  const peakLabel = data[peakIndex]?.label || '';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {highlightPeak && (
          <div className="text-right">
            <div className="text-xs text-slate-500">피크 시간</div>
            <div className="text-sm font-semibold text-slate-700">{peakLabel}</div>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <RechartsBarChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#94A3B8"
            style={{ fontSize: '11px' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            style={{ fontSize: '11px' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#F1F5F9' }}
            formatter={(value: number) => [`${value.toLocaleString()}${unit}`, '방문']}
            cursor={{ fill: 'rgba(104, 178, 255, 0.1)' }}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
            animationDuration={800}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={highlightPeak && index === peakIndex ? '#3B82F6' : color}
                opacity={highlightPeak && index !== peakIndex ? 0.7 : 1}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
