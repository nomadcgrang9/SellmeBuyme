import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPage from './pages/AdminPage'
import AuthCallback from './pages/AuthCallback'
import './index.css'

const pathname = window.location.pathname

let rootComponent = <App />

if (pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />
} else if (pathname.startsWith('/auth/callback')) {
  rootComponent = <AuthCallback />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {rootComponent}
  </React.StrictMode>,
)
