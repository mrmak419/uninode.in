import { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import SearchForm from './components/SearchForm.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import Footer from './components/Footer.jsx'
import { Menu } from 'lucide-react'
import { SidebarContext } from './components/Layout.jsx'
import TabTitle from './components/TabTitle.jsx'
import streamsData from '../public/streams.json'

const ALL_CATEGORIES = [
  '1G','1K','1R',
  '2AG','2AK','2AR','2BG','2BK','2BR',
  '3AG','3AK','3AR','3BG','3BK','3BR',
  'GM','GMK','GMR',
  'SCG','SCK','SCR',
  'STG','STK','STR',
]

// DB aliases will handle this dynamically now.

export default function App() {
  const { stream, branchName, collegeName, rankValue, category: categoryParam } = useParams()
  const formattedStreamName = stream ? stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Stream'
  const navigate = useNavigate()

  // Parse initial URL parameters for shared links
  const [searchParams, setSearchParams] = useSearchParams()

  const isAnalyzerRoute = window.location.pathname.startsWith('/analyzer/')
  const isExplorerRoute = window.location.pathname.startsWith('/explorer/')

  // Search state
  const [rank,       setRank]       = useState(rankValue || searchParams.get('rank') || '')
  const [variation,  setVariation]  = useState(parseInt(searchParams.get('variation')) || 3000)
  const [category,   setCategory]   = useState(categoryParam || searchParams.get('cat') || 'GM')
  const [seatType,   setSeatType]   = useState(searchParams.get('seat') || 'ROK')
  
  const initialBranches = branchName ? [branchName] : (searchParams.get('branches') ? searchParams.get('branches').split(',') : [])
  const [selectedBranches, setSelectedBranches] = useState(initialBranches)
  
  const initialCollege = collegeName || searchParams.get('college') || ''
  const [collegeQuery, setCollegeQuery] = useState(initialCollege)
  
  let initialMode = 'analyzer'
  if (isExplorerRoute) initialMode = 'explorer'
  else if (isAnalyzerRoute) initialMode = 'analyzer'
  else if (searchParams.get('mode')) initialMode = searchParams.get('mode')
  
  const [mode, setMode] = useState(initialMode)

  const [hasAutoSearched, setHasAutoSearched] = useState(false)
  const { toggleSidebar } = useContext(SidebarContext)

  // Data state
  const [rounds,     setRounds]     = useState([])   // [{year, round}]
  const [branches,   setBranches]   = useState([])   // unique course names
  const [colleges,   setColleges]   = useState([])   // list of all colleges
  const [results,    setResults]    = useState(null) // null = not searched yet
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const prevStreamRef = useRef(stream)
  const [fullMatrixData, setFullMatrixData] = useState(null)
  const [pendingSearch, setPendingSearch] = useState(false)
  
  // Stream metadata
  const [availableStreams, setAvailableStreams] = useState(streamsData)

  // Load stream-specific metadata (colleges, branches, rounds) instantly via CDN JSON
  useEffect(() => {
    const isStreamSwitch = prevStreamRef.current !== stream;
    prevStreamRef.current = stream;

    async function loadMeta() {
      try {
        const res = await fetch(`/meta_${stream}.json?v=1`)
        if (!res.ok) throw new Error(`Stream metadata not found for ${stream}`)
        const data = await res.json()
        
        setColleges(data.colleges || [])
        setBranches(data.branches || [])
        
        const uniqueRounds = data.rounds || []
        uniqueRounds.sort((a,b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.round - a.round;
        })
        setRounds(uniqueRounds)
        
        // Clear previous results on stream switch
        if (isStreamSwitch) {
          setResults(null)
          setSelectedBranches([])
          setCollegeQuery('')
          setFullMatrixData(null)
        }

        // Also fetch the full matrix data in chunks for client-side search
        let matrixData = [];
        if (data.numChunks && data.numChunks > 0) {
          const fetchPromises = [];
          for (let i = 0; i < data.numChunks; i++) {
            fetchPromises.push(
              fetch(`/data_${stream}_${i}.json?v=${data.lastUpdated || ''}`)
                .then(r => r.ok ? r.json() : [])
            );
          }
          const chunkResults = await Promise.all(fetchPromises);
          matrixData = chunkResults.flat();
        } else {
          // Fallback just in case some streams don't have chunks yet
          const dataRes = await fetch(`/data_${stream}.json?v=${data.lastUpdated || ''}`);
          if (dataRes.ok) {
            matrixData = await dataRes.json();
          }
        }
        setFullMatrixData(matrixData);
      } catch (err) {
        console.error("Failed to load stream metadata/data:", err)
      }
    }
    loadMeta()
  }, [stream])

  const search = useCallback(async () => {
    let rankNum;
    if (mode === 'analyzer') {
      rankNum = parseInt(rank, 10)
      if (!rank || isNaN(rankNum) || rankNum < 1) {
        setError('Please enter a valid rank.')
        return
      }
    } else {
      if (!collegeQuery && selectedBranches.length === 0) {
        setError('Please select at least one college or branch to explore cutoffs.')
        return
      }
    }

    if (!category) {
      setError('Please select a category.')
      return
    }

    setError(null)
    setLoading(true)
    setResults(null)

    try {
      if (!fullMatrixData) {
        setError('Data is downloading, please wait...')
        setPendingSearch(true)
        setLoading(false)
        return
      }

      // ── Smart Branch Matching ──
      let filteredData = fullMatrixData.filter(row => row.category === category && row.seat_type === seatType)

      if (mode === 'analyzer') {
        const safeVariation = Math.min(50000, Math.max(0, variation))
        const lo = Math.max(1, rankNum - safeVariation)
        const hi = rankNum + safeVariation
        filteredData = filteredData.filter(row => row.max_rank >= lo && row.min_rank <= hi)
      }

      // ── Filter by College Name or Code ──
      const cQuery = collegeQuery.trim().toLowerCase()
      if (cQuery) {
        const matchedCodes = colleges.filter(c => {
          return c.college_name.toLowerCase().includes(cQuery) || 
                 c.college_code.toLowerCase().includes(cQuery) || 
                 (c.search_terms && c.search_terms.toLowerCase().includes(cQuery))
        }).map(c => c.college_code)

        if (matchedCodes.length === 0) {
          setResults([])
          setLoading(false)
          return
        }
        filteredData = filteredData.filter(row => matchedCodes.includes(row.college_code))
      }

      // ── Filter by Multiple Branches ──
      if (selectedBranches.length > 0) {
        const branchNames = selectedBranches.map(b => b.toLowerCase())
        
        // Find all raw_names where the parent_branch name matches ANY of the selected branches
        const matchingRawNames = branches.filter(b => {
          const pName = b.parent_branches?.name?.toLowerCase()
          const pAlias = b.parent_branches?.alias?.toLowerCase()
          return branchNames.includes(pName) || branchNames.includes(pAlias)
        }).map(b => b.raw_name)

        if (matchingRawNames.length === 0) {
          setResults([])
          setLoading(false)
          
          if (window.gtag) {
            window.gtag('event', 'search', {
              mode: mode,
              rank_entered: mode === 'analyzer' ? rankNum : 'N/A',
              variation: mode === 'analyzer' ? variation : 'N/A',
              category: category,
              seat_type: seatType,
              college_query: collegeQuery.trim() || 'N/A',
              search_term: selectedBranches.join(','),
              results_count: 0
            })
          }
          return
        }

        // Only query the matching raw branches
        filteredData = filteredData.filter(row => matchingRawNames.includes(row.course_name))
      }

      setResults(filteredData || [])

      // Scroll to results to skip inputs if user came from a link
      setTimeout(() => {
        const el = document.getElementById('results-container');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      // Update URL with current search parameters so it's easily shareable
      const params = new URLSearchParams()
      if (mode === 'analyzer') params.set('variation', variation)
      params.set('seat', seatType)
      if (collegeQuery && mode === 'analyzer') params.set('college', collegeQuery)
      if (selectedBranches.length > 0 && mode === 'analyzer') params.set('branches', selectedBranches.join(','))
      if (mode === 'explorer' && collegeQuery && selectedBranches.length > 0) {
        params.set('college', collegeQuery) // if both are selected, we put one in query param
      }
      
      let newPath = `/${stream}`
      if (mode === 'analyzer' && rankNum) {
        newPath = `/analyzer/${stream}/rank/${rankNum}/${encodeURIComponent(category)}`
      } else if (mode === 'explorer') {
        if (selectedBranches.length > 0) {
          newPath = `/explorer/${stream}/branch/${encodeURIComponent(selectedBranches[0])}`
          params.set('cat', category)
        } else if (collegeQuery) {
          newPath = `/explorer/${stream}/college/${encodeURIComponent(collegeQuery)}`
          params.set('cat', category)
        }
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : ''
      navigate(`${newPath}${queryString}`, { replace: true })

      // Send event to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'search', {
          mode: mode,
          rank_entered: mode === 'analyzer' ? rankNum : 'N/A',
          variation: mode === 'analyzer' ? variation : 'N/A',
          category: category,
          seat_type: seatType,
          college_query: collegeQuery.trim() || 'N/A',
          search_term: selectedBranches.length > 0 ? selectedBranches.join(',') : 'All Branches',
          results_count: filteredData ? filteredData.length : 0
        })
      }

    } catch (e) {
      console.error("Search failed:", e)
      setError('Search failed. Please ensure the selected stream and filters are valid.')
    } finally {
      setLoading(false)
    }
  }, [mode, rank, variation, category, seatType, selectedBranches, collegeQuery, branches, colleges, stream, fullMatrixData])

  // Auto-trigger search if URL params are present (shared link)
  useEffect(() => {
    // Only auto-search once all metadata has successfully loaded
    if (branches.length > 0 && colleges.length > 0 && rounds.length > 0 && fullMatrixData && !hasAutoSearched) {
      const searchParams = new URLSearchParams(window.location.search)
      if (isAnalyzerRoute || isExplorerRoute || searchParams.has('cat') || searchParams.has('rank') || searchParams.has('college') || searchParams.has('branches')) {
        setHasAutoSearched(true)
        search()
      } else {
        setHasAutoSearched(true) // No params, so just mark as done
      }
    }
  }, [branches, colleges, rounds, fullMatrixData, hasAutoSearched, search, isAnalyzerRoute, isExplorerRoute])

  // Auto-trigger pending search when matrix data finishes downloading
  useEffect(() => {
    if (pendingSearch && fullMatrixData) {
      setPendingSearch(false)
      search()
    }
  }, [pendingSearch, fullMatrixData, search])

  const handleClear = useCallback(() => {
    setRank('')
    setVariation(3000)
    setCategory('GM')
    setSeatType('ROK')
    setSelectedBranches([])
    setCollegeQuery('')
    setResults(null)
    setError(null)
    setSearchParams({}, { replace: true })
  }, [])

  // Group results by college + course for the pivot table
  const groupedResults = useMemo(() => {
    return results ? groupByCourseCollege(results, rounds) : null
  }, [results, rounds])

  // Dynamic years for subtitle
  const uniqueYears = Array.from(new Set(rounds.map(r => r.year))).sort((a,b) => a-b)
  let yearsText = '2024 & 2025' // fallback
  if (uniqueYears.length > 0) {
    if (uniqueYears.length === 1) yearsText = String(uniqueYears[0])
    else if (uniqueYears.length === 2) yearsText = `${uniqueYears[0]} & ${uniqueYears[1]}`
    else yearsText = `${uniqueYears.slice(0, -1).join(', ')} & ${uniqueYears[uniqueYears.length - 1]}`
  }

  let pageTitle = `${formattedStreamName} Cutoffs | Uninode KCET Cutoff Analyzer`
  let pageDescription = `Analyze historical KCET cutoff trends for ${formattedStreamName}. Discover eligible colleges for your rank with the Uninode KCET Cutoff Analyzer.`

  if (mode === 'analyzer' && rank && category) {
    pageTitle = `Rank ${rank} ${category} - ${formattedStreamName} | Uninode`
    pageDescription = `Discover eligible ${formattedStreamName} colleges for rank ${rank} in ${category} category using the Uninode KCET Cutoff Analyzer.`
  } else if (collegeQuery || selectedBranches.length > 0) {
    let prefixParts = [];
    if (collegeQuery) {
      prefixParts.push(collegeQuery.trim());
    }
    if (selectedBranches.length === 1) {
      prefixParts.push(selectedBranches[0]);
    } else if (selectedBranches.length > 1) {
      prefixParts.push(`${selectedBranches.length} Branches`);
    }

    const prefix = prefixParts.join(' - ');
    pageTitle = `${prefix} KCET Cutoffs | ${formattedStreamName}`
    pageDescription = `Check the latest KCET cutoff ranks for ${prefix} in ${formattedStreamName}. Compare historical cutoff trends and find your perfect college match.`
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <TabTitle 
        title={pageTitle} 
        description={pageDescription}
      />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col">
        {/* Top Header Row for Branding */}
        <div className="flex items-center gap-2 text-left mb-6">
            <button 
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-muted hover:text-ink rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="font-display font-bold text-xl tracking-tight text-ink flex items-center">
              Uninode<span className="text-blue-600 ml-1">KCET</span>
            </Link>
        </div>

        {/* Page Title & Toggle Container */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="sr-only">
              {stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} KCET Cutoffs & Rank Analyzer
            </h1>
            <h2 className="text-3xl font-display font-bold text-ink mb-1 flex items-center gap-3">
              {stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <p className="text-muted font-body text-sm">
              Historical cut-off analysis ({yearsText})
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-border/50 p-1 rounded-full w-full md:w-auto shrink-0 border border-border/80">
            <button 
              onClick={() => {
                setMode('analyzer')
                if (window.gtag) window.gtag('event', 'mode_switch', { new_mode: 'analyzer' })
              }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${mode === 'analyzer' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
            >
              Analyzer
            </button>
            <button 
              onClick={() => {
                setMode('explorer')
                if (window.gtag) window.gtag('event', 'mode_switch', { new_mode: 'explorer' })
              }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${mode === 'explorer' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
            >
              Explorer
            </button>
          </div>
        </div>
        <SearchForm
          mode={mode}
          rank={rank}           setRank={setRank}
          variation={variation} setVariation={setVariation}
          category={category}   setCategory={setCategory}
          seatType={seatType}   setSeatType={setSeatType}
          selectedBranches={selectedBranches} setSelectedBranches={setSelectedBranches}
          collegeQuery={collegeQuery} setCollegeQuery={setCollegeQuery}
          branches={branches}
          colleges={colleges}
          allCategories={ALL_CATEGORIES}
          onSearch={search}
          onClear={handleClear}
          loading={loading}
        />

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-miss text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        <div id="results-container" className="mt-8 scroll-mt-6">
          {loading && (
            <div className="text-center py-16 text-muted font-body text-sm">
              Searching across {rounds.length} rounds…
            </div>
          )}

          {!loading && results === null && (
            <div className="text-center py-16">
              <p className="text-muted font-body text-sm">
                Enter your rank and category above to find eligible colleges.
              </p>
            </div>
          )}

          {!loading && results !== null && groupedResults.length === 0 && (
            <div className="text-center py-16">
              <p className="text-ink font-body font-medium">No results found</p>
              <p className="mt-1 text-muted font-body text-sm">
                {mode === 'analyzer' 
                  ? 'Try increasing your ± variation or changing the branch filter.' 
                  : 'Try changing the college or branch filter.'}
              </p>
            </div>
          )}

          {!loading && groupedResults && groupedResults.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-muted text-sm font-body">
                  <span className="font-semibold text-ink">{groupedResults.length}</span>
                  {' '}college–course combinations found
                </p>
                {mode === 'analyzer' && <Legend rank={parseInt(rank, 10)} />}
              </div>
              <ResultsTable
                rows={groupedResults}
                rounds={rounds}
                userRank={mode === 'analyzer' ? parseInt(rank, 10) : null}
              />
            </>
          )}
        </div>
        <Footer />
      </main>
    </div>
  )
}

function groupByCourseCollege(rows, availableRounds) {
  const map = new Map()

  for (const row of rows) {
    // Normalize course name: lowercase, remove all spaces and special characters
    const normalizedCourse = (row.course_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const key = row.college_code + '||' + normalizedCourse

    if (!map.has(key)) {
      map.set(key, {
        college_code: row.college_code,
        college_name: row.college_name || row.college_code,
        course_name:  row.course_name, // Keep the first original name for display
        rounds: { ...(row.rounds || {}) },
      })
    } else {
      // Merge rounds if the course is already in the map (handles variations like "Computer Sci ence")
      const existing = map.get(key)
      existing.rounds = { ...existing.rounds, ...(row.rounds || {}) }
    }
  }

  // Sort by best (lowest) rank in the most recent round
  const mostRecentKey = availableRounds.length
    ? availableRounds[0].year + '_R' + availableRounds[0].round
    : null

  return Array.from(map.values()).sort((a, b) => {
    const ra = mostRecentKey ? (a.rounds[mostRecentKey] ?? Infinity) : Infinity
    const rb = mostRecentKey ? (b.rounds[mostRecentKey] ?? Infinity) : Infinity
    return ra - rb
  })
}

function Legend({ rank }) {
  return (
    <div className="flex items-center gap-3 text-xs font-body text-muted">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
        Likely in range
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300" />
        Borderline
      </span>
    </div>
  )
}