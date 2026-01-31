import { Fragment, useEffect, useState } from 'react';
import { IconMenu2, IconLock } from '@tabler/icons-react';
import CrawlBoardList from '@/components/admin/CrawlBoardList';
import CrawlBoardForm from '@/components/admin/CrawlBoardForm';
import CrawlLogViewer from '@/components/admin/CrawlLogViewer';
import CrawlBoardStatus from '@/components/admin/CrawlBoardStatus';
import PromoTabManager from '@/components/admin/PromoTabManager';
import BoardSubmissionList from '@/components/admin/BoardSubmissionList';
import BoardApprovalModal from '@/components/admin/BoardApprovalModal';
import DashboardOverview from '@/components/admin/dashboard/DashboardOverview';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import ContentManagement from '@/components/admin/ContentManagement';
import { CollapsibleSection } from '@/components/developer/CollapsibleSection';
import type { CrawlBoard, CreateCrawlBoardInput } from '@/types';
import { createCrawlBoard, updateCrawlBoard } from '@/lib/supabase/queries';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 팀 콘솔 비밀번호 (환경변수에서 로드)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TEAM_PASSWORD = import.meta.env.VITE_TEAM_CONSOLE_PASSWORD || '';
const STORAGE_KEY = 'sellba_team_verified';

interface Notice {
  type: 'success' | 'error';
  message: string;
}

interface AdminTab {
  key: string;
  label: string;
  description?: string;
  badge?: string;
}

const ADMIN_TABS: AdminTab[] = [
  { key: 'overview', label: '대시보드', description: '요약 지표' },
  // 크롤링 게시판 관리는 개발자노트로 이동됨
  // { key: 'crawl', label: '크롤링 게시판 관리', description: '개발자 제출 승인 및 게시판 관리', badge: 'NEW' },
  { key: 'promo', label: '홍보카드 관리', description: '추천 섹션 프로모·띠지 배너 편집' },
  { key: 'users', label: '사용자 관리', description: '가입 사용자 목록 및 프로필 조회' },
  { key: 'content', label: '콘텐츠 관리', description: '공고 / 인력 검수' },
  { key: 'settings', label: '설정', description: '권한 및 시스템 설정' }
];

