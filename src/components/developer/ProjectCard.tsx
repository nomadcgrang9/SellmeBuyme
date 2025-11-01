// ProjectCard - 프로젝트 카드 컴포넌트
import { Trash2, Edit2, ChevronDown } from 'lucide-react';
import { CommentSection } from './comments/CommentSection';
import { linkifyText } from '@/lib/utils/linkify.tsx';
import { useState } from 'react';
import type { DevProject } from '@/types/developer';
import { PROJECT_STATUS_CONFIG } from '@/types/developer';

interface ProjectCardProps {
  project: DevProject;
  onEdit: (project: DevProject) => void;
  onDelete: (id: string) => void;
  onCompleteStage: (stageId: string) => void;
}

export default function ProjectCard({
  project,
  onEdit,
  onDelete,
  onCompleteStage,
}: ProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const completedStages = project.stages.filter(s => s.isCompleted).length;
  const totalStages = project.stages.length;
  const progressPercent = Math.round((completedStages / totalStages) * 100);

  const handleDelete = async () => {
    if (!isDeleting && confirm('정말 삭제하시겠습니까?')) {
      setIsDeleting(true);
      try {
        await onDelete(project.id);
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('프로젝트 삭제에 실패했습니다');
        setIsDeleting(false);
      }
    }
  };

  const statusConfig = PROJECT_STATUS_CONFIG[project.status];
  const createdDate = new Date(project.startDate).toLocaleDateString('ko-KR');

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* 카드 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-base mb-1">
              🚀 {project.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.colorClass}`}>
                {statusConfig.label}
              </span>
              <span>참여원: {Array.isArray(project.participants) ? project.participants.join(', ') : project.participants}명</span>
              <span>시작: {createdDate}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(project)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="수정"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">
            진행률: {progressPercent}% ({completedStages}/{totalStages} 단계 완료)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#a8c5e0] h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 목표 */}
      <div className="px-4 py-3 border-t border-gray-100">
        <p className="text-sm text-gray-700 line-clamp-2 break-words">
          {linkifyText(project.goal)}
        </p>
      </div>

      {/* 확장/축소 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-100 transition-colors"
      >
        <span>{isExpanded ? '축소' : '상세보기'}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 상세 내용 (확장 시) */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="space-y-3">
            {/* 단계 목록 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">📝 구현 단계</h4>
              <div className="space-y-2">
                {project.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-start gap-3 p-2 bg-white rounded border border-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={stage.isCompleted}
                      onChange={() => onCompleteStage(stage.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#a8c5e0] focus:ring-[#a8c5e0]"
                    />
                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          stage.isCompleted
                            ? 'line-through text-gray-500'
                            : 'text-gray-700'
                        }`}
                      >
                        {stage.order}. {stage.description}
                      </p>
                      {stage.completedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          완료: {new Date(stage.completedAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <CommentSection targetType="project" targetId={project.id} />
      </div>
    </div>
  );
}
