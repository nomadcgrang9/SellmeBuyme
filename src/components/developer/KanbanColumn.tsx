// KanbanColumn - 칸반 보드의 상태별 드롭 존

import { useDroppable } from '@dnd-kit/core';
import type { ProjectStatus } from '@/types/developer';
import { PROJECT_STATUS_CONFIG } from '@/types/developer';

interface KanbanColumnProps {
  status: ProjectStatus;
  count: number;
  children: React.ReactNode;
}

export default function KanbanColumn({ status, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = PROJECT_STATUS_CONFIG[status];

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 transition-all ${
        isOver
          ? 'border-primary bg-primary/5 shadow-lg'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* 헤더 */}
      <div className={`px-4 py-3 border-b ${isOver ? 'border-primary/20' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${config.colorClass}`}>
              {config.label}
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {count}개
            </span>
          </div>
        </div>
      </div>

      {/* 카드 리스트 */}
      <div className={`p-3 space-y-3 min-h-[120px] ${
        isOver ? 'bg-primary/5' : ''
      }`}>
        {children}
        {count === 0 && (
          <div className="flex items-center justify-center h-20 text-sm text-gray-400">
            {isOver ? '여기에 놓으세요' : '프로젝트 없음'}
          </div>
        )}
      </div>
    </div>
  );
}
