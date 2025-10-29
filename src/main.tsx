import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPage from './pages/AdminPage'
import DeveloperPage from './pages/DeveloperPage'
import AuthCallback from './pages/AuthCallback'
import './index.css'

const pathname = window.location.pathname

let rootComponent = <App />

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 개발자 노트 페이지 (PWA)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (pathname.startsWith('/note')) {
  rootComponent = <DeveloperPage />
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 주의: 관리자 경로는 더 이상 클라이언트에서 체크하지 않음!
// Cloudflare Functions에서 모든 체크 처리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 로컬 개발 환경에서만 /admin 접근 허용
else if (import.meta.env.DEV && pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />
}
// 프로덕션: Cloudflare Functions가 처리하므로 별도 체크 불필요
// 단, AdminPage 컴포넌트는 번들에 포함되어야 함
// 랜덤 경로 패턴 매칭 (예: /diekw-mx8k2pq9-console-secure-2025)
else if (pathname.match(/^\/[a-z0-9\-]{20,}/i)) {
  rootComponent = <AdminPage />
}
else if (pathname.startsWith('/auth/callback')) {
  rootComponent = <AuthCallback />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {rootComponent}
  </React.StrictMode>,
)
