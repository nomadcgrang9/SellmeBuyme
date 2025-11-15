// DraggableProjectCard - 드래그 가능한 프로젝트 카드

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Edit2 } from 'lucide-react';
import type { DevProject } from '@/types/developer';
import { PROJECT_STATUS_CONFIG } from '@/types/developer';

interface DraggableProjectCardProps {
  project: DevProject;
  onEdit: (project: DevProject) => void;
  onDelete: (id: string) => void;
}

export default function DraggableProjectCard({
  project,
  onEdit,
  onDelete,
}: DraggableProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const completedStages = project.stages.filter(s => s.isCompleted).length;
  const totalStages = project.stages.length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  const statusConfig = PROJECT_STATUS_CONFIG[project.status];
  const createdDate = new Date(project.startDate).toLocaleDateString('ko-KR');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden transition-all ${
        isDragging
          ? 'opacity-50 shadow-2xl scale-105 rotate-2'
          : 'hover:shadow-md cursor-grab active:cursor-grabbing'
      }`}
      {...listeners}
      {...attributes}
    >
      {/* 카드 헤더 */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
              🚀 {project.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>참여: {Array.isArray(project.participants) ? project.participants.join(', ') : project.participants}</span>
              <span>•</span>
              <span>{createdDate}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="수정"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('정말 삭제하시겠습니까?')) {
                  onDelete(project.id);
                }
              }}
              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">
            {progressPercent}% ({completedStages}/{totalStages})
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-[#a8c5e0] h-1.5 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 목표 */}
      <div className="px-3 py-2 border-t border-gray-100">
        <p className="text-xs text-gray-700 line-clamp-2">
          {project.goal}
        </p>
      </div>
    </div>
  );
}
