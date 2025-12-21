// KanbanView - 드래그앤드롭 칸반 보드 메인 컴포넌트

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import KanbanColumn from './KanbanColumn';
import DraggableProjectCard from './DraggableProjectCard';
import type { DevProject, ProjectStatus } from '@/types/developer';
import { useToastStore } from '@/stores/toastStore';

interface KanbanViewProps {
  projects: DevProject[];
  onEdit: (project: DevProject) => void;
  onDelete: (id: string) => void;
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
  onViewDetail?: (project: DevProject) => void;
}

const STATUS_ORDER: ProjectStatus[] = ['active', 'paused', 'completed', 'difficult'];

export default function KanbanView({ projects, onEdit, onDelete, onStatusChange, onViewDetail }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const showToast = useToastStore((state) => state.showToast);

  // 터치와 마우스 모두 지원
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작 (클릭과 구분)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms 길게 누르기 (스크롤과 구분)
        tolerance: 5,
      },
    })
  );

  // 상태별로 프로젝트 그룹화
  const projectsByStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = projects.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProjectStatus, DevProject[]>);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as ProjectStatus;
    const project = projects.find(p => p.id === projectId);

    if (!project) return;

    // 같은 상태면 변경 안함
    if (project.status === newStatus) return;

    try {
      await onStatusChange(projectId, newStatus);

      const statusLabels = {
        active: '진행중',
        paused: '보류',
        completed: '완료',
        difficult: '어려움',
      };

      showToast(`프로젝트가 '${statusLabels[newStatus]}'(으)로 변경되었습니다`, 'success');
    } catch (error) {
      console.error('Failed to update project status:', error);
      showToast('상태 변경에 실패했습니다', 'error');
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        {STATUS_ORDER.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            count={projectsByStatus[status].length}
          >
            {projectsByStatus[status].map(project => (
              <DraggableProjectCard
                key={project.id}
                project={project}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewDetail={onViewDetail}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>

      {/* 드래그 중인 카드의 오버레이 */}
      <DragOverlay>
        {activeProject ? (
          <div className="opacity-90 cursor-grabbing">
            <DraggableProjectCard
              project={activeProject}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
