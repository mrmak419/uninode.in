import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import SearchForm from './components/SearchForm.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import Analytics from './components/Analytics.jsx'

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
  // Search state
  const [rank,       setRank]       = useState('')
  const [variation,  setVariation]  = useState(3000)
  const [category,   setCategory]   = useState('GM')
  const [seatType,   setSeatType]   = useState('ROK')
  const [selectedBranches, setSelectedBranches] = useState([])
  const [collegeQuery, setCollegeQuery] = useState('')
  const [mode, setMode] = useState('predictor') // 'predictor' | 'explorer'

  // Data state
  const [rounds,     setRounds]     = useState([])   // [{year, round}]
  const [branches,   setBranches]   = useState([])   // unique course names
  const [colleges,   setColleges]   = useState([])   // list of all colleges
  const [results,    setResults]    = useState(null) // null = not searched yet
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // Load available rounds and branch list on mount
  useEffect(() => {
    async function loadMeta() {
      // Get all distinct (year, round, seat_type) combos from the view
      const { data: roundData } = await supabase
        .from('latest_rounds')
        .select('year, round, seat_type')
        .order('year',  { ascending: false })
        .order('round', { ascending: false })

      if (roundData) {
        const seen = new Set()
        const unique = []
        for (const r of roundData) {
          const key = r.year + '-' + r.round + '-' + r.seat_type
          if (!seen.has(key)) {
            seen.add(key)
            unique.push(r)
          }
        }
        setRounds(unique)
      }

      // Get unique branch names with parent + specialisation for autocomplete
      const { data: branchData } = await supabase
        .from('branches')
        .select('raw_name, parent_branches(name, alias), specialisations(name)')
        .order('raw_name')
      if (branchData) setBranches(branchData)

      // Get all colleges for autocomplete dropdown
      const { data: collegeData } = await supabase
        .from('colleges')
        .select('college_code, college_name, search_terms')
        .order('college_code')
      if (collegeData) setColleges(collegeData)
    }
    loadMeta()
  }, [])

  const search = useCallback(async () => {
    let rankNum;
    if (mode === 'predictor') {
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
      // ── Smart Branch Matching ──
      let query = supabase
        .from('cutoffs_matrix')
        .select('college_code, college_name, course_name, category, seat_type, rounds')
        .eq('category', category)
        .eq('seat_type', seatType)

      if (mode === 'predictor') {
        const safeVariation = Math.min(50000, Math.max(0, variation))
        const lo = Math.max(1, rankNum - safeVariation)
        const hi = rankNum + safeVariation
        query = query.gte('max_rank', lo).lte('min_rank', hi)
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
        query = query.in('college_code', matchedCodes)
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
              rank_entered: mode === 'predictor' ? rankNum : 'N/A',
              variation: mode === 'predictor' ? variation : 'N/A',
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
        query = query.in('course_name', matchingRawNames)
      }

      const { data, error: qErr } = await query
      if (qErr) throw qErr

      setResults(data || [])

      // Send event to Google Analytics
      if (window.gtag) {
        window.gtag('event', 'search', {
          mode: mode,
          rank_entered: mode === 'predictor' ? rankNum : 'N/A',
          variation: mode === 'predictor' ? variation : 'N/A',
          category: category,
          seat_type: seatType,
          college_query: collegeQuery.trim() || 'N/A',
          search_term: selectedBranches.length > 0 ? selectedBranches.join(',') : 'All Branches',
          results_count: data ? data.length : 0
        })
      }

    } catch (e) {
      setError('Search failed: ' + (e.message || 'unknown error'))
    } finally {
      setLoading(false)
    }
  }, [mode, rank, variation, category, seatType, selectedBranches, collegeQuery, branches])

  // Group results by college + course for the pivot table
  const groupedResults = results ? groupByCourseCollege(results, rounds) : null

  // Dynamic years for subtitle
  const uniqueYears = Array.from(new Set(rounds.map(r => r.year))).sort((a,b) => a-b)
  let yearsText = '2024 & 2025' // fallback
  if (uniqueYears.length > 0) {
    if (uniqueYears.length === 1) yearsText = String(uniqueYears[0])
    else if (uniqueYears.length === 2) yearsText = `${uniqueYears[0]} & ${uniqueYears[1]}`
    else yearsText = `${uniqueYears.slice(0, -1).join(', ')} & ${uniqueYears[uniqueYears.length - 1]}`
  }

  return (
    <div className="min-h-screen bg-paper">
      <Analytics />
      
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="KCET Logo" className="w-12 h-12 rounded-xl shadow-sm" />
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-ink">
                  KCET {mode === 'predictor' ? 'Predictor' : 'Explorer'}
                </h1>
                <p className="text-muted mt-1 font-body">
                  Historical cut-off analysis ({yearsText})
                </p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-border/50 p-1 rounded-full w-full md:w-auto self-start md:self-center shrink-0 border border-border/80">
              <button 
                onClick={() => {
                  setMode('predictor')
                  if (window.gtag) window.gtag('event', 'mode_switch', { new_mode: 'predictor' })
                }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${mode === 'predictor' ? 'bg-white shadow-sm text-ink' : 'text-muted hover:text-ink'}`}
              >
                Predictor
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
        </div>
      </header>

      {/* Search */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
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
          loading={loading}
        />

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-miss text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        <div className="mt-8">
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
                {mode === 'predictor' 
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
                <Legend rank={parseInt(rank, 10)} />
              </div>
              <ResultsTable
                rows={groupedResults}
                rounds={rounds}
                userRank={parseInt(rank, 10)}
              />
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-muted text-xs font-body space-y-2">
          <p>Cut-off ranks are from previous counselling rounds and are for reference only.</p>
          <p>Always verify on the official <a href="https://cetonline.karnataka.gov.in" target="_blank" rel="noreferrer" className="underline hover:text-ink">KEA website</a>.</p>
          <div className="pt-4 flex items-center justify-center gap-4 text-gray-500">
            <a href="/privacy-policy" className="hover:text-ink transition-colors">Privacy Policy</a>
            <span>&bull;</span>
            <a href="/terms-of-service" className="hover:text-ink transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Group flat rows into { college_code, college_name, course_name, rounds: {year_round: rank} }
function groupByCourseCollege(rows, availableRounds) {
  const map = new Map()

  for (const row of rows) {
    const key = row.college_code + '||' + row.course_name
    if (!map.has(key)) {
      map.set(key, {
        college_code: row.college_code,
        college_name: row.college_name || row.college_code,
        course_name:  row.course_name,
        rounds: row.rounds || {},
      })
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