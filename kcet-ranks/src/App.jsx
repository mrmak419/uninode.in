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
  const [branchQuery,setBranchQuery]= useState('')

  // Data state
  const [rounds,     setRounds]     = useState([])   // [{year, round}]
  const [branches,   setBranches]   = useState([])   // unique course names
  const [results,    setResults]    = useState(null) // null = not searched yet
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // Load available rounds and branch list on mount
  useEffect(() => {
    async function loadMeta() {
      // Get latest 6 distinct (year, round, seat_type) combos from the view
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
          if (unique.length === 6) break
        }
        setRounds(unique)
      }

      // Get unique branch names with parent + specialisation for autocomplete
      const { data: branchData } = await supabase
        .from('branches')
        .select('raw_name, parent_branches(name, alias), specialisations(name)')
        .order('raw_name')
      if (branchData) setBranches(branchData)
    }
    loadMeta()
  }, [])

  const search = useCallback(async () => {
    const rankNum = parseInt(rank, 10)
    if (!rank || isNaN(rankNum) || rankNum < 1) {
      setError('Please enter a valid rank.')
      return
    }
    if (!category) {
      setError('Please select a category.')
      return
    }

    setError(null)
    setLoading(true)
    setResults(null)

    try {
      const safeVariation = Math.min(50000, Math.max(0, variation))
      const lo = Math.max(1, rankNum - safeVariation)
      const hi = rankNum + safeVariation

      // ── Smart Branch Matching ──
      let query = supabase
        .from('cutoffs_matrix')
        .select('college_code, college_name, course_name, category, seat_type, rounds')
        .eq('category', category)
        .eq('seat_type', seatType)
        .gte('max_rank', lo)
        .lte('min_rank', hi)

      const rawInput = branchQuery.trim()
      let matchingRawNames = []
      if (rawInput) {
        const upperQ = rawInput.toUpperCase()
        const lowerQ = rawInput.toLowerCase()
        
        const stopWords = ['engg', 'engineering', 'tech', 'technology', 'and', 'of', 'in', 'with', 'course', 'the']
        const queryTokens = lowerQ
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => !stopWords.includes(w) && w.length >= 3) // min 3 chars to prevent noisy short matches

        matchingRawNames = branches.filter(b => {
          // 1. Exact alias match (e.g. "CSE")
          if (b.parent_branches?.alias === upperQ) return true

          // 2. Exact parent name match
          if (b.parent_branches?.name.toLowerCase() === lowerQ) return true

          // 3. Token match
          const rawNameLower = b.raw_name.toLowerCase()
          const parentNameLower = b.parent_branches?.name?.toLowerCase() || ''
          const specNameLower = b.specialisations?.name?.toLowerCase() || ''

          if (queryTokens.length > 0) {
            // Require ALL valid tokens to match somewhere
            return queryTokens.every(token => {
              // User said "if atleast 5-6 letters match let it show" -> includes covers partial matches beautifully
              return rawNameLower.includes(token) || 
                     parentNameLower.includes(token) || 
                     specNameLower.includes(token)
            })
          }
          return false
        }).map(b => b.raw_name)

        // If tokens were extracted but no matches found, or if input was just stop words
        if (matchingRawNames.length === 0) {
          setResults([])
          setLoading(false)
          
          if (window.gtag) {
            window.gtag('event', 'search', {
              search_term: rawInput,
              rank_entered: rankNum,
              category: category,
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
          search_term: rawInput || 'All Branches',
          rank_entered: rankNum,
          category: category,
          results_count: data ? data.length : 0
        })
      }

    } catch (e) {
      setError('Search failed: ' + (e.message || 'unknown error'))
    } finally {
      setLoading(false)
    }
  }, [rank, variation, category, seatType, branchQuery])

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
          <div className="flex items-start gap-3">
            <div>
              <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
                KCET Rank Explorer
              </h1>
              <p className="mt-1 text-muted text-sm md:text-base font-body">
                Engineering cut-off ranks · {yearsText} · All categories
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Search */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <SearchForm
          rank={rank}           setRank={setRank}
          variation={variation} setVariation={setVariation}
          category={category}   setCategory={setCategory}
          seatType={seatType}   setSeatType={setSeatType}
          branchQuery={branchQuery} setBranchQuery={setBranchQuery}
          branches={branches}
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
              <p className="text-ink font-body font-medium">No colleges found</p>
              <p className="mt-1 text-muted font-body text-sm">
                Try increasing your ± variation or changing the branch filter.
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