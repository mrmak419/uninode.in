import { useState, useEffect, useContext } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Laptop, Building2, Pill, Activity, Wheat, Stethoscope, FlaskConical, Sprout, PersonStanding, Search, Menu } from 'lucide-react'
import LegalFooter from './LegalFooter'
import { SidebarContext } from './Layout'

import TabTitle from './TabTitle'
import streamsData from '../../public/streams.json'

const STREAM_INFO = {
  engineering: { title: 'Engineering', desc: 'B.E. / B.Tech cutoffs across all branches.', icon: Laptop, color: 'from-blue-500 to-indigo-600' },
  architecture: { title: 'Architecture', desc: 'B.Arch cutoffs and NATA rankings.', icon: Building2, color: 'from-emerald-500 to-teal-600' },
  b_pharma: { title: 'B.Pharma', desc: 'Bachelor of Pharmacy historical data.', icon: Pill, color: 'from-purple-500 to-fuchsia-600' },
  bpt: { title: 'BPT', desc: 'Bachelor of Physiotherapy rankings.', icon: Activity, color: 'from-rose-500 to-red-600' },
  food_science: { title: 'Food Science', desc: 'B.Sc Food Science & Technology.', icon: Wheat, color: 'from-amber-500 to-orange-600' },
  nursing: { title: 'Nursing', desc: 'B.Sc Nursing cutoffs.', icon: Stethoscope, color: 'from-cyan-500 to-blue-600' },
  pharma_d: { title: 'Pharma.D', desc: 'Doctor of Pharmacy 6-year program.', icon: FlaskConical, color: 'from-violet-500 to-purple-600' },
  agri_bsc: { title: 'Agri B.Sc', desc: 'B.Sc Agriculture cutoffs.', icon: Sprout, color: 'from-green-500 to-emerald-600' },
  bpo: { title: 'BPO', desc: 'Bachelor in Prosthetics and Orthotics.', icon: PersonStanding, color: 'from-slate-600 to-gray-800' }
}

export default function Home() {
  const [streams, setStreams] = useState(streamsData)
  const [searchQuery, setSearchQuery] = useState('')
  const { toggleSidebar } = useContext(SidebarContext)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Redirect legacy links (e.g. /?rank=10000) to /engineering
  useEffect(() => {
    if (searchParams.has('rank') || searchParams.has('category') || searchParams.has('college') || searchParams.has('course')) {
      navigate(`/engineering?${searchParams.toString()}`, { replace: true })
    }
  }, [searchParams, navigate])

  // Eagerly prefetch engineering metadata and chunks into the browser cache
  useEffect(() => {
    // Run after a short delay so it doesn't block the initial render thread
    const timer = setTimeout(() => {
      fetch('/meta_engineering.json')
        .then(res => res.json())
        .then(data => {
          if (data.numChunks) {
            for (let i = 0; i < data.numChunks; i++) {
              fetch(`/data_engineering_${i}.json`);
            }
          }
        })
        .catch(err => console.log('Prefetch failed:', err));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <TabTitle 
        title="Uninode KCET Cutoff Analyzer" 
        description="Analyze historical KCET cutoff trends and predict college eligibility across Engineering, Medical, Architecture, and more with the Uninode KCET Cutoff Analyzer."
      />
      {/* Compact Hero Section */}
      <div className="bg-white border-b border-border py-4 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-left">
            <button 
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-muted hover:text-ink rounded-xl hover:bg-gray-50 transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="font-display font-bold text-xl tracking-tight text-ink flex items-center">
              Uninode<span className="text-blue-600 ml-1">KCET</span>
            </Link>
          </div>
          
          {/* Search Bar */}
          <div className="flex-1 md:w-80 md:flex-none relative max-w-md">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search streams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent text-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {streams.filter(s => {
            const streamId = typeof s === 'string' ? s : s.id;
            const info = STREAM_INFO[streamId] || { title: streamId };
            return info.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   streamId.toLowerCase().includes(searchQuery.toLowerCase());
          }).map(streamObj => {
            const streamKey = typeof streamObj === 'string' ? streamObj : streamObj.id;
            const yearSummary = streamObj.yearSummary || [];
            const info = STREAM_INFO[streamKey] || {
              title: streamKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              desc: 'Explore cutoffs for ' + streamKey.replace(/_/g, ' '),
              icon: Building2,
              color: 'from-gray-600 to-gray-800'
            }

            const IconComponent = info.icon;

            return (
              <Link 
                key={streamKey} 
                to={`/${streamKey}`}
                className="group relative bg-white p-5 rounded-2xl shadow-sm border border-border hover:shadow-md hover:border-transparent transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* Hover Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${info.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className="relative z-10 flex items-start justify-between mb-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 border border-border text-ink group-hover:scale-110 transition-transform duration-300 shadow-sm shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all duration-300 text-gray-400 group-hover:text-ink shrink-0">
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <div className="relative z-10 flex-1 flex flex-col">
                  <h2 className="text-xl font-bold text-ink mb-1 font-display leading-tight">{info.title}</h2>
                  <p className="text-muted text-xs font-body line-clamp-2 mb-4">{info.desc}</p>
                  
                  {/* Available Data */}
                  {yearSummary.length > 0 && (
                    <div className="mt-auto pt-4 border-t border-border/50">
                      <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Available Data</span>
                      <div className="flex flex-col gap-1.5">
                        {yearSummary.map(ys => (
                          <div key={ys.year} className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-ink text-[10px] font-bold border border-border/50">{ys.year}</span>
                            <span className="text-[11px] text-muted font-medium">Rounds {ys.rounds.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <LegalFooter />
    </div>
  )
}
