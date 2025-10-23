'use client';

import { useState } from 'react';
import { IconGripVertical } from '@tabler/icons-react';

interface DraggableItem {
  id: string;
  label: string;
  description?: string;
}

interface ProfileStep4PriorityProps {
  regionPriority: string[];
  jobTypePriority: string[];
  subjectPriority: string[];
  availableRegions: string[];
  availableJobTypes: string[];
  availableSubjects: string[];
  onRegionPriorityChange: (priority: string[]) => void;
  onJobTypePriorityChange: (priority: string[]) => void;
  onSubjectPriorityChange: (priority: string[]) => void;
}

function DraggableList({
  items,
  onReorder,
  title,
  description
}: {
  items: DraggableItem[];
  onReorder: (newOrder: DraggableItem[]) => void;
  title: string;
  description: string;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      return;
    }

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    onReorder(newItems);
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
      <div className="flex flex-col gap-1">
        <h4 className="text-base font-bold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          선택된 항목이 없습니다. 이전 단계에서 선택해 주세요.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-move transition-all ${
                draggedIndex === index
                  ? 'border-[#7aa3cc] bg-[#f8fbff] opacity-50'
                  : 'border-gray-200 bg-white hover:border-[#7aa3cc] hover:bg-[#f8fbff]'
              }`}
            >
              <IconGripVertical size={18} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                {item.description && <div className="text-xs text-gray-400 mt-1">{item.description}</div>}
                <div className="text-xs text-gray-500 mt-1">우선순위 {index + 1}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfileStep4Priority({
  regionPriority,
  jobTypePriority,
  subjectPriority,
  availableRegions,
  availableJobTypes,
  availableSubjects,
  onRegionPriorityChange,
  onJobTypePriorityChange,
  onSubjectPriorityChange
}: ProfileStep4PriorityProps) {
  const regionItems: DraggableItem[] = regionPriority.map((region) => ({
    id: region,
    label: region
  }));

  const jobTypeDescriptions: Record<string, string> = {
    '경력을 활용한 협력수업': '정규교사와 수업시간 협력하는 미술상담 수업'
  };

  const jobTypeItems: DraggableItem[] = jobTypePriority.map((jobType) => ({
    id: jobType,
    label: jobType,
    description: jobTypeDescriptions[jobType]
  }));

  const subjectItems: DraggableItem[] = subjectPriority.map((subject) => ({
    id: subject,
    label: subject
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900">우선순위 설정</h3>
        <p className="text-sm text-gray-500">드래그로 우선순위를 정렬해 주세요. 위쪽이 더 높은 우선순위입니다.</p>
      </div>

      <DraggableList
        items={regionItems}
        onReorder={(newItems) => onRegionPriorityChange(newItems.map((item) => item.id))}
        title="지역 우선순위"
        description="선호하는 지역의 우선순위를 정렬해 주세요."
      />

      <DraggableList
        items={jobTypeItems}
        onReorder={(newItems) => onJobTypePriorityChange(newItems.map((item) => item.id))}
        title="직종 우선순위"
        description="선호하는 직종의 우선순위를 정렬해 주세요."
      />

      <DraggableList
        items={subjectItems}
        onReorder={(newItems) => onSubjectPriorityChange(newItems.map((item) => item.id))}
        title="과목 우선순위"
        description="선호하는 과목의 우선순위를 정렬해 주세요. (선택사항)"
      />
    </div>
  );
}
