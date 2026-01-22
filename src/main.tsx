import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
// import Landing from './pages/Landing'  // 숨김 처리됨
import MobileMapPage from './pages/mobile-map'
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

// 모바일 디바이스 감지 (화면 크기 + 터치 지원)
const isMobileDevice = window.innerWidth < 768 ||
  ('ontouchstart' in window) ||
  (navigator.maxTouchPoints > 0);

// 기본값: 모바일이면 MobileMapPage, PC면 NewLanding
let rootComponent = isMobileDevice ? <MobileMapPage /> : <NewLanding />

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 개발자 노트 페이지 (PWA)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Service Worker는 vite-plugin-pwa가 자동으로 등록 (registerSW.js)
if (pathname.startsWith('/note')) {
  rootComponent = <DeveloperPage />
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 관리자 페이지 라우팅
// 로컬: /admin* 경로, 프로덕션: /admin-portal (로그인+admin 역할 필요)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 로컬 개발: /admin* 경로
else if (import.meta.env.DEV && pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />
}
// 프로덕션: /admin-portal 경로
else if (import.meta.env.PROD && pathname.startsWith('/admin-portal')) {
  rootComponent = <AdminPage />
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 팀 콘솔 페이지 라우팅 (비밀번호 인증 방식)
// 환경변수 VITE_TEAM_CONSOLE_PATH로 경로 설정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 로컬 개발: /team-console 경로
else if (import.meta.env.DEV && pathname.startsWith('/team-console')) {
  rootComponent = <TeamConsolePage />
}
// 프로덕션: 환경변수에 설정된 경로
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
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 기존 App 접근 경로 (레거시)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
