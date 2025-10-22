import { Fragment, useEffect, useState } from 'react';
import CrawlBoardList from '@/components/admin/CrawlBoardList';
import CrawlBoardForm from '@/components/admin/CrawlBoardForm';
import CrawlLogViewer from '@/components/admin/CrawlLogViewer';
import PromoCardManager from '@/components/admin/PromoCardManager';
import type { CrawlBoard, CreateCrawlBoardInput } from '@/types';
import { createCrawlBoard, updateCrawlBoard } from '@/lib/supabase/queries';

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
  { key: 'crawl', label: '크롤링 관리', description: '게시판 등록 및 상태 모니터링', badge: 'NEW' },
  { key: 'promo', label: '홍보카드 관리', description: '추천 섹션 프로모·띠지 배너 편집' },
  { key: 'content', label: '콘텐츠 관리', description: '공고 / 인력 검수' },
  { key: 'settings', label: '설정', description: '권한 및 시스템 설정' }
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<string>('crawl');
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [editingBoard, setEditingBoard] = useState<CrawlBoard | undefined>();
  const [logsBoard, setLogsBoard] = useState<CrawlBoard | undefined>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'crawl':
        return (
          <Fragment>
            {notice && (
              <div
                className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                  notice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {notice.message}
              </div>
            )}

            <CrawlBoardList
              onCreate={handleCreateClick}
              onEdit={handleEdit}
              onLogs={handleLogs}
              refreshToken={refreshToken}
            />
          </Fragment>
        );
      case 'promo':
        return <PromoCardManager />;
      default:
        return (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            <p className="font-medium text-gray-700">선택한 메뉴는 준비 중입니다.</p>
            <p className="mt-2 text-xs text-gray-400">향후 관리자 기능이 추가될 예정입니다.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">셀미바이미 관리자</h1>
            <p className="text-sm text-slate-500">운영을 위한 전용 관리 센터입니다.</p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            관리자 전용
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-6">
        <aside className="w-64 shrink-0">
          <nav className="space-y-1">
            {ADMIN_TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full flex-col rounded-lg border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-transparent bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5'
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
        </aside>

        <main className="flex-1">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {ADMIN_TABS.find((tab) => tab.key === activeTab)?.label}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {ADMIN_TABS.find((tab) => tab.key === activeTab)?.description ?? '관리 기능'}
              </p>
            </div>

            {renderTabContent()}
          </div>
        </main>
      </div>

      {showBoardForm && (
        <CrawlBoardForm
          initialValue={editingBoard}
          onClose={handleModalClose}
          onSubmit={handleSubmit}
        />
      )}

      <CrawlLogViewer board={logsBoard} open={Boolean(logsBoard)} onClose={handleCloseLogs} />

      {submitting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="rounded-md bg-white px-4 py-2 text-sm text-gray-600 shadow">저장 중...</div>
        </div>
      )}
    </div>
  );
}
