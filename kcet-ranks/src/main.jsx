import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import './index.css'

const App = lazy(() => import('./App.jsx'))
const Home = lazy(() => import('./components/Home.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const Privacy = lazy(() => import('./components/Privacy.jsx'))
const Terms = lazy(() => import('./components/Terms.jsx'))
const Layout = lazy(() => import('./components/Layout.jsx'))
const Contact = lazy(() => import('./components/Contact.jsx'))
const ArticleContainer = lazy(() => import('./components/article/ArticleContainer.jsx'))
const ArticlesIndex = lazy(() => import('./components/article/ArticlesIndex.jsx'))
const GearAdmin = lazy(() => import('./admin/GearAdmin.jsx'))
const GearIndex = lazy(() => import('./components/gear/GearIndex.jsx'))
const GearCategory = lazy(() => import('./components/gear/GearCategory.jsx'))

const path = window.location.pathname
const isAdmin = path.startsWith('/system/hq/portal/admin/secure/99x')

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
      
      const bustCacheAndReload = () => {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('v', Date.now());
        window.location.replace(newUrl.toString());
      };

      // Wipe out the broken Service Worker and force a hard reload
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
          bustCacheAndReload();
        }).catch(() => bustCacheAndReload());
      } else {
        bustCacheAndReload();
      }
    }
  }

  componentDidMount() {
    // If the component mounts successfully, clear the crash flag after a few seconds
    // This allows future updates to trigger the auto-reload again
    setTimeout(() => {
      sessionStorage.removeItem('reloaded_after_crash');
    }, 3000);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-paper">
          <div className="max-w-sm text-center">
            <p className="text-muted mb-6 text-sm">The page needs to be refreshed to load properly.</p>
            <button 
              onClick={() => {
                sessionStorage.removeItem('reloaded_after_crash');
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
                }
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('v', Date.now());
                window.location.replace(newUrl.toString());
              }}
              className="px-5 py-2.5 bg-gray-100 text-ink text-sm font-medium border border-border rounded-lg hover:bg-gray-200 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingFallback = () => <div className="min-h-screen flex items-center justify-center text-muted font-mono text-sm">Loading...</div>

function LegacyArticleRedirect() {
  const [searchParams] = useSearchParams()
  const stream = searchParams.get('stream') || 'engineering'
  const college = searchParams.get('college')
  const branch = searchParams.get('branch')
  const category = searchParams.get('cat')
  
  if (college && branch && category) {
    return <Navigate to={`/articles/${stream}/${encodeURIComponent(college)}/${encodeURIComponent(branch)}/${encodeURIComponent(category)}`} replace />
  }
  return <Navigate to={`/articles/${stream}`} replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <BrowserRouter>
          <Layout>
            <Routes>
              {isAdmin && <Route path="/system/hq/portal/admin/secure/99x/gear/*" element={<GearAdmin />} />}
              {isAdmin && <Route path="/system/hq/portal/admin/secure/99x/*" element={<AdminApp />} />}
              <Route path="/privacy-policy" element={<Privacy />} />
              <Route path="/terms-of-service" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Gear Routes */}
              <Route path="/gear/:categorySlug" element={<Navigate to="/gear" replace />} />
              <Route path="/gear" element={<GearIndex />} />

              {/* Article Routes */}
              <Route path="/articles/:stream/:college/:branch/:category" element={<ArticleContainer />} />
              <Route path="/articles/:stream" element={<ArticleContainer />} />
              <Route path="/articles" element={<ArticlesIndex />} />
              <Route path="/article" element={<LegacyArticleRedirect />} />
              
              {/* Explorer Routes */}
              <Route path="/explorer/:stream/branch/:branchName" element={<App />} />
              <Route path="/explorer/:stream/college/:collegeName" element={<App />} />
              
              {/* Analyzer Routes */}
              <Route path="/analyzer/:stream/rank/:rankValue/:category" element={<App />} />
              
              {/* Root Stream Route */}
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
