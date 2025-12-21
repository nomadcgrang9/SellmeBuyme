import { useState, useEffect } from 'react';
import StatCard from './StatCard';
import LineChart from './LineChart';
import BarChart from './BarChart';
import PieChart from './PieChart';
import RegionStats from './RegionStats';

// 비로그인 알파 런칭용 Mock 데이터
const MOCK_DATA = {
  // KPI 4개: DAU, WAU, MAU, 재방문율
  kpi: {
    dau: { value: 125, change: 12, trend: 'up' as const },
    wau: { value: 892, change: 8, trend: 'up' as const },
    mau: { value: 2340, change: 5, trend: 'up' as const },
    retention: { value: 23.5, change: 2.1, trend: 'up' as const },
  },
  // 일일 방문자 추이 (7일)
  traffic: [
    { label: '12/14', value: 98 },
    { label: '12/15', value: 112 },
    { label: '12/16', value: 89 },
    { label: '12/17', value: 145 },
    { label: '12/18', value: 132 },
    { label: '12/19', value: 118 },
    { label: '12/20', value: 125 },
  ],
  // 시간대별 방문 분포 (0~23시)
  hourlyVisits: [
    { label: '0시', value: 12 },
    { label: '1시', value: 8 },
    { label: '2시', value: 5 },
    { label: '3시', value: 3 },
    { label: '4시', value: 2 },
    { label: '5시', value: 4 },
    { label: '6시', value: 15 },
    { label: '7시', value: 28 },
    { label: '8시', value: 45 },
    { label: '9시', value: 78 },
    { label: '10시', value: 95 },
    { label: '11시', value: 88 },
    { label: '12시', value: 72 },
    { label: '13시', value: 85 },
    { label: '14시', value: 112 },
    { label: '15시', value: 98 },
    { label: '16시', value: 87 },
    { label: '17시', value: 76 },
    { label: '18시', value: 65 },
    { label: '19시', value: 58 },
    { label: '20시', value: 48 },
    { label: '21시', value: 42 },
    { label: '22시', value: 32 },
    { label: '23시', value: 18 },
  ],
  // 접속기기 분포
  deviceDistribution: [
    { label: '모바일', value: 1450, percentage: 62, color: '#68B2FF' },
    { label: '데스크톱', value: 890, percentage: 38, color: '#7DB8A3' },
  ],
  // 지역별 접속현황 (17개 시도 전체)
  regionDistribution: [
    { rank: 1, label: '경기', value: 892 },
    { rank: 2, label: '서울', value: 456 },
    { rank: 3, label: '인천', value: 289 },
    { rank: 4, label: '부산', value: 178 },
    { rank: 5, label: '대구', value: 134 },
    { rank: 6, label: '광주', value: 98 },
    { rank: 7, label: '대전', value: 87 },
    { rank: 8, label: '울산', value: 65 },
    { rank: 9, label: '강원', value: 54 },
    { rank: 10, label: '충남', value: 43 },
    { rank: 11, label: '충북', value: 38 },
    { rank: 12, label: '전남', value: 32 },
    { rank: 13, label: '전북', value: 28 },
    { rank: 14, label: '경남', value: 25 },
    { rank: 15, label: '경북', value: 22 },
    { rank: 16, label: '제주', value: 18 },
    { rank: 17, label: '세종', value: 12 },
  ],
};

interface DashboardKPI {
  dau: { value: number; change: number; trend: 'up' | 'down' };
  wau: { value: number; change: number; trend: 'up' | 'down' };
  mau: { value: number; change: number; trend: 'up' | 'down' };
  retention: { value: number; change: number; trend: 'up' | 'down' };
}

interface DashboardDataNew {
  kpi: DashboardKPI;
  traffic: { label: string; value: number }[];
  hourlyVisits: { label: string; value: number }[];
  deviceDistribution: { label: string; value: number; percentage: number; color?: string }[];
  regionDistribution: { rank: number; label: string; value: number }[];
}

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardDataNew>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);
        // TODO: 실제 API 연동 시 여기서 데이터 fetch
        // const dashboardData = await fetchDashboardData();
        // setData(dashboardData);

        // 현재는 Mock 데이터 사용
        await new Promise(resolve => setTimeout(resolve, 500)); // 로딩 시뮬레이션
        setData(MOCK_DATA);
      } catch (err) {
        console.error('대시보드 데이터 로딩 실패:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        setData(MOCK_DATA);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();

    // 5분마다 자동 새로고침
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* 에러 알림 */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
          <p className="mt-1 text-xs text-red-600">Mock 데이터를 표시합니다.</p>
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
