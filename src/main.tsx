import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPage from './pages/AdminPage'
import './index.css'

const pathname = window.location.pathname

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {pathname.startsWith('/admin') ? <AdminPage /> : <App />}
  </React.StrictMode>,
)
