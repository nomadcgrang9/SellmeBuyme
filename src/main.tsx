import React, { lazy, Suspense, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { errorReporter } from './lib/utils/errorReporter'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 동적 임포트 (코드 분할)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const App = lazy(() => import('./App'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const TeamConsolePage = lazy(() => import('./pages/TeamConsolePage'))
const DeveloperPage = lazy(() => import('./pages/DeveloperPage'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const MobileSearch = lazy(() => import('./pages/MobileSearch'))
const MobileRegister = lazy(() => import('./pages/MobileRegister'))
const MobileChat = lazy(() => import('./pages/MobileChat'))
const MobileChatRoom = lazy(() => import('./pages/MobileChatRoom'))
const NewLanding = lazy(() => import('./pages/new-landing/App'))

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 로딩 폴백 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">로딩 중...</p>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 에러 리포터 초기화 (모바일 디버깅)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
errorReporter.initialize();
errorReporter.setupGlobalHandlers();

const pathname = window.location.pathname

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PWA 동적 manifest 전환 (경로별 분리)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (pathname.startsWith('/note')) {
  // 개발자노트 PWA 설정으로 전환
  const manifestLink = document.getElementById('pwa-manifest') as HTMLLinkElement | null;
  if (manifestLink) {
    manifestLink.href = '/note/manifest.webmanifest';
  }

  // 메타 태그 업데이트
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', '#a8c5e0');

  const appTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appTitle) appTitle.setAttribute('content', '개발자노트');

  const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
  if (appleTouchIcon) appleTouchIcon.href = '/pwa-icons/apple-touch-icon.png';

  document.title = '셀바 개발자노트';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// URL 파라미터 체크 (강제 모바일/데스크톱)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const urlParams = new URLSearchParams(window.location.search);
const forceMobile = urlParams.get('mobile') === 'true';
const forceDesktop = urlParams.get('desktop') === 'true';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 라우팅 결정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 기본값: 반응형 NewLanding (모바일/데스크톱 모두 처리)
let rootComponent: React.ReactNode = <NewLanding />;

// 개발자 노트 페이지 (PWA)
if (pathname.startsWith('/note')) {
  rootComponent = <DeveloperPage />
}
// 관리자 페이지 라우팅
else if (import.meta.env.DEV && pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />
}
else if (import.meta.env.PROD && pathname.startsWith('/admin-portal')) {
  rootComponent = <AdminPage />
}
// 팀 콘솔 페이지 라우팅
else if (import.meta.env.DEV && pathname.startsWith('/team-console')) {
  rootComponent = <TeamConsolePage />
}
else if (import.meta.env.VITE_TEAM_CONSOLE_PATH && pathname === import.meta.env.VITE_TEAM_CONSOLE_PATH) {
  rootComponent = <TeamConsolePage />
}
else if (pathname.startsWith('/auth/callback')) {
  rootComponent = <AuthCallback />
}
// 모바일 검색 페이지
else if (pathname.startsWith('/search')) {
  rootComponent = <MobileSearch />
}
// 모바일 등록 페이지
else if (pathname.startsWith('/register')) {
  rootComponent = <MobileRegister />
}
// 모바일 채팅 상세 페이지 (/chat/:roomId)
else if (pathname.match(/^\/chat\/.+/)) {
  rootComponent = <MobileChatRoom />
}
// 모바일 채팅 목록 페이지 (/chat)
else if (pathname.startsWith('/chat')) {
  rootComponent = <MobileChat />
}
// 기존 App 접근 경로 (레거시)
else if (pathname.startsWith('/legacy') || pathname.startsWith('/old')) {
  rootComponent = <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback={<PageLoading />}>
      {rootComponent}
    </Suspense>
  </React.StrictMode>,
)

