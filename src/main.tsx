import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPage from './pages/AdminPage'
import DeveloperPage from './pages/DeveloperPage'
import AuthCallback from './pages/AuthCallback'
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
// 로컬: /admin* 경로, 프로덕션: /admin-portal 또는 랜덤 경로
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 로컬 개발: /admin* 경로
else if (import.meta.env.DEV && pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />
}
// 프로덕션: /admin-portal 경로
else if (import.meta.env.PROD && pathname.startsWith('/admin-portal')) {
  rootComponent = <AdminPage />
}
// 랜덤 경로 패턴 매칭 (예: /diekw-mx8k2pq9-console-secure-2025)
else if (pathname.match(/^\/[a-z0-9\-]{20,}/i)) {
  rootComponent = <AdminPage />
}
else if (pathname.startsWith('/auth/callback')) {
  rootComponent = <AuthCallback />
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
