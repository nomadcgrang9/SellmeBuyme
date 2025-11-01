// StatusBadge - 게시판 제출 상태 배지
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import type { SubmissionStatus } from '@/types/developer';

interface StatusBadgeProps {
  status: SubmissionStatus;
}

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  pending: {
    label: '검토 중',
    icon: Clock,
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
  },
  approved: {
    label: '승인됨',
    icon: CheckCircle,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${config.bgColor} ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
