import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

const App = lazy(() => import('./App.jsx'))
const Home = lazy(() => import('./components/Home.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const Privacy = lazy(() => import('./components/Privacy.jsx'))
const Terms = lazy(() => import('./components/Terms.jsx'))
const Layout = lazy(() => import('./components/Layout.jsx'))

const path = window.location.pathname
const isAdmin = path.startsWith('/system/hq/portal/admin/secure/99x/mak')

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
    
    // Prevent infinite reload loops
    if (!sessionStorage.getItem('reloaded_after_crash')) {
      sessionStorage.setItem('reloaded_after_crash', 'true');
      
      // Wipe out the broken Service Worker and force a hard reload
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
          // Force reload the page bypassing cache
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
          <button 
            onClick={() => {
              sessionStorage.removeItem('reloaded_after_crash');
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
              }
              window.location.reload();
            }}
            className="flex items-center justify-center w-12 h-12 bg-white border border-border shadow-sm text-ink rounded-full hover:bg-gray-100 transition-colors"
            title="Reload"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingFallback = () => <div className="min-h-screen flex items-center justify-center text-muted font-mono text-sm">Loading...</div>

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <BrowserRouter>
          <Layout>
            <Routes>
              {isAdmin && <Route path="/system/hq/portal/admin/secure/99x/mak/*" element={<AdminApp />} />}
              <Route path="/privacy-policy" element={<Privacy />} />
              <Route path="/terms-of-service" element={<Terms />} />
              <Route path="/:stream" element={<App />} />
              <Route path="/" element={<Home />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
)
