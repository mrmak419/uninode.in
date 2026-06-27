import { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import SearchForm from './components/SearchForm.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import Footer from './components/Footer.jsx'
import { Menu } from 'lucide-react'
import { SidebarContext } from './components/Layout.jsx'
import TabTitle from './components/TabTitle.jsx'

import { slugify } from './lib/url'

const moduleCache = {
  meta: {},
  matrix: {}
};

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
  const { exam = 'kcet', stream = 'engineering', branchName, collegeName, rankValue, category: categoryParam } = useParams()
  const examPrefix = (exam || 'kcet').toLowerCase()
  const formattedStreamName = stream ? stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Stream'
  const navigate = useNavigate()

  // Parse initial URL parameters for shared links
  const [searchParams, setSearchParams] = useSearchParams()

  const isAnalyzerRoute = window.location.pathname.includes('/analyzer/')
  const isExplorerRoute = window.location.pathname.includes('/explorer/')

  // Search state
  const [rank,       setRank]       = useState(rankValue || searchParams.get('rank') || '')
  const [variation,  setVariation]  = useState(searchParams.has('variation') ? (searchParams.get('variation') === '' ? '' : parseInt(searchParams.get('variation'))) : '')
  const [category,   setCategory]   = useState((categoryParam || searchParams.get('cat') || 'GM').toUpperCase())
  const [seatType,   setSeatType]   = useState(searchParams.get('seat') || 'ROK')
  
  const [selectedBranches, setSelectedBranches] = useState([])
  
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
  


  // Load stream-specific metadata (colleges, branches, rounds) instantly via CDN JSON
  useEffect(() => {
    const isStreamSwitch = prevStreamRef.current !== stream;
    prevStreamRef.current = stream;

    // Clear previous results on stream switch synchronously
    if (isStreamSwitch) {
      setResults(null)
      setSelectedBranches([])
      setCollegeQuery('')
      setFullMatrixData(null)
      setHasAutoSearched(false)
    }

    async function loadMeta() {
      try {
        const cacheKey = `${exam}_${stream}`;
        if (moduleCache.meta[cacheKey] && moduleCache.matrix[cacheKey]) {
          const data = moduleCache.meta[cacheKey];
          setColleges(data.colleges);
          setBranches(data.branches);
          setRounds(data.rounds);
          setFullMatrixData(moduleCache.matrix[cacheKey]);
          return;
        }

        const res = await fetch(`/meta_${exam}_${stream}.json?v=${__BUILD_HASH__}`)
        if (!res.ok) throw new Error(`Stream metadata not found for ${exam}_${stream}`)
        const data = await res.json()
        
        const uniqueRounds = data.rounds || []
        uniqueRounds.sort((a,b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.round - a.round;
        })

        moduleCache.meta[cacheKey] = {
          colleges: data.colleges || [],
          branches: data.branches || [],
          rounds: uniqueRounds,
          lastUpdated: data.lastUpdated || __BUILD_HASH__
        };

        setColleges(moduleCache.meta[cacheKey].colleges)
        setBranches(moduleCache.meta[cacheKey].branches)
        setRounds(moduleCache.meta[cacheKey].rounds)
      } catch (err) {
        console.error("Failed to load stream metadata/data:", err)
      }
    }
    loadMeta()
  }, [stream])

  const urlCategory = (categoryParam || searchParams.get('cat') || category || 'GM').toUpperCase();
  const urlSeatType = (searchParams.get('seat') || seatType || 'ROK').toUpperCase();

  useEffect(() => {
    let active = true;
    async function loadMatrix() {
      // Clear data to show loading state if they click search before it arrives
      setFullMatrixData(null)
      try {
        const cacheKey = `${exam}_${stream}_${urlCategory}_${urlSeatType}`
        if (moduleCache.matrix[cacheKey]) {
          if (active) setFullMatrixData(moduleCache.matrix[cacheKey])
          return
        }
        
        const cacheBuster = moduleCache.meta[`${exam}_${stream}`]?.lastUpdated || __BUILD_HASH__
        const res = await fetch(`/data_${exam}_${stream}_${urlCategory}_${urlSeatType}.json?v=${cacheBuster}`)
        
        if (res.ok) {
           const matrixData = await res.json()
           moduleCache.matrix[cacheKey] = matrixData
           if (active) setFullMatrixData(matrixData)
        } else {
           if (active) setFullMatrixData([]) // No data for this combination
        }
      } catch (err) {
        console.error(err)
        if (active) setFullMatrixData([])
      }
    }
    loadMatrix()
    return () => { active = false }
  }, [exam, stream, urlCategory, urlSeatType])

  // Resolve college code parameter to college name for the input field
  useEffect(() => {
    if (colleges.length > 0) {
      const queryCollege = collegeName || searchParams.get('college');
      if (queryCollege) {
        const matched = colleges.find(c => c.college_code.toLowerCase() === queryCollege.toLowerCase());
        if (matched) {
          setCollegeQuery(matched.college_name);
        } else {
          const matchedByName = colleges.find(c => c.college_name.toLowerCase() === queryCollege.toLowerCase());
          if (matchedByName) {
            setCollegeQuery(matchedByName.college_name);
          } else {
            setCollegeQuery(queryCollege);
          }
        }
      }
    }
  }, [colleges, collegeName, searchParams]);

  // Resolve branch slug or URL param to actual raw branch name
  useEffect(() => {
    if (branches.length > 0) {
      if (branchName) {
        const matched = branches.find(b => slugify(b.raw_name) === slugify(branchName));
        if (matched) {
          setSelectedBranches([matched.raw_name]);
        }
      } else {
        const queryBranches = searchParams.get('branches');
        if (queryBranches) {
          const resolved = [];
          const queryList = queryBranches.split(',');
          for (const qItem of queryList) {
            const matched = branches.find(b => slugify(b.raw_name) === slugify(qItem));
            if (matched && !resolved.includes(matched.raw_name)) {
              resolved.push(matched.raw_name);
            }
          }
          if (resolved.length > 0) {
            setSelectedBranches(resolved);
          }
        }
      }
    }
  }, [branches, branchName, searchParams]);

  const search = useCallback(async () => {
    let currentMode = mode;
    const useUrlParams = !hasAutoSearched;
    const urlRank = useUrlParams ? (rankValue || searchParams.get('rank') || rank) : rank;
    const urlCategory = (useUrlParams ? (categoryParam || searchParams.get('cat') || category || 'GM') : category).toUpperCase();
    const urlSeatType = (useUrlParams ? (searchParams.get('seat') || seatType || 'ROK') : seatType).toUpperCase();
    
    let rankNum = parseInt(urlRank, 10);
    
    if (currentMode === 'analyzer') {
      if (!urlRank || isNaN(rankNum) || rankNum < 1) {
        currentMode = 'explorer';
        setMode('explorer');
      }
    }

    const rawCollege = useUrlParams ? (collegeName || searchParams.get('college') || collegeQuery) : collegeQuery;
    let resolvedCollegeName = rawCollege;
    if (rawCollege && colleges.length > 0) {
      const matched = colleges.find(c => c.college_code.toLowerCase() === rawCollege.toLowerCase());
      if (matched) {
        resolvedCollegeName = matched.college_name;
      }
    }

    let resolvedBranches = [];
    const rawBranch = useUrlParams ? (branchName || searchParams.get('branches')) : null;
    if (rawBranch && branches.length > 0) {
      const queryList = rawBranch.split(',');
      for (const qItem of queryList) {
        const matched = branches.find(b => slugify(b.raw_name) === slugify(qItem));
        if (matched && !resolvedBranches.includes(matched.raw_name)) {
          resolvedBranches.push(matched.raw_name);
        }
      }
    } else {
      resolvedBranches = selectedBranches;
    }

    if (currentMode === 'explorer') {
      if (!resolvedCollegeName && resolvedBranches.length === 0) {
        setError('Please select at least one college or branch to explore cutoffs.')
        return
      }
    }

    if (!urlCategory) {
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

      // Sync resolved values back to React state so UI displays them correctly
      if (urlRank) setRank(urlRank);
      setCategory(urlCategory);
      setSeatType(urlSeatType);
      if (resolvedCollegeName !== collegeQuery) setCollegeQuery(resolvedCollegeName);
      if (JSON.stringify(resolvedBranches) !== JSON.stringify(selectedBranches)) {
        setSelectedBranches(resolvedBranches);
      }

      // The fetched fullMatrixData is already scoped to urlCategory and urlSeatType
      let filteredData = fullMatrixData;

      if (currentMode === 'analyzer') {
        let lo, hi;
        if (variation === '') {
          // Auto variation logic
          if (rankNum > 10000) {
            lo = Math.max(1, rankNum - (rankNum * 0.3));
            hi = rankNum + (rankNum * 0.5);
          } else {
            lo = Math.max(1, rankNum * 0.5); // 50% before
            hi = rankNum * 3; // 3x after for top ranks
          }
        } else {
          // Manual variation logic
          const safeVariation = Math.min(300000, Math.max(0, variation));
          lo = Math.max(1, rankNum - safeVariation);
          hi = rankNum + safeVariation;
        }
        filteredData = filteredData.filter(row => row.max_rank >= lo && row.min_rank <= hi)
      }

      const cQuery = (resolvedCollegeName || '').trim().toLowerCase()
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

      if (resolvedBranches.length > 0) {
        // Expand selected parent branches to all child raw_names
        // e.g. selecting "ELECTRONICS AND COMMUNICATION ENGG" should also match
        // "ELECTRONICS AND COMMUNICATIO N ENGG" and other variants under that parent
        const expandedRawNames = new Set();
        for (const selected of resolvedBranches) {
          const selLower = selected.toLowerCase();
          let expanded = false;
          for (const b of branches) {
            if (b.parent_branches?.name && b.parent_branches.name.toLowerCase() === selLower) {
              expandedRawNames.add(b.raw_name.toLowerCase());
              expanded = true;
            }
          }
          // Fallback: if it wasn't a parent branch name, match directly as a raw name
          if (!expanded) {
            expandedRawNames.add(selLower);
          }
        }
        filteredData = filteredData.filter(row => expandedRawNames.has(row.course_name.toLowerCase()))
      }

      setResults(filteredData || [])

      setTimeout(() => {
        const el = document.getElementById('results-container');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      const params = new URLSearchParams()
      if (currentMode === 'analyzer' && variation !== '') params.set('variation', variation)
      if (urlSeatType !== 'ROK') params.set('seat', urlSeatType)
      
      if (resolvedCollegeName && currentMode === 'analyzer') params.set('college', resolvedCollegeName)
      if (resolvedBranches.length > 0 && currentMode === 'analyzer') {
        params.set('branches', resolvedBranches.map(b => slugify(b)).join(','))
      }
      if (currentMode === 'explorer' && resolvedCollegeName && resolvedBranches.length > 0) {
        params.set('college', resolvedCollegeName)
      }
      
      let newPath = `/${examPrefix}/${stream}`
      if (currentMode === 'analyzer' && rankNum) {
        newPath = `/${examPrefix}/${stream}/analyzer/rank/${rankNum}/${urlCategory.toLowerCase()}`
      } else if (currentMode === 'explorer') {
        if (resolvedBranches.length > 0) {
          newPath = `/${examPrefix}/${stream}/explorer/branch/${encodeURIComponent(slugify(resolvedBranches[0]))}`
          params.set('cat', urlCategory.toLowerCase())
        } else if (resolvedCollegeName) {
          const matched = colleges.find(c => c.college_name.toLowerCase() === resolvedCollegeName.trim().toLowerCase() || c.college_code.toLowerCase() === resolvedCollegeName.trim().toLowerCase());
          const code = matched ? matched.college_code.toLowerCase() : resolvedCollegeName.toLowerCase();
          newPath = `/${examPrefix}/${stream}/explorer/college/${encodeURIComponent(code)}`
          params.set('cat', urlCategory.toLowerCase())
        }
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : ''
      navigate(`${newPath}${queryString}`, { replace: true })

      if (window.gtag) {
        window.gtag('event', 'search', {
          mode: currentMode,
          rank_entered: currentMode === 'analyzer' ? rankNum : 'N/A',
          variation: currentMode === 'analyzer' ? variation : 'N/A',
          category: urlCategory,
          seat_type: urlSeatType,
          college_query: resolvedCollegeName?.trim() || 'N/A',
          search_term: resolvedBranches.length > 0 ? resolvedBranches.join(',') : 'All Branches',
          results_count: filteredData ? filteredData.length : 0
        })
      }

    } catch (e) {
      console.error("Search failed:", e)
      setError('Search failed. Please ensure the selected stream and filters are valid.')
    } finally {
      setLoading(false)
    }
  }, [mode, rank, variation, category, seatType, selectedBranches, collegeQuery, branches, colleges, stream, fullMatrixData, rankValue, categoryParam, searchParams, navigate, hasAutoSearched])

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
    setVariation('')
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

  let pageTitle = `${formattedStreamName} Cutoffs | Uninode Cutoff Analyzer`
  let pageDescription = `Analyze historical KCET cutoff trends for ${formattedStreamName}. Discover eligible colleges for your rank with the Uninode Cutoff Analyzer.`

  if (mode === 'analyzer' && rank && category) {
    pageTitle = `Rank ${rank} ${category} - ${formattedStreamName} | Uninode`
    pageDescription = `Discover eligible ${formattedStreamName} colleges for rank ${rank} in ${category} category using the Uninode Cutoff Analyzer.`
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
            <Link to={`/${examPrefix}`} className="font-display font-bold text-xl tracking-tight text-ink flex items-center">
              Uninode<span className="text-blue-600 ml-1">{examPrefix.toUpperCase()}</span>
            </Link>
        </div>

        {/* Page Title & Toggle Container */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="sr-only">
              {stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Cutoffs & Rank Analyzer
            </h1>
            <h2 className="text-3xl font-display font-bold text-ink mb-1 flex items-center gap-3">
              {stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <p className="text-muted font-body text-sm mt-1">
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
          <div className={`mt-4 px-4 py-3 border rounded-lg text-sm ${error.includes('downloading') ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-miss'}`}>
            {error}
          </div>
        )}

        {/* Results */}
        <div id="results-container" className="mt-8 scroll-mt-6 min-h-[500px]">
          {loading && (
            <div className="text-center py-16 text-muted font-body text-sm flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin mb-4"></div>
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
                examPrefix={examPrefix}
                rows={groupedResults}
                rounds={rounds}
                userRank={mode === 'analyzer' ? parseInt(rank, 10) : null}
                stream={stream}
                category={category}
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
        advMath: row.advMath
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