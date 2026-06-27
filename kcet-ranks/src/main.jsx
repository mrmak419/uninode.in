import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useParams } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import examsData from './exams.json'
import { getArticleUrl } from './lib/url'

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
const NotFound = lazy(() => import('./components/NotFound.jsx'))
const OptionGenerator = lazy(() => import('./components/OptionGenerator.jsx'))

const path = window.location.pathname
const isAdmin = path.startsWith('/system/hq/portal/admin/secure/99x')

// ─── PWA Background Updater ──────────────────────────────────────────────────
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false

  // Listen for the controllerchange event to reload the page when a new Service Worker takes over
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true

    // Apply safety threshold: prevent continuous reloading loop by enforcing a 10s cooldown
    const lastReload = sessionStorage.getItem('sw_reload_time')
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('sw_reload_time', now.toString())
      window.location.reload()
    }
  })

  registerSW({
    onRegistered(r) {
      if (!r) return

      // Check for updates every 60 seconds
      setInterval(async () => {
        if (r.installing) return
        if ('connection' in navigator && !navigator.onLine) return
        await r.update()
      }, 60 * 1000)

      // Also check when tab comes back into focus
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
          if (r.installing || ('connection' in navigator && !navigator.onLine)) return
          await r.update()
        }
      })
    }
  })
}
// ─────────────────────────────────────────────────────────────────────────────

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

function KcetRedirect() {
  const location = window.location;
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  if (pathParts.length >= 2) {
    const feature = pathParts[0]; // "analyzer", "explorer", "articles", "option-entry"
    const stream = pathParts[1];
    const rest = pathParts.slice(2).join('/');
    
    let newPath = '';
    
    if (feature === 'analyzer' || feature === 'explorer') {
      // /analyzer/engineering/... -> /kcet/engineering/analyzer/...
      newPath = `/kcet/${stream}/${feature}${rest ? '/' + rest : ''}`;
    } else if (feature === 'articles') {
      const restParts = pathParts.slice(2);
      if (restParts.length === 3) {
        newPath = `/kcet/articles/${stream}/${restParts[0]}/${restParts[1]}/`;
        const params = new URLSearchParams(location.search);
        params.set('c', restParts[2]);
        const qs = params.toString();
        return <Navigate to={`${newPath}${qs ? '?' + qs : ''}${location.hash}`} replace />;
      }
      newPath = `/kcet/articles/${stream}${rest ? '/' + rest + '/' : '/'}`;
    } else if (feature === 'option-entry') {
      newPath = `/kcet/option-entry/${stream}${rest ? '/' + rest : ''}`;
    } else {
      newPath = `/kcet${location.pathname}`;
    }
    
    return <Navigate to={`${newPath}${location.search}${location.hash}`} replace />;
  }
  
  const newPath = `/kcet${location.pathname}${location.search}${location.hash}`;
  return <Navigate to={newPath} replace />;
}

function LegacyArticleRedirect() {
  const [searchParams] = useSearchParams()
  const stream = searchParams.get('stream') || 'engineering'
  const college = searchParams.get('college')
  const branch = searchParams.get('branch')
  const category = searchParams.get('cat')
  
  if (college && branch && category) {
    return <Navigate to={getArticleUrl('kcet', stream, college, branch, category)} replace />
  }
  return <Navigate to={`/kcet/articles/${stream}/`} replace />
}

// Validates that /:stream matches a known stream from streams.json
// Shows 404 for unknown paths like /sfjofh instead of rendering "Sfjofh Cutoffs"
const VALID_STREAMS = new Set();
examsData.forEach(e => e.streams.forEach(s => VALID_STREAMS.add(s.id)));
const VALID_EXAMS = new Set(examsData.map(e => e.id));

function ValidatedStreamRoute() {
  const { exam, stream } = useParams();
  
  if (!VALID_STREAMS.has(stream)) {
    return <NotFound />;
  }

  // If the route doesn't have an :exam param, it might be the legacy /:stream route
  // Or it might be a hardcoded route like /kcet/:stream where useParams() won't have `exam`.
  // We can check window.location.pathname
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const currentExam = pathParts.length > 0 ? pathParts[0] : null;

  if (!currentExam || !VALID_EXAMS.has(currentExam)) {
    // If it's a legacy route like /engineering, redirect to /kcet/engineering
    return <Navigate to={`/kcet/${stream}`} replace />;
  }

  return <App />;
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
              <Route path="/:exam/articles/:stream/:college/:branch" element={<ArticleContainer />} />
              <Route path="/:exam/articles/:stream" element={<ArticleContainer />} />
              <Route path="/:exam/articles" element={<ArticlesIndex />} />
              <Route path="/articles/*" element={<KcetRedirect />} />
              <Route path="/article" element={<LegacyArticleRedirect />} />
              
              {/* Explorer Routes */}
              <Route path="/:exam/:stream/explorer/branch/:branchName" element={<App />} />
              <Route path="/:exam/:stream/explorer/college/:collegeName" element={<App />} />
              <Route path="/explorer/*" element={<KcetRedirect />} />
              
              {/* Analyzer Routes */}
              <Route path="/:exam/:stream/analyzer/rank/:rankValue/:category" element={<App />} />
              <Route path="/:exam/:stream/analyzer/rank/:rankValue" element={<App />} />
              <Route path="/analyzer/*" element={<KcetRedirect />} />
              
              {/* Option Entry Generator Routes */}
              <Route path="/:exam/option-entry/:stream/:category/rank/:rank" element={<OptionGenerator />} />
              <Route path="/:exam/option-entry/:stream" element={<OptionGenerator />} />
              <Route path="/:exam/option-entry" element={<OptionGenerator />} />
              <Route path="/option-entry/*" element={<KcetRedirect />} />
              
              {/* Exam Routes */}
              <Route path="/kcet/:stream" element={<ValidatedStreamRoute />} />
              <Route path="/comedk/:stream" element={<ValidatedStreamRoute />} />
              <Route path="/dcet/:stream" element={<ValidatedStreamRoute />} />
              
              {/* Legacy Stream Redirect */}
              <Route path="/:stream" element={<ValidatedStreamRoute />} />
              
              <Route path="/kcet" element={<Home />} />
              <Route path="/comedk" element={<Home />} />
              <Route path="/dcet" element={<Home />} />
              <Route path="/" element={<Home />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </Suspense>

    </ErrorBoundary>
  </React.StrictMode>
)