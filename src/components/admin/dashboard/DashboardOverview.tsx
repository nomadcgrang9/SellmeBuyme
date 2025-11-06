import { useState, useEffect } from 'react';
import StatCard from './StatCard';
import LineChart from './LineChart';
import StatsTable from './StatsTable';
import PieChart from './PieChart';
import { fetchDashboardData, type DashboardData } from '@/lib/supabase/dashboard';

// 임시 Mock 데이터 (나중에 실제 API로 교체)
const MOCK_DATA = {
  kpi: {
    dau: { value: 234, change: 12, trend: 'up' as const },
    mau: { value: 1234, change: 8, trend: 'up' as const },
    jobs: { value: 89, change: 15, trend: 'up' as const },
    talents: { value: 456, change: 5, trend: 'up' as const },
  },
  traffic: [
    { label: '11/1', value: 50 },
    { label: '11/2', value: 100 },
    { label: '11/3', value: 150 },
    { label: '11/4', value: 200 },
    { label: '11/5', value: 180 },
    { label: '11/6', value: 220 },
    { label: '11/7', value: 234 },
  ],
  topSearches: [
    { rank: 1, label: '수원 중등 기간제', value: 234 },
    { rank: 2, label: '성남 초등 방과후', value: 189 },
    { rank: 3, label: '서울 강사', value: 156 },
    { rank: 4, label: '인천 체험', value: 134 },
    { rank: 5, label: '경기 교사', value: 123 },
    { rank: 6, label: '부산 코딩', value: 112 },
    { rank: 7, label: '대구 음악', value: 98 },
    { rank: 8, label: '광주 미술', value: 87 },
    { rank: 9, label: '대전 체육', value: 76 },
    { rank: 10, label: '울산 영어', value: 65 },
  ],
  gender: [
    { label: '남', value: 556, percentage: 45, color: '#68B2FF' },
    { label: '여', value: 678, percentage: 55, color: '#F4C96B' },
  ],
  age: [
    { label: '20대', value: 185, percentage: 15, color: '#68B2FF' },
    { label: '30대', value: 432, percentage: 35, color: '#7DB8A3' },
    { label: '40대', value: 494, percentage: 40, color: '#F4C96B' },
    { label: '50대+', value: 123, percentage: 10, color: '#EF4444' },
  ],
  role: [
    { label: '교사', value: 494, percentage: 40, color: '#68B2FF' },
    { label: '강사', value: 432, percentage: 35, color: '#7DB8A3' },
    { label: '행정', value: 185, percentage: 15, color: '#F4C96B' },
    { label: '업체', value: 123, percentage: 10, color: '#EF4444' },
  ],
  region: [
    { rank: 1, label: '경기', value: 432 },
    { rank: 2, label: '서울', value: 309 },
    { rank: 3, label: '인천', value: 123 },
    { rank: 4, label: '부산', value: 99 },
    { rank: 5, label: '대구', value: 86 },
  ],
  menuClicks: {
    jobToggle: 456,
    talentToggle: 389,
    experienceToggle: 234,
    search: 678,
    filter: 234,
    register: 123,
  },
};

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(MOCK_DATA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const dashboardData = await fetchDashboardData();
        setData(dashboardData);
      } catch (err) {
        console.error('대시보드 데이터 로딩 실패:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        // 에러 시 Mock 데이터 사용
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

      {/* 핵심 지표 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📈"
          label="일간 활성 사용자 (DAU)"
          value={`${data.kpi.dau.value}명`}
          change={data.kpi.dau.change}
          trend={data.kpi.dau.trend}
          loading={loading}
        />
        <StatCard
          icon="👥"
          label="월간 활성 사용자 (MAU)"
          value={`${data.kpi.mau.value}명`}
          change={data.kpi.mau.change}
          trend={data.kpi.mau.trend}
          loading={loading}
        />
        <StatCard
          icon="📝"
          label="공고 등록 수"
          value={`${data.kpi.jobs.value}개`}
          change={data.kpi.jobs.change}
          trend={data.kpi.jobs.trend}
          loading={loading}
        />
        <StatCard
          icon="🧑"
          label="인력 등록 수"
          value={`${data.kpi.talents.value}명`}
          change={data.kpi.talents.change}
          trend={data.kpi.talents.trend}
          loading={loading}
        />
      </div>

      {/* 일일 방문자 추이 */}
      <LineChart
        title="📈 일일 방문자 추이 (최근 7일)"
        data={data.traffic}
        loading={loading}
      />

      {/* 사용자 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChart title="👥 성별 분포" data={data.gender} loading={loading} />
        <PieChart title="📅 연령대 분포" data={data.age} loading={loading} />
        <PieChart title="💼 역할 분포" data={data.role} loading={loading} />
        <StatsTable
          title="🗺️ 지역 분포 TOP 5"
          data={data.region}
          maxRows={5}
          loading={loading}
        />
      </div>

      {/* 인기 검색어 */}
      <StatsTable
        title="🔥 인기 검색어 TOP 10"
        data={data.topSearches}
        maxRows={10}
        loading={loading}
      />

      {/* 메뉴 클릭 통계 */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          🖱️ 메뉴 클릭 통계 (오늘)
        </h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-slate-50">
                <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
                <div className="h-8 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-600 mb-1">공고 토글</div>
              <div className="text-2xl font-bold text-slate-900">
                {data.menuClicks.jobToggle.toLocaleString()}회
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-600 mb-1">인력 토글</div>
              <div className="text-2xl font-bold text-slate-900">
                {data.menuClicks.talentToggle.toLocaleString()}회
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-600 mb-1">체험 토글</div>
              <div className="text-2xl font-bold text-slate-900">
                {data.menuClicks.experienceToggle.toLocaleString()}회
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-600 mb-1">검색 사용</div>
              <div className="text-2xl font-bold text-slate-900">
                {data.menuClicks.search.toLocaleString()}회
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-600 mb-1">필터 사용</div>
              <div className="text-2xl font-bold text-slate-900">
                {data.menuClicks.filter.toLocaleString()}회
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <div className="text-sm text-slate-600 mb-1">등록 버튼</div>
              <div className="text-2xl font-bold text-slate-900">
                {data.menuClicks.register.toLocaleString()}회
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
