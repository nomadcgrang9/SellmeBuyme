import { useEffect, useState } from 'react';
import { IconMenu2, IconLock } from '@tabler/icons-react';
import CrawlBoardStatus from '@/components/admin/CrawlBoardStatus';
import PromoTabManager from '@/components/admin/PromoTabManager';
import DashboardOverview from '@/components/admin/dashboard/DashboardOverview';
import AdminUserManagement from '@/components/admin/AdminUserManagement';
import ContentManagement from '@/components/admin/ContentManagement';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { useAuthStore } from '@/stores/authStore';

// 비밀번호 폴백 인증 (Supabase Auth 실패 시 사용)
const TEAM_PASSWORD = import.meta.env.VITE_TEAM_CONSOLE_PASSWORD || '';
const STORAGE_KEY = 'sellba_team_verified';

interface AdminTab {
  key: string;
  label: string;
  description?: string;
  badge?: string;
}

const ADMIN_TABS: AdminTab[] = [
  { key: 'overview', label: '대시보드', description: '요약 지표' },
  { key: 'crawl', label: '크롤링 게시판 관리', description: '크롤링 게시판 현황 조회' },
  { key: 'promo', label: '배너 관리', description: '히어로·접속·카드 배너 관리' },
  { key: 'users', label: '사용자 관리', description: '가입 사용자 목록 및 프로필 조회' },
  { key: 'content', label: '콘텐츠 관리', description: '공고 / 인력 검수' },
  { key: 'settings', label: '설정', description: '권한 및 시스템 설정' }
];

export default function AdminPageWithHamburger() {
  const { isAdmin, isLoading, user } = useAdminAuth();
  const { initialize } = useAuthStore();

  // 비밀번호 폴백 인증 상태
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // 저장된 비밀번호 인증 상태 복원
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === 'verified') {
      setPasswordVerified(true);
    }
  }, []);

  // 인증 여부: Supabase admin OR 비밀번호 인증
  const isAuthorized = (user && isAdmin) || passwordVerified;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === TEAM_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, 'verified');
      setPasswordVerified(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
    setIsSidebarOpen(false);
  };


  // 로딩 중 (비밀번호 인증이면 스킵)
  if (isLoading && !passwordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // 인증 안 됨 → 비밀번호 입력 폼 표시
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <IconLock size={32} className="text-primary" stroke={1.5} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">관리 콘솔</h1>
              <p className="text-slate-500 mt-2 text-sm">비밀번호를 입력하세요</p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="비밀번호"
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors outline-none ${
                      passwordError
                        ? 'border-red-300 bg-red-50 focus:border-red-500'
                        : 'border-slate-200 focus:border-primary'
                    }`}
                    autoFocus
                  />
                  {passwordError && (
                    <p className="mt-2 text-sm text-red-600">비밀번호가 틀렸습니다.</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  입장
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />;
      case 'crawl':
        return <CrawlBoardStatus refreshToken={refreshToken} />;
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
              <h1 className="text-xl font-bold text-slate-900">셀미바이미 관리 콘솔</h1>
              <p className="text-xs text-slate-500">운영 관리 센터</p>
            </div>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            관리자
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

          {/* 인증 해제 */}
          <div className="border-t border-slate-200 p-4">
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setPasswordVerified(false);
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

    </div>
  );
}