export default function TeamConsolePage() {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 비밀번호 인증 상태
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [isVerified, setIsVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 관리자 페이지 상태
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [editingBoard, setEditingBoard] = useState<CrawlBoard | undefined>();
  const [logsBoard, setLogsBoard] = useState<CrawlBoard | undefined>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [approvalSubmissionId, setApprovalSubmissionId] = useState<string | null>(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 저장된 인증 상태 확인
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'verified') {
      setIsVerified(true);
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 비밀번호 검증
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordInput === TEAM_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'verified');
      setIsVerified(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 관리자 기능 핸들러
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleCreateClick = () => {
    setEditingBoard(undefined);
    setShowBoardForm(true);
  };

  const handleEdit = (board: CrawlBoard) => {
    setEditingBoard(board);
    setShowBoardForm(true);
  };

  const handleLogs = (board: CrawlBoard) => {
    setLogsBoard(board);
  };

  const handleCloseLogs = () => {
    setLogsBoard(undefined);
  };

  const handleModalClose = () => {
    setShowBoardForm(false);
    setEditingBoard(undefined);
  };

  const handleSubmit = async (payload: CreateCrawlBoardInput, id?: string) => {
    setSubmitting(true);
    try {
      if (id) {
        await updateCrawlBoard(id, payload);
        setNotice({ type: 'success', message: '게시판 설정이 업데이트되었습니다.' });
      } else {
        await createCrawlBoard(payload);
        setNotice({ type: 'success', message: '새 게시판이 등록되었습니다.' });
      }
      setRefreshToken((token) => token + 1);
    } catch (error) {
      console.error(error);
      setNotice({ type: 'error', message: '게시판 정보를 저장하지 못했습니다.' });
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
    setIsSidebarOpen(false);
  };

  const handleApprovalSuccess = () => {
    setApprovalSubmissionId(null);
    setRefreshToken((token) => token + 1);
    setNotice({ type: 'success', message: '게시판이 승인되어 크롤링 목록에 추가되었습니다.' });
  };

  const handleApprovalCancel = () => {
    setApprovalSubmissionId(null);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 비밀번호 입력 화면
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* 헤더 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <IconLock size={32} className="text-primary" stroke={1.5} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 font-esamanru">
                팀 콘솔
              </h1>
              <p className="text-slate-500 mt-2 text-sm">
                셀미바이미 개발팀 전용 관리 페이지입니다
              </p>
            </div>

            {/* 비밀번호 폼 */}
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    비밀번호
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="비밀번호를 입력하세요"
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none ${passwordError
                        ? 'border-red-300 bg-red-50 focus:border-red-500'
                        : 'border-slate-200 focus:border-primary'
                      }`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-600">
                      비밀번호가 틀렸습니다. 다시 시도해주세요.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  입장하기
                </button>
              </div>
            </form>

            {/* 푸터 */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                문의: 프로젝트 관리자에게 연락하세요
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 탭 콘텐츠 렌더링
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />;
      case 'crawl':
        return (
          <Fragment>
            {notice && (
              <div
                className={`mb-4 rounded-md border px-4 py-3 text-sm ${notice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                  }`}
              >
                {notice.message}
              </div>
            )}

            <div className="space-y-4">
              {/* 크롤링 게시판 현황 */}
              <CollapsibleSection
                title="크롤링 게시판 현황"
                defaultOpen={true}
              >
                <div className="p-4">
                  <CrawlBoardStatus refreshToken={refreshToken} />
                </div>
              </CollapsibleSection>

              {/* 승인대기 크롤링 게시판 */}
              <CollapsibleSection
                title="승인대기 크롤링 게시판"
                defaultOpen={false}
              >
                <div className="p-4">
                  <BoardSubmissionList
                    onApprove={(submissionId) => {
                      console.log('[TeamConsole] Approving submission ID:', submissionId);
                      setApprovalSubmissionId(submissionId);
                    }}
                    refreshToken={refreshToken}
                  />
                </div>
              </CollapsibleSection>

              {/* 승인된 크롤링 게시판 */}
              <CollapsibleSection
                title="승인된 크롤링 게시판"
                defaultOpen={false}
              >
                <div className="p-4">
                  <CrawlBoardList
                    onCreate={handleCreateClick}
                    onEdit={handleEdit}
                    onLogs={handleLogs}
                    refreshToken={refreshToken}
                    filterApproved={true}
                  />
                </div>
              </CollapsibleSection>
            </div>
          </Fragment>
        );
      case 'promo':
        return <PromoTabManager />;
      case 'users':
        return <AdminUserManagement />;
      case 'content':
        return <ContentManagement />;
      default:
        return (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            <p className="font-medium text-slate-700">선택한 메뉴는 준비 중입니다.</p>
            <p className="mt-2 text-xs text-slate-400">향후 관리자 기능이 추가될 예정입니다.</p>
          </div>
        );
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 관리자 페이지 UI (AdminPage와 동일)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="min-h-screen bg-slate-100">
      {/* 헤더 */}
      <header className="fixed left-0 right-0 top-0 z-[60] border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {/* 햄버거 메뉴 버튼 */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            >
              <IconMenu2 size={24} stroke={1.5} />
            </button>

            <div>
              <h1 className="text-xl font-bold text-slate-900">셀미바이미 팀 콘솔</h1>
              <p className="text-xs text-slate-500">개발팀 전용 관리 페이지</p>
            </div>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
            팀 전용
          </span>
        </div>
      </header>

      {/* 오버레이 */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed left-0 top-[73px] z-50 h-[calc(100vh-73px)] w-64 transform border-r border-slate-200 bg-white transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="relative flex h-full flex-col">
          {/* 네비게이션 */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4 pt-6">
            {ADMIN_TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  className={`flex w-full flex-col rounded-lg border px-4 py-3 text-left transition ${isActive
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {tab.label}
                    {tab.badge && (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {tab.badge}
                      </span>
                    )}
                  </span>
                  {tab.description && (
                    <span className={`mt-1 text-xs ${isActive ? 'text-primary/80' : 'text-slate-400'}`}>
                      {tab.description}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* 로그아웃 (인증 해제) */}
          <div className="border-t border-slate-200 p-4">
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setIsVerified(false);
              }}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              인증 해제
            </button>
          </div>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="mt-[73px] p-4">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {ADMIN_TABS.find((tab) => tab.key === activeTab)?.label}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {ADMIN_TABS.find((tab) => tab.key === activeTab)?.description ?? '관리 기능'}
              </p>
            </div>

            {renderTabContent()}
          </div>
        </div>
      </main>

      {showBoardForm && (
        <CrawlBoardForm
          initialValue={editingBoard}
          onClose={handleModalClose}
          onSubmit={handleSubmit}
        />
      )}

      <CrawlLogViewer board={logsBoard} open={Boolean(logsBoard)} onClose={handleCloseLogs} />

      {approvalSubmissionId && (
        <BoardApprovalModal
          submissionId={approvalSubmissionId}
          onSuccess={handleApprovalSuccess}
          onCancel={handleApprovalCancel}
        />
      )}

      {submitting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="rounded-md bg-white px-4 py-2 text-sm text-gray-600 shadow">저장 중...</div>
        </div>
      )}
    </div>
  );
}
