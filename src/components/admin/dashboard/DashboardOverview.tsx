import { useState, useEffect } from 'react';
import StatCard from './StatCard';
import LineChart from './LineChart';
import StatsTable from './StatsTable';
import PieChart from './PieChart';

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
};

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(MOCK_DATA);

  useEffect(() => {
    // 임시 로딩 시뮬레이션
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">공고 토글</div>
            <div className="text-2xl font-bold text-slate-900">456회</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">인력 토글</div>
            <div className="text-2xl font-bold text-slate-900">389회</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">체험 토글</div>
            <div className="text-2xl font-bold text-slate-900">234회</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">검색 사용</div>
            <div className="text-2xl font-bold text-slate-900">678회</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">필터 사용</div>
            <div className="text-2xl font-bold text-slate-900">234회</div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50">
            <div className="text-sm text-slate-600 mb-1">등록 버튼</div>
            <div className="text-2xl font-bold text-slate-900">123회</div>
          </div>
        </div>
      </div>
    </div>
  );
}
