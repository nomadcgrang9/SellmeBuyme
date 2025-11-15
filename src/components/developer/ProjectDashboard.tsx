// ProjectDashboard - 프로젝트 요약 통계 대시보드

import type { DevProject } from '@/types/developer';
import { calculateProjectSummary } from '@/lib/utils/projectMetrics';

interface ProjectDashboardProps {
  projects: DevProject[];
}

export default function ProjectDashboard({ projects }: ProjectDashboardProps) {
  const summary = calculateProjectSummary(projects);

  if (projects.length === 0) {
    return null; // 프로젝트가 없으면 대시보드 표시 안함
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h3 className="font-semibold text-gray-900">프로젝트 요약</h3>
      </div>

      {/* 상태별 카운트 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatBox
          icon="🟢"
          label="진행중"
          value={summary.active}
          colorClass="bg-blue-100 text-blue-800"
        />
        <StatBox
          icon="✅"
          label="완료"
          value={summary.completed}
          colorClass="bg-green-100 text-green-800"
        />
        <StatBox
          icon="🟡"
          label="보류"
          value={summary.paused}
          colorClass="bg-yellow-100 text-yellow-800"
        />
        <StatBox
          icon="🔴"
          label="어려움"
          value={summary.difficult}
          colorClass="bg-red-100 text-red-800"
        />
      </div>

      {/* 평균 진행률 */}
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            전체 평균 진행률
          </span>
          <span className="text-sm font-semibold text-gray-900">
            {summary.avgProgress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-[#a8c5e0] h-3 rounded-full transition-all duration-500"
            style={{ width: `${summary.avgProgress}%` }}
          />
        </div>
      </div>

      {/* 총 프로젝트 수 */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-600">
          총 <span className="font-semibold text-gray-900">{summary.total}</span>개 프로젝트
        </span>
      </div>
    </div>
  );
}

// 상태별 통계 박스 컴포넌트
interface StatBoxProps {
  icon: string;
  label: string;
  value: number;
  colorClass: string;
}

function StatBox({ icon, label, value, colorClass }: StatBoxProps) {
  return (
    <div className={`rounded-lg p-3 ${colorClass} border border-current border-opacity-20`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
