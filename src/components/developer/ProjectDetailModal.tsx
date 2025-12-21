// ProjectDetailModal - 프로젝트 상세 보기 모달
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Calendar, Target, CheckCircle2, Circle } from 'lucide-react';
import type { DevProject } from '@/types/developer';
import { PROJECT_STATUS_CONFIG } from '@/types/developer';

interface ProjectDetailModalProps {
  project: DevProject | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteStage?: (stageId: string) => void;
}

export function ProjectDetailModal({ project, isOpen, onClose, onCompleteStage }: ProjectDetailModalProps) {
  if (!project) return null;

  const completedStages = project.stages.filter(s => s.isCompleted).length;
  const totalStages = project.stages.length;
  const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
  const statusConfig = PROJECT_STATUS_CONFIG[project.status];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="sticky top-4 right-4 float-right z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Content */}
              <div className="p-8">
                {/* Status Badge */}
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusConfig.colorClass}`}>
                  {statusConfig.label}
                </span>

                {/* Title */}
                <h2 className="mt-4 text-2xl font-bold text-gray-900 leading-tight">
                  🚀 {project.name}
                </h2>

                {/* Metadata */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    참여: {Array.isArray(project.participants) ? project.participants.join(', ') : project.participants}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    시작: {new Date(project.startDate).toLocaleDateString('ko-KR')}
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">진행률</span>
                    <span className="text-sm font-bold text-[#7aa3cc]">
                      {progressPercent}% ({completedStages}/{totalStages} 단계 완료)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#a8c5e0] to-[#7aa3cc] h-3 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Goal */}
                <div className="mt-6">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-2">
                    <Target className="w-5 h-5" />
                    목표
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {project.goal}
                  </p>
                </div>

                {/* Stages */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    📝 구현 단계 ({completedStages}/{totalStages})
                  </h3>
                  <div className="space-y-3">
                    {project.stages.map((stage) => (
                      <div
                        key={stage.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          stage.isCompleted
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:border-[#a8c5e0]'
                        }`}
                      >
                        <button
                          onClick={() => onCompleteStage?.(stage.id)}
                          className={`mt-0.5 flex-shrink-0 transition-colors ${
                            stage.isCompleted ? 'text-green-500' : 'text-gray-300 hover:text-[#7aa3cc]'
                          }`}
                          title={stage.isCompleted ? '완료됨' : '완료로 표시'}
                        >
                          {stage.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p
                            className={`text-sm ${
                              stage.isCompleted
                                ? 'line-through text-gray-500'
                                : 'text-gray-700'
                            }`}
                          >
                            <span className="font-medium">{stage.order}.</span> {stage.description}
                          </p>
                          {stage.completedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ 완료: {new Date(stage.completedAt).toLocaleDateString('ko-KR')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
