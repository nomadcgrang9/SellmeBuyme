// DeploymentList - GitHub 배포 목록 컴포넌트 (최신 배포)
import { AlertCircle, Loader2 } from 'lucide-react';
import DeploymentCard from './DeploymentCard';
import type { GitHubDeployment } from '@/types/developer';

interface DeploymentListProps {
  deployments: GitHubDeployment[];
  loading: boolean;
  error: Error | null;
}

export default function DeploymentList({
  deployments,
  loading,
  error,
}: DeploymentListProps) {
  // 로딩 상태
  if (loading) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          GitHub 배포 추적
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">로딩 중...</span>
        </div>
      </section>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          GitHub 배포 추적
        </h2>
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 mb-1">
              배포 정보를 불러올 수 없습니다
            </p>
            <p className="text-xs text-red-700">{error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  // 빈 상태
  if (deployments.length === 0) {
    return (
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          GitHub 배포 추적
        </h2>
        <div className="text-center py-8">
          <p className="text-sm text-gray-600">
            아직 배포 기록이 없습니다
          </p>
        </div>
      </section>
    );
  }

  // 배포 목록 표시
  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        GitHub 배포 추적
      </h2>

      <div className="space-y-3">
        {deployments.map((deployment) => (
          <DeploymentCard key={deployment.id} deployment={deployment} />
        ))}
      </div>
    </section>
  );
}
