// DeploymentCard - GitHub 배포 카드 컴포넌트
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { GitHubDeployment } from '@/types/developer';

interface DeploymentCardProps {
  deployment: GitHubDeployment;
}

export default function DeploymentCard({ deployment }: DeploymentCardProps) {
  // 상태별 아이콘 및 색상
  const getStatusIcon = () => {
    switch (deployment.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusText = () => {
    switch (deployment.status) {
      case 'success':
        return '성공';
      case 'failure':
        return '실패';
      case 'pending':
        return '진행중';
    }
  };

  const getStatusColor = () => {
    switch (deployment.status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'failure':
        return 'bg-red-50 border-red-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
    }
  };

  // 시간 포맷팅
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-start justify-between gap-3">
        {/* 상태 아이콘 */}
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>

        {/* 배포 정보 */}
        <div className="flex-1 min-w-0">
          {/* 브랜치 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">
              {deployment.branch}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              deployment.status === 'success' ? 'bg-green-100 text-green-800' :
              deployment.status === 'failure' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {getStatusText()}
            </span>
          </div>

          {/* 커밋 메시지 */}
          <p className="text-sm text-gray-700 line-clamp-2 mb-2">
            {deployment.commitMessage || '커밋 메시지 없음'}
          </p>

          {/* 메타데이터 */}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            {deployment.author && (
              <>
                <span>{deployment.author}</span>
                <span>•</span>
              </>
            )}
            <span>{formatTimeAgo(deployment.deployedAt)}</span>
            {deployment.commitSha && (
              <>
                <span>•</span>
                <code className="text-xs font-mono bg-gray-100 px-1 rounded">
                  {deployment.commitSha.substring(0, 7)}
                </code>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
