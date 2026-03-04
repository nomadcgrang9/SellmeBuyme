// Developer Page - 셀바 개발자노트
// Mobile-first design with max-width 640px
import { useState, useEffect } from 'react';
import { Lightbulb, Globe, Rocket, Home, FolderOpen, ExternalLink, Shield, Megaphone, Activity } from 'lucide-react';
import DeploymentList from '@/components/developer/DeploymentList';
import IdeaForm from '@/components/developer/IdeaForm';
import BoardSubmissionForm from '@/components/developer/BoardSubmissionForm';
import FloatingActionButton from '@/components/developer/FloatingActionButton';
// IdeaDetailModal 제거됨 - 인라인 펼침 방식으로 변경
import { ProjectDetailModal } from '@/components/developer/ProjectDetailModal';
import { CollapsibleSection } from '@/components/developer/CollapsibleSection';
import FilterButton from '@/components/developer/FilterButton';
import PaginationDots from '@/components/developer/PaginationDots';
import IdeaList from '@/components/developer/IdeaList';
import BoardSubmissionCard from '@/components/developer/BoardSubmissionCard';
import ProjectCard from '@/components/developer/ProjectCard';
import ProjectFormModal from '@/components/developer/ProjectFormModal';
import ProjectDashboard from '@/components/developer/ProjectDashboard';
import KanbanView from '@/components/developer/KanbanView';
import ErrorLogSection from '@/components/developer/ErrorLogSection';
import CrawlerHealthSection from '@/components/developer/CrawlerHealthSection';
import NoticeCard from '@/components/developer/NoticeCard';
import NoticeForm from '@/components/developer/NoticeForm';
// NoticeDetailModal 제거됨 - 인라인 펼침 방식으로 변경
import IOSInstallGuide from '@/components/developer/pwa/IOSInstallGuide';
import KakaoTalkGuide from '@/components/developer/pwa/KakaoTalkGuide';
import { useDeployments } from '@/lib/hooks/useDeployments';
import { useFilteredIdeas } from '@/lib/hooks/useFilteredIdeas';
import { useFilteredSubmissions } from '@/lib/hooks/useFilteredSubmissions';
import { useProjects } from '@/lib/hooks/useProjects';
import { useNotices } from '@/lib/hooks/useNotices';
import {
  isKakaoTalk,
  isIOS,
  isStandalone,
  isDismissed,
  setDismissed,
  markVisited,
} from '@/lib/utils/pwaUtils';
import type { DevIdea, DevProject, DevNotice, ProjectFormData, NoticeFormData } from '@/types/developer';

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
    updateIdeaItem,
    deleteIdeaItem,
    toggleIdeaTodo,
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

  const {
    notices,
    loading: noticesLoading,
    error: noticesError,
    filter: noticeFilter,
    setFilter: setNoticeFilter,
    hasMore: noticesHasMore,
    loadMore: loadMoreNotices,
    createNewNotice,
    updateNoticeItem,
    deleteNoticeItem,
    togglePinned,
  } = useNotices();

  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  // selectedIdea 제거됨 - 인라인 펼침 방식으로 변경
  const [selectedProject, setSelectedProject] = useState<DevProject | null>(null);
  // selectedNotice 제거됨 - 인라인 펼침 방식으로 변경
  const [editingProject, setEditingProject] = useState<DevProject | null>(null);
  const [editingNotice, setEditingNotice] = useState<DevNotice | null>(null);
  const [editingIdea, setEditingIdea] = useState<DevIdea | null>(null);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [sourceIdeaId, setSourceIdeaId] = useState<string | undefined>();

  // PWA 설치 관련 상태
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showKakaoGuide, setShowKakaoGuide] = useState(false);

  useEffect(() => {
    // 최초 방문 기록
    markVisited();

    // 이미 설치되었거나 다시 보지 않기 설정했으면 스킵
    if (isStandalone() || isDismissed()) {
      return;
    }

    // 카카오톡 인앱 브라우저인 경우
    if (isKakaoTalk()) {
      setShowKakaoGuide(true);
      return;
    }

    // iOS Safari인 경우 (beforeinstallprompt 미지원)
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    // Chrome/Edge 등 beforeinstallprompt 지원 브라우저
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
    }

    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissPWA = () => {
    setDismissed();
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

      {/* PWA 설치 배너 (Chrome/Edge 등) */}
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[#a8c5e0] to-[#7aa3cc] text-white shadow-lg">
          <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">앱으로 설치</p>
              <p className="text-xs opacity-90">홈 화면에 추가</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-[#7aa3cc] rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                설치
              </button>
              <button
                onClick={() => {
                  setShowInstallBanner(false);
                  handleDismissPWA();
                }}
                className="px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS 설치 가이드 모달 */}
      {showIOSGuide && (
        <IOSInstallGuide
          onClose={() => setShowIOSGuide(false)}
          onDismiss={handleDismissPWA}
        />
      )}

      {/* 카카오톡 브라우저 전환 안내 모달 */}
      {showKakaoGuide && (
        <KakaoTalkGuide
          onClose={() => setShowKakaoGuide(false)}
          onDismiss={handleDismissPWA}
        />
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

          {/* 공지사항 */}
          <CollapsibleSection
            title="공지사항"
            icon={<Megaphone className="w-5 h-5" />}
            defaultOpen={true}
            filterButton={
              <FilterButton
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'notice', label: '📢 공지' },
                  { value: 'update', label: '🔔 업데이트' },
                  { value: 'event', label: '🎉 이벤트' },
                  { value: 'important', label: '⚠️ 중요' },
                ]}
                value={noticeFilter}
                onChange={(v) => setNoticeFilter(v as any)}
              />
            }
          >
            <div className="p-4 space-y-4">
              {/* 공지사항 카드 리스트 */}
              {noticesLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : noticesError ? (
                <div className="text-center py-8 text-red-500">
                  공지사항을 불러올 수 없습니다
                </div>
              ) : notices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  공지사항이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {notices.map((notice) => (
                    <NoticeCard
                      key={notice.id}
                      notice={notice}
                      onEdit={() => {
                        setEditingNotice(notice);
                        setShowNoticeForm(true);
                      }}
                      onDelete={() => deleteNoticeItem(notice.id)}
                      onTogglePin={() => togglePinned(notice.id)}
                    />
                  ))}
                </div>
              )}

              {/* 페이지네이션 (일반 공지가 3개 초과일 때만) */}
              <PaginationDots
                hasMore={noticesHasMore}
                onLoadMore={loadMoreNotices}
                isLoading={noticesLoading}
              />
            </div>
          </CollapsibleSection>

          {/* 아이디어 목록 */}
          <CollapsibleSection
            title="아이디어 살펴보기"
            icon={<Lightbulb className="w-5 h-5" />}
            defaultOpen={false}
          >
            <div className="p-4 space-y-4">
              {/* 검색 + 필터 + 카드 리스트 통합 컴포넌트 */}
              <IdeaList
                ideas={ideas}
                loading={ideasLoading}
                error={ideasError}
                filter={ideaFilter}
                onFilterChange={setIdeaFilter}
                onEdit={(idea) => {
                  setEditingIdea(idea);
                  setShowIdeaForm(true);
                }}
                onDelete={(id) => deleteIdeaItem(id)}
                onToggleTodo={(ideaId, todoId) => toggleIdeaTodo(ideaId, todoId)}
              />

              {/* 페이지네이션 */}
              <PaginationDots
                hasMore={ideasHasMore}
                onLoadMore={loadMoreIdeas}
                isLoading={ideasLoading}
              />
            </div>
          </CollapsibleSection>

          {/* 게시판 제출 목록 - 숨김 처리 */}
          {false && <CollapsibleSection
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
          </CollapsibleSection>}

          {/* 크롤링 현황 자동점검 */}
          <CollapsibleSection
            title="크롤링 현황 자동점검"
            icon={<Activity className="w-5 h-5" />}
            defaultOpen={false}
          >
            <div className="p-4">
              <CrawlerHealthSection />
            </div>
          </CollapsibleSection>

          {/* 프로젝트 관리 - 임시 숨김 (로직/데이터 유지) */}
          {false && (
            <CollapsibleSection
              title="프로젝트 관리하기"
              icon={<Rocket className="w-5 h-5" />}
              defaultOpen={false}
            >
              <div className="p-4 space-y-4">

                {/* 프로젝트 요약 대시보드 */}
                {!projectsLoading && !projectsError && <ProjectDashboard projects={projects} />}

                {/* 칸반뷰 (기본) */}
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
                  <KanbanView
                    projects={projects}
                    onEdit={(p) => {
                      setEditingProject(p);
                      setShowProjectForm(true);
                    }}
                    onDelete={deleteProjectItem}
                    onStatusChange={async (projectId, newStatus) => {
                      const project = projects.find(p => p.id === projectId);
                      if (project) {
                        await updateProjectItem(projectId, { ...project, sourceIdeaId: project.sourceIdeaId || undefined, status: newStatus });
                      }
                    }}
                    onViewDetail={(p) => setSelectedProject(p)}
                  />
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* 공유폴더 */}
          <CollapsibleSection
            title="팀 공유폴더"
            icon={<FolderOpen className="w-5 h-5" />}
            defaultOpen={false}
          >
            <div className="p-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <FolderOpen className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      OneDrive 팀 공유 폴더
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      개발팀원끼리 파일을 자유롭게 업로드하고 공유할 수 있는 폴더입니다.
                    </p>
                    <a
                      href="https://1drv.ms/f/c/7b77903722d22f5c/IgBcL9IiN5B3IIB7zQ8BAAAAAUtiq-3c79WPvYJB3qbGk0Q?e=0AWZlr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#0078D4] text-white rounded-lg hover:bg-[#106EBE] transition-colors font-medium"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>공유폴더 열기</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* 모바일 오류기록 - 임시 숨김 (기능은 유지) */}
          {false && (
            <CollapsibleSection
              title="모바일 오류기록"
              icon={<Shield className="w-5 h-5" />}
              defaultOpen={false}
            >
              <ErrorLogSection />
            </CollapsibleSection>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        onIdeaClick={() => {
          setEditingIdea(null);
          setShowIdeaForm(true);
        }}
        onBoardClick={() => setShowBoardForm(true)}
        onProjectClick={() => {
          setEditingProject(null);
          setSourceIdeaId(undefined);
          setShowProjectForm(true);
        }}
        onNoticeClick={() => {
          setEditingNotice(null);
          setShowNoticeForm(true);
        }}
      />

      {/* 아이디어 작성/수정 폼 모달 */}
      {showIdeaForm && (
        <IdeaForm
          onClose={() => {
            setShowIdeaForm(false);
            setEditingIdea(null);
          }}
          onSubmit={async (data) => {
            if (editingIdea) {
              await updateIdeaItem(editingIdea.id, data);
            } else {
              await createNewIdea(data);
            }
          }}
          editingIdea={editingIdea}
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

      {/* 아이디어 상세 모달 제거됨 - 인라인 펼침 방식으로 변경 */}

      {/* 프로젝트 상세 모달 */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        onCompleteStage={(stageId) => {
          if (selectedProject) {
            completeStage(selectedProject.id, stageId);
            // 모달 내 프로젝트 상태 업데이트
            const updatedProject: DevProject = {
              ...selectedProject,
              stages: selectedProject.stages.map(s =>
                s.id === stageId
                  ? { ...s, isCompleted: !s.isCompleted, completedAt: !s.isCompleted ? new Date().toISOString() : null }
                  : s
              )
            };
            setSelectedProject(updatedProject);
          }
        }}
      />

      {/* 공지사항 작성/수정 폼 모달 */}
      <NoticeForm
        isOpen={showNoticeForm}
        onClose={() => {
          setShowNoticeForm(false);
          setEditingNotice(null);
        }}
        onSubmit={async (data: NoticeFormData) => {
          if (editingNotice) {
            await updateNoticeItem(editingNotice.id, data);
          } else {
            await createNewNotice(data);
          }
        }}
        editingNotice={editingNotice}
      />

      {/* 공지사항 상세 모달 제거됨 - 인라인 펼침 방식으로 변경 */}
    </div>
  );
}
