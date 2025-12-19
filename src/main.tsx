import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPage from './pages/AdminPage'
import TeamConsolePage from './pages/TeamConsolePage'
import DeveloperPage from './pages/DeveloperPage'
import AuthCallback from './pages/AuthCallback'
import MobileSearch from './pages/MobileSearch'
import MobileRegister from './pages/MobileRegister'
import MobileChat from './pages/MobileChat'
import MobileChatRoom from './pages/MobileChatRoom'
import './index.css'
import Landing from './pages/Landing'
import { errorReporter } from './lib/utils/errorReporter'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 에러 리포터 초기화 (모바일 디버깅)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
errorReporter.initialize();
errorReporter.setupGlobalHandlers();

const pathname = window.location.pathname

let rootComponent = <App />

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
// 프로덕션: 환경변수에 설정된 경로 (예: /sellba-x7k9m2-team-console-2025)
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
// 데모/시연용 랜딩 페이지
else if (pathname.startsWith('/landing')) {
  rootComponent = <Landing />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {rootComponent}
  </React.StrictMode>,
)
