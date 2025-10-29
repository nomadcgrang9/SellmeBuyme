// Developer Page - 셀바 개발자노트
// Mobile-first design with max-width 640px
import { useState } from 'react';
import DeploymentList from '@/components/developer/DeploymentList';
import IdeaList from '@/components/developer/IdeaList';
import IdeaForm from '@/components/developer/IdeaForm';
import BoardSubmissionList from '@/components/developer/BoardSubmissionList';
import BoardSubmissionForm from '@/components/developer/BoardSubmissionForm';
import FloatingActionButton from '@/components/developer/FloatingActionButton';
import { IdeaDetailModal } from '@/components/developer/IdeaDetailModal';
import { Pagination } from '@/components/developer/Pagination';
import { CollapsibleSection } from '@/components/developer/CollapsibleSection';
import { useDeployments } from '@/lib/hooks/useDeployments';
import { useIdeas } from '@/lib/hooks/useIdeas';
import { useBoardSubmissions } from '@/lib/hooks/useBoardSubmissions';
import type { DevIdea } from '@/types/developer';

export default function DeveloperPage() {
  const { deployments, loading: deploymentsLoading, error: deploymentsError } = useDeployments(2);
  const {
    ideas,
    loading: ideasLoading,
    error: ideasError,
    currentPage,
    totalPages,
    setPage,
    createNewIdea,
  } = useIdeas(10);
  const { submissions, loading: submissionsLoading, error: submissionsError, createNewSubmission } = useBoardSubmissions(20);
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<DevIdea | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Sticky */}
      <header className="sticky top-0 z-10 bg-[#a8c5e0] shadow-sm">
        <div className="max-w-screen-sm mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            셀바 개발자노트
          </h1>
        </div>
      </header>

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
            title="아이디어 목록"
            count={ideas.length}
            defaultOpen={false}
          >
            <div className="p-4">
              <IdeaList
                ideas={ideas}
                loading={ideasLoading}
                error={ideasError}
                onIdeaClick={setSelectedIdea}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </CollapsibleSection>

          {/* 게시판 제출 목록 */}
          <CollapsibleSection
            title="게시판 등록 제출"
            count={submissions.length}
            defaultOpen={false}
          >
            <div className="p-4">
              <BoardSubmissionList
                submissions={submissions}
                loading={submissionsLoading}
                error={submissionsError}
              />
            </div>
          </CollapsibleSection>
        </div>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        onIdeaClick={() => setShowIdeaForm(true)}
        onBoardClick={() => setShowBoardForm(true)}
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

      {/* 아이디어 상세 모달 */}
      <IdeaDetailModal
        idea={selectedIdea}
        isOpen={!!selectedIdea}
        onClose={() => setSelectedIdea(null)}
      />
    </div>
  );
}
