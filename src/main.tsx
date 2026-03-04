import React, { lazy, Suspense, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { errorReporter } from './lib/utils/errorReporter'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 동적 임포트 (코드 분할)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const App = lazy(() => import('./App'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const DeveloperPage = lazy(() => import('./pages/DeveloperPage'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const MobileSearch = lazy(() => import('./pages/MobileSearch'))
const MobileRegister = lazy(() => import('./pages/MobileRegister'))
const MobileWagle = lazy(() => import('./pages/MobileWagle'))
const MobileWagleThread = lazy(() => import('./pages/MobileWagleThread'))
const MobileChatRoom = lazy(() => import('./pages/MobileChatRoom'))
const NewLanding = lazy(() => import('./pages/new-landing/App'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const EarlyAccessQR = lazy(() => import('./pages/EarlyAccessQR'))

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
// 관리자 콘솔 라우팅 (일원화)
else if (import.meta.env.DEV && pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />
}
else if (import.meta.env.DEV && pathname.startsWith('/team-console')) {
  rootComponent = <AdminPage />
}
else if (import.meta.env.VITE_TEAM_CONSOLE_PATH && pathname === import.meta.env.VITE_TEAM_CONSOLE_PATH) {
  rootComponent = <AdminPage />
}
else if (import.meta.env.PROD && pathname.startsWith('/admin-portal')) {
  rootComponent = <AdminPage />
}
else if (pathname === '/terms') {
  rootComponent = <TermsPage />
}
else if (pathname === '/privacy') {
  rootComponent = <PrivacyPage />
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
// 와글와글 쓰레드 상세 (/wagle/:threadId)
else if (pathname.match(/^\/wagle\/.+/)) {
  rootComponent = <MobileWagleThread />
}
// 와글와글 피드 목록 (/wagle)
else if (pathname.startsWith('/wagle')) {
  rootComponent = <MobileWagle />
}
// 모바일 채팅방 (/chat/:roomId)
else if (pathname.match(/^\/chat\/.+/)) {
  rootComponent = <MobileChatRoom />
}
// Early Access QR 홍보 페이지 (섭외자용)
else if (pathname === '/earlyteacher2026/qr') {
  rootComponent = <EarlyAccessQR />
}
// /earlyteacher2026 → / 리다이렉트 (기존 QR코드 호환)
else if (pathname === '/earlyteacher2026') {
  window.location.replace('/');
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

