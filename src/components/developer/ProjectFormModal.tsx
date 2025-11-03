// ProjectFormModal - 프로젝트 생성/수정 모달
import { X, Loader2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { DevProject, ProjectFormData, ProjectStatus } from '@/types/developer';
import { PROJECT_STATUS_CONFIG } from '@/types/developer';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  sourceIdeaId?: string;
  initialProject?: DevProject;
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  sourceIdeaId,
  initialProject,
}: ProjectFormModalProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [participants, setParticipants] = useState<string[]>(['']);
  const [stages, setStages] = useState([{ description: '' }]);
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // initialProject가 변경될 때마다 폼 상태 업데이트
  useEffect(() => {
    if (initialProject) {
      // 수정 모드: 기존 프로젝트 데이터로 폼 채우기
      setName(initialProject.name);
      setGoal(initialProject.goal);
      setParticipants(
        typeof initialProject.participants === 'number'
          ? ['']
          : initialProject.participants.length > 0
            ? initialProject.participants
            : ['']
      );
      setStages(
        initialProject.stages.length > 0
          ? initialProject.stages.map(s => ({ description: s.description }))
          : [{ description: '' }]
      );
      setStatus(initialProject.status);
    } else {
      // 생성 모드: 폼 초기화
      setName('');
      setGoal('');
      setParticipants(['']);
      setStages([{ description: '' }]);
      setStatus('active');
    }
    setError(null);
  }, [initialProject, isOpen]);

  if (!isOpen) return null;

  const handleAddStage = () => {
    setStages([...stages, { description: '' }]);
  };

  const handleRemoveStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  const handleStageChange = (index: number, description: string) => {
    const newStages = [...stages];
    newStages[index].description = description;
    setStages(newStages);
  };

  const handleAddParticipant = () => {
    setParticipants([...participants, '']);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (index: number, name: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = name;
    setParticipants(newParticipants);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!name.trim()) {
      setError('프로젝트명을 입력해주세요');
      return;
    }
    if (!goal.trim()) {
      setError('구현 목표를 입력해주세요');
      return;
    }
    if (participants.length === 0 || participants.some(p => !p.trim())) {
      setError('모든 참여원의 이름을 입력해주세요');
      return;
    }
    if (stages.length === 0 || stages.some(s => !s.description.trim())) {
      setError('모든 단계에 설명을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        goal: goal.trim(),
        participants: participants.filter(p => p.trim()),
        stages: stages.map(s => ({ description: s.description.trim() })),
        status,
        sourceIdeaId,
      });
      onClose();
    } catch (err) {
      console.error('Failed to submit project:', err);
      setError(
        err instanceof Error ? err.message : '프로젝트 저장에 실패했습니다'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative w-full max-w-screen-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialProject ? '프로젝트 수정' : '프로젝트 생성'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 프로젝트명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로젝트명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름을 입력하세요"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100"
              required
            />
          </div>

          {/* 구현 목표 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              구현 목표 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="프로젝트의 목표를 설명해주세요"
              rows={3}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent resize-none disabled:bg-gray-100"
              required
            />
          </div>

          {/* 참여원 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              참여원 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {participants.map((participant, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={participant}
                    onChange={(e) => handleParticipantChange(index, e.target.value)}
                    placeholder={`참여원 ${index + 1}`}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100"
                  />
                  {participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(index)}
                      disabled={isSubmitting}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddParticipant}
              disabled={isSubmitting}
              className="mt-2 text-sm text-[#7aa3cc] hover:text-[#5a8ab0] font-medium disabled:opacity-50"
            >
              + 참여원 추가
            </button>
          </div>

          {/* 구현 단계 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              구현 단계 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={stage.description}
                    onChange={(e) => handleStageChange(index, e.target.value)}
                    placeholder={`단계 ${index + 1}`}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                  {stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(index)}
                      disabled={isSubmitting}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddStage}
              disabled={isSubmitting}
              className="mt-2 text-sm text-[#7aa3cc] hover:text-[#5a8ab0] font-medium disabled:opacity-50"
            >
              + 단계 추가
            </button>
          </div>

          {/* 진행 상태 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              진행 상태 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['active', 'paused', 'completed', 'difficult'] as ProjectStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    disabled={isSubmitting}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      status === st
                        ? 'border-[#a8c5e0] bg-[#d4e4f0]'
                        : 'border-gray-200 hover:border-gray-300'
                    } disabled:opacity-50`}
                  >
                    {PROJECT_STATUS_CONFIG[st].label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#a8c5e0] hover:bg-[#7aa3cc] text-gray-900 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                initialProject ? '수정 완료' : '프로젝트 생성'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
