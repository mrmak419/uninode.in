import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const App = lazy(() => import('./App.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const Privacy = lazy(() => import('./components/Privacy.jsx'))
const Terms = lazy(() => import('./components/Terms.jsx'))

const path = window.location.pathname
const isAdmin = path.startsWith('/system/hq/portal/admin/secure/99x/mak')
const isPrivacy = path === '/privacy-policy' || path === '/privacy-policy/'
const isTerms = path === '/terms-of-service' || path === '/terms-of-service/'

const LoadingFallback = () => <div className="min-h-screen flex items-center justify-center text-muted font-mono text-sm">Loading...</div>

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<LoadingFallback />}>
      {isAdmin ? <AdminApp /> : 
       isPrivacy ? <Privacy /> : 
       isTerms ? <Terms /> : 
       <App />}
    </Suspense>
  </React.StrictMode>
)
