// Developer Page - 셀바 개발자노트
// Mobile-first design with max-width 640px
import { useState, useEffect } from 'react';
import { Lightbulb, Globe, Rocket, Home } from 'lucide-react';
import DeploymentList from '@/components/developer/DeploymentList';
import IdeaForm from '@/components/developer/IdeaForm';
import BoardSubmissionForm from '@/components/developer/BoardSubmissionForm';
import FloatingActionButton from '@/components/developer/FloatingActionButton';
import { IdeaDetailModal } from '@/components/developer/IdeaDetailModal';
import { CollapsibleSection } from '@/components/developer/CollapsibleSection';
import FilterButton from '@/components/developer/FilterButton';
import PaginationDots from '@/components/developer/PaginationDots';
import IdeaCard from '@/components/developer/IdeaCard';
import BoardSubmissionCard from '@/components/developer/BoardSubmissionCard';
import ProjectCard from '@/components/developer/ProjectCard';
import ProjectFormModal from '@/components/developer/ProjectFormModal';
import { useDeployments } from '@/lib/hooks/useDeployments';
import { useFilteredIdeas } from '@/lib/hooks/useFilteredIdeas';
import { useFilteredSubmissions } from '@/lib/hooks/useFilteredSubmissions';
import { useProjects } from '@/lib/hooks/useProjects';
import type { DevIdea, DevProject, ProjectFormData } from '@/types/developer';

