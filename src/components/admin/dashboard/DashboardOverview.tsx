import { useState, useEffect } from 'react';
import StatCard from './StatCard';
import LineChart from './LineChart';
import BarChart from './BarChart';
import PieChart from './PieChart';
import RegionStats from './RegionStats';
import { fetchDashboardAnalytics, type DashboardAnalyticsData } from '@/lib/supabase/queries';

// 데이터가 없을 때 표시할 기본 구조
const EMPTY_DATA: DashboardAnalyticsData = {
  kpi: {
    dau: { value: 0, change: 0, trend: 'up' },
    wau: { value: 0, change: 0, trend: 'up' },
    mau: { value: 0, change: 0, trend: 'up' },
    retention: { value: 0, change: 0, trend: 'up' },
  },
  traffic: [],
  hourlyVisits: [],
  deviceDistribution: [
    { label: '모바일', value: 0, percentage: 0, color: '#68B2FF' },
    { label: '데스크톱', value: 0, percentage: 0, color: '#7DB8A3' },
  ],
  regionDistribution: [],
};

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardAnalyticsData>(EMPTY_DATA);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const analyticsData = await fetchDashboardAnalytics();
      setData(analyticsData);
    } catch (err) {
      console.error('대시보드 데이터 로딩 실패:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // 5분마다 자동 새로고침
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 데이터 유무 확인
  const hasData = data.kpi.dau.value > 0 || data.kpi.wau.value > 0 || data.kpi.mau.value > 0;

  return (
    <div className="space-y-6">
      {/* 에러 알림 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 데이터 없음 안내 */}
      {!loading && !hasData && !error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span>아직 수집된 방문 데이터가 없습니다. 사용자 방문이 쌓이면 여기에 실제 통계가 표시됩니다.</span>
          </div>
        </div>
      )}

      {/* 섹션 1: 핵심 KPI 4개 */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">핵심 지표</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon="📊"
            label="일간 활성 사용자 (DAU)"
            value={`${data.kpi.dau.value.toLocaleString()}명`}
            change={data.kpi.dau.change}
            trend={data.kpi.dau.trend}
            loading={loading}
          />
          <StatCard
            icon="📈"
            label="주간 활성 사용자 (WAU)"
            value={`${data.kpi.wau.value.toLocaleString()}명`}
            change={data.kpi.wau.change}
            trend={data.kpi.wau.trend}
            loading={loading}
          />
          <StatCard
            icon="👥"
            label="월간 활성 사용자 (MAU)"
            value={`${data.kpi.mau.value.toLocaleString()}명`}
            change={data.kpi.mau.change}
            trend={data.kpi.mau.trend}
            loading={loading}
          />
          <StatCard
            icon="🔄"
            label="재방문율 (D7)"
            value={`${data.kpi.retention.value}%`}
            change={data.kpi.retention.change}
            trend={data.kpi.retention.trend}
            loading={loading}
          />
        </div>
      </div>

      {/* 섹션 2: 일일 방문자 추이 */}
      <LineChart
        title="📈 일일 방문자 추이 (최근 7일)"
        data={data.traffic}
        loading={loading}
      />

      {/* 섹션 3: 시간대별 방문 분포 + 접속기기 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart
          title="⏰ 시간대별 방문 분포"
          subtitle="최근 7일 기준"
          data={data.hourlyVisits}
          loading={loading}
          color="#68B2FF"
          highlightPeak={true}
          unit="회"
        />
        <PieChart
          title="📱 접속기기 분포"
          data={data.deviceDistribution}
          loading={loading}
        />
      </div>

      {/* 섹션 4: 지역별 접속현황 */}
      <RegionStats
        title="📍 지역별 접속 현황"
        data={data.regionDistribution}
        loading={loading}
        initialDisplayCount={5}
      />
    </div>
  );
}
