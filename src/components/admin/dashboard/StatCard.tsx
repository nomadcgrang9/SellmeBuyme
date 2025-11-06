import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down';
  loading?: boolean;
}

export default function StatCard({
  icon,
  label,
  value,
  change,
  trend = 'up',
  loading = false
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-8 w-8 rounded-lg bg-slate-200 mb-3" />
          <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
          <div className="h-8 w-24 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-16 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* 아이콘 */}
      <div className="text-3xl mb-3">{icon}</div>

      {/* 라벨 */}
      <div className="text-sm font-medium text-slate-600 mb-1">{label}</div>

      {/* 값 */}
      <div className="text-2xl font-bold text-slate-900 mb-2">{value}</div>

      {/* 증감률 */}
      {change !== undefined && (
        <div className="flex items-center gap-1">
          {trend === 'up' ? (
            <IconArrowUp size={16} className="text-emerald-500" stroke={2.5} />
          ) : (
            <IconArrowDown size={16} className="text-red-500" stroke={2.5} />
          )}
          <span
            className={`text-sm font-semibold ${
              trend === 'up' ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {Math.abs(change)}%
          </span>
          <span className="text-xs text-slate-400 ml-1">vs 어제</span>
        </div>
      )}
    </div>
  );
}