// PWA 설치 프롬프트 인터페이스
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function DeveloperPage() {
  const { deployments, loading: deploymentsLoading, error: deploymentsError } = useDeployments(1);
  const {
    ideas,
    loading: ideasLoading,
    error: ideasError,
    filter: ideaFilter,
    setFilter: setIdeaFilter,
    hasMore: ideasHasMore,
    loadMore: loadMoreIdeas,
    createNewIdea,
    deleteIdeaItem,
  } = useFilteredIdeas();
  const {
    submissions,
    loading: submissionsLoading,
    error: submissionsError,
    filter: submissionFilter,
    setFilter: setSubmissionFilter,
    hasMore: submissionsHasMore,
    loadMore: loadMoreSubmissions,
    createNewSubmission,
    deleteSubmissionItem,
  } = useFilteredSubmissions();
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    filter: projectFilter,
    setFilter: setProjectFilter,
    hasMore: projectsHasMore,
    loadMore: loadMoreProjects,
    createNewProject,
    updateProjectItem,
    deleteProjectItem,
    completeStage,
  } = useProjects();

  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<DevIdea | null>(null);
  const [editingProject, setEditingProject] = useState<DevProject | null>(null);
  const [sourceIdeaId, setSourceIdeaId] = useState<string | undefined>();

  // PWA 설치 관련 상태
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // PWA 설치 프롬프트 이벤트 캡처
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 이미 설치되었는지 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('✅ 사용자가 PWA 설치를 수락했습니다');
    } else {
      console.log('❌ 사용자가 PWA 설치를 거부했습니다');
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Sticky */}
      <header className="sticky top-0 z-10 bg-[#a8c5e0] shadow-sm">
        <div className="max-w-screen-sm mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            셀바 개발자노트
          </h1>
          <button
            onClick={() => window.location.href = '/'}
            className="p-2 text-gray-700 hover:bg-white/30 rounded-lg transition-colors"
            title="홈으로"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PWA 설치 배너 */}
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#a8c5e0] to-[#7aa3cc] text-white shadow-lg">
          <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">📱 앱으로 설치하기</p>
              <p className="text-xs opacity-90">홈 화면에 추가하여 빠르게 접속하세요</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-[#7aa3cc] rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                설치
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <main className="max-w-screen-sm mx-auto p-4 pb-24">
        <div className="space-y-6">
          {/* GitHub 배포 추적 */}
          <DeploymentList
            deployments={deployments}
            loading={deploymentsLoading}
            error={deploymentsError}
          />

          {/* 아이디어 목록 */}
          <CollapsibleSection 
            title="아이디어 살펴보기"
            icon={<Lightbulb className="w-5 h-5" />}
            defaultOpen={false}
            filterButton={
              <FilterButton
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'feature', label: '💡 새기능' },
                  { value: 'bug', label: '🐛 버그' },
                  { value: 'design', label: '🎨 디자인' },
                  { value: 'other', label: '📌 기타' },
                ]}
                value={ideaFilter}
                onChange={(v) => setIdeaFilter(v as any)}
              />
            }
          >
            <div className="p-4 space-y-4">

              {/* 아이디어 카드 리스트 */}
              {ideasLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : ideasError ? (
                <div className="text-center py-8 text-red-500">
                  아이디어를 불러올 수 없습니다
                </div>
              ) : ideas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  아이디어가 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {ideas.map((idea) => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onSendToProject={() => {
                        setSourceIdeaId(idea.id);
                        setShowProjectForm(true);
                      }}
                      onDelete={() => deleteIdeaItem(idea.id)}
                    />
                  ))}
                </div>
              )}

              {/* 페이지네이션 */}
              <PaginationDots
                hasMore={ideasHasMore}
                onLoadMore={loadMoreIdeas}
                isLoading={ideasLoading}
              />
            </div>
          </CollapsibleSection>

          {/* 게시판 제출 목록 */}
          <CollapsibleSection 
            title="공고게시판 등록하기"
            icon={<Globe className="w-5 h-5" />}
            defaultOpen={false}
            filterButton={
              <FilterButton
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'pending', label: '⏳ 대기중' },
                  { value: 'approved', label: '✅ 승인됨' },
                ]}
                value={submissionFilter}
                onChange={(v) => setSubmissionFilter(v as any)}
              />
            }
          >
            <div className="p-4 space-y-4">

              {/* 게시판 제출 카드 리스트 */}
              {submissionsLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : submissionsError ? (
                <div className="text-center py-8 text-red-500">
                  게시판 제출을 불러올 수 없습니다
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  제출된 게시판이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <BoardSubmissionCard
                      key={submission.id}
                      submission={submission}
                      onDelete={() => deleteSubmissionItem(submission.id)}
                    />
                  ))}
                </div>
              )}

              {/* 페이지네이션 */}
              <PaginationDots
                hasMore={submissionsHasMore}
                onLoadMore={loadMoreSubmissions}
                isLoading={submissionsLoading}
              />
            </div>
          </CollapsibleSection>

          {/* 프로젝트 관리 */}
          <CollapsibleSection 
            title="프로젝트 관리하기"
            icon={<Rocket className="w-5 h-5" />}
            defaultOpen={false}
            filterButton={
              <FilterButton
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'active', label: '🟢 진행중' },
                  { value: 'paused', label: '🟡 보류' },
                  { value: 'completed', label: '✅ 완료' },
                  { value: 'difficult', label: '🔴 어려움' },
                ]}
                value={projectFilter}
                onChange={(v) => setProjectFilter(v as any)}
              />
            }
          >
            <div className="p-4 space-y-4">

              {/* 프로젝트 카드 리스트 */}
              {projectsLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : projectsError ? (
                <div className="text-center py-8 text-red-500">
                  프로젝트를 불러올 수 없습니다
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  프로젝트가 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={(p) => {
                        setEditingProject(p);
                        setShowProjectForm(true);
                      }}
                      onDelete={() => deleteProjectItem(project.id)}
                      onCompleteStage={(stageId) => completeStage(project.id, stageId)}
                    />
                  ))}
                </div>
              )}

              {/* 페이지네이션 */}
              <PaginationDots
                hasMore={projectsHasMore}
                onLoadMore={loadMoreProjects}
                isLoading={projectsLoading}
              />
            </div>
          </CollapsibleSection>
        </div>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        onIdeaClick={() => setShowIdeaForm(true)}
        onBoardClick={() => setShowBoardForm(true)}
        onProjectClick={() => {
          setEditingProject(null);
          setSourceIdeaId(undefined);
          setShowProjectForm(true);
        }}
      />

      {/* 아이디어 작성 폼 모달 */}
      {showIdeaForm && (
        <IdeaForm
          onClose={() => setShowIdeaForm(false)}
          onSubmit={createNewIdea}
        />
      )}

      {/* 게시판 제출 폼 모달 */}
      {showBoardForm && (
        <BoardSubmissionForm
          onClose={() => setShowBoardForm(false)}
          onSubmit={createNewSubmission}
        />
      )}

      {/* 프로젝트 생성/수정 모달 */}
      <ProjectFormModal
        isOpen={showProjectForm}
        onClose={() => {
          setShowProjectForm(false);
          setEditingProject(null);
          setSourceIdeaId(undefined);
        }}
        onSubmit={async (data: ProjectFormData) => {
          if (editingProject) {
            await updateProjectItem(editingProject.id, data);
          } else {
            await createNewProject(data);
          }
        }}
        sourceIdeaId={sourceIdeaId}
        initialProject={editingProject || undefined}
      />

      {/* 아이디어 상세 모달 */}
      <IdeaDetailModal
        idea={selectedIdea}
        isOpen={!!selectedIdea}
        onClose={() => setSelectedIdea(null)}
      />
    </div>
  );
}
