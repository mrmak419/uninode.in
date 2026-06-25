import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

const SEAT_TYPES = [
  { value: 'ROK', label: 'Rest of Karnataka' },
  { value: 'HK',  label: 'Hyderabad Karnataka' },
]


export default function SearchForm({
  mode,
  rank, setRank,
  variation, setVariation,
  category, setCategory,
  seatType, setSeatType,
  selectedBranches, setSelectedBranches,
  collegeQuery, setCollegeQuery,
  branches,
  colleges = [],
  allCategories,
  onSearch,
  onClear,
  loading,
}) {
  const { stream = 'engineering' } = useParams()
  const [branchOpen, setBranchOpen] = useState(false)
  const [branchInput, setBranchInput] = useState('')
  const branchRef = useRef(null)

  const [collegeOpen, setCollegeOpen] = useState(false)
  const collegeRef = useRef(null)

  const [showInfo, setShowInfo] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (branchRef.current && !branchRef.current.contains(e.target)) {
        setBranchOpen(false)
      }
      if (collegeRef.current && !collegeRef.current.contains(e.target)) {
        setCollegeOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Derive unique branches for the dropdown
  const parentBranchesMap = new Map()
  branches.forEach(b => {
    if (stream === 'engineering') {
      if (b.parent_branches?.name) {
        parentBranchesMap.set(b.parent_branches.name, {
          name: b.parent_branches.name,
          alias: b.parent_branches.alias
        })
      }
    } else {
      if (b.raw_name) {
        parentBranchesMap.set(b.raw_name, {
          name: b.raw_name,
          alias: b.alias || ''
        })
      }
    }
  })
  const parentBranchesList = Array.from(parentBranchesMap.values())

  const filteredBranches = parentBranchesList.filter(pb => {
    const q = branchInput.toLowerCase()
    const isSelected = selectedBranches.includes(pb.name)
    if (isSelected) return false // Don't show already selected in dropdown
    if (!q) return true // Show all if input is empty
    return pb.name.toLowerCase().includes(q) || pb.alias?.toLowerCase().includes(q)
  }).slice(0, branchInput ? 50 : parentBranchesList.length)

  const filteredColleges = colleges.filter(c => {
    if (!collegeQuery) return true // Show all if input is empty
    const q = collegeQuery.toLowerCase()
    return c.college_name.toLowerCase().includes(q) || 
           c.college_code.toLowerCase().includes(q) || 
           (c.search_terms && c.search_terms.toLowerCase().includes(q))
  })
  .sort((a, b) => a.college_code.localeCompare(b.college_code))
  .slice(0, collegeQuery ? 50 : colleges.length)

  function handleKey(e) {
    if (e.key === 'Enter') onSearch()
  }

  function toggleBranch(branchName) {
    if (selectedBranches.includes(branchName)) {
      setSelectedBranches(selectedBranches.filter(b => b !== branchName))
    } else {
      setSelectedBranches([...selectedBranches, branchName])
    }
    setBranchInput('')
  }

  function removeBranch(branchName) {
    setSelectedBranches(selectedBranches.filter(b => b !== branchName))
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch() }} className="bg-white border border-border rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Rank */}
        {mode === 'analyzer' && (
          <div className="lg:col-span-1">
            <label htmlFor="search-rank" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Your Rank
            </label>
            <div className="relative">
              <input
                id="search-rank"
                type="number"
                min="1"
                max="400000"
                placeholder="e.g. 8500"
                value={rank}
                onChange={e => setRank(e.target.value.replace(/-/g, ''))}
                onFocus={e => e.target.select()}
                onKeyDown={handleKey}
                className="w-full pl-3.5 pr-10 py-2.5 border border-border rounded-lg font-mono text-base text-ink
                           focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                           placeholder:text-muted/40 bg-paper"
              />
              {rank && (
                <button
                  type="button"
                  onClick={() => setRank('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 rounded-full hover:bg-gray-100"
                  aria-label="Clear rank"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Category */}
        <div>
          <label htmlFor="search-category" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            id="search-category"
            aria-label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg font-mono text-sm text-ink
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-paper"
          >
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Seat Type */}
        <div>
          <label htmlFor="search-seattype" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Seat Type
          </label>
          <select
            id="search-seattype"
            aria-label="Seat Type"
            value={seatType}
            onChange={e => setSeatType(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-paper"
          >
            {SEAT_TYPES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* College search */}
        <div className="relative" ref={collegeRef}>
          <label htmlFor="search-college" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>College {mode === 'analyzer' && <span className="text-muted/80 normal-case font-normal ml-1">(Optional)</span>}</span>
          </label>
          <div className="relative">
            <input
              id="search-college"
              type="text"
              placeholder="e.g. RV College"
              value={collegeQuery}
              onChange={e => { setCollegeQuery(e.target.value); setCollegeOpen(true) }}
              onFocus={e => { setCollegeOpen(true); e.target.select(); }}
              onKeyDown={handleKey}
              className="w-full pl-3.5 pr-10 py-2.5 border border-border rounded-lg text-sm text-ink
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                         placeholder:text-muted/70 bg-paper"
            />
            {collegeQuery && (
              <button
                type="button"
                onClick={() => { setCollegeQuery(''); setCollegeOpen(false); document.getElementById('search-college')?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 rounded-full hover:bg-gray-100"
                aria-label="Clear college search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {collegeOpen && filteredColleges.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
              {filteredColleges.map(c => (
                <button
                  key={c.college_code}
                  onMouseDown={() => {
                    setCollegeQuery(c.college_name)
                    setCollegeOpen(false)
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper transition-colors border-b border-border/40 last:border-0"
                >
                  <span className="font-medium">{c.college_name}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-muted/10 text-muted font-mono text-[10px]">{c.college_code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Branch Row */}
      <div className="mt-4" ref={branchRef}>
        <label htmlFor="search-branch" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Branches {mode === 'analyzer' && <span className="text-muted normal-case font-normal ml-1">(Optional)</span>}</span>
        </label>
        
        <div className="relative border border-border rounded-lg bg-paper focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors">
          <div className="flex flex-wrap items-center gap-2 p-2">
            {selectedBranches.map(branchName => (
              <span key={branchName} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/10 text-accent font-semibold text-xs border border-accent/20">
                {branchName}
                <button 
                  onClick={() => removeBranch(branchName)}
                  aria-label={`Remove branch ${branchName}`}
                  className="hover:bg-accent/20 rounded-full p-0.5 transition-colors focus:outline-none"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            
            <div className="relative flex-1 min-w-[150px]">
              <input
                id="search-branch"
                type="text"
                placeholder={selectedBranches.length === 0 ? "e.g. Computer Science" : "Add another branch..."}
                value={branchInput}
                onChange={e => { setBranchInput(e.target.value); setBranchOpen(true) }}
                onFocus={e => { setBranchOpen(true); e.target.select(); }}
                onKeyDown={handleKey}
                className="w-full bg-transparent text-sm text-ink focus:outline-none placeholder:text-muted/70 py-0.5 pr-8"
              />
              {branchInput && (
                <button
                  type="button"
                  onClick={() => { setBranchInput(''); setBranchOpen(false); document.getElementById('search-branch')?.focus(); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted hover:text-ink p-1 rounded-full hover:bg-gray-100"
                  aria-label="Clear branch search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {branchOpen && filteredBranches.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
              {filteredBranches.map(pb => (
                <button
                  key={pb.name}
                  onMouseDown={() => toggleBranch(pb.name)}
                  className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper transition-colors border-b border-border/40 last:border-0"
                >
                  <span className="font-medium">{pb.name}</span>
                  {pb.alias && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-muted/10 text-muted font-mono text-[10px]">{pb.alias}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Variation & Buttons */}
      <div className="mt-6 pt-4 sm:pt-0 border-t border-border/40 sm:border-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Left side: Variation (only in analyzer mode) */}
        <div>
          {mode === 'analyzer' && (
            <div className="flex items-center gap-2 relative">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
                ± Variation
                <button
                  type="button"
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-0.5 rounded-full hover:bg-black/5 text-muted hover:text-ink transition-colors focus:outline-none flex items-center justify-center"
                  title="What is Variation?"
                >
                  <svg className="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </button>
              </span>
              <div className="flex items-center gap-1">
                <input
                  id="variation-input"
                  aria-label="Custom Variation Amount"
                  type="number"
                  min="0"
                  max="300000"
                  placeholder="Auto"
                  value={variation === '' ? '' : variation}
                  onChange={e => {
                    if (e.target.value === '') {
                      setVariation('')
                      return
                    }
                    let val = parseInt(e.target.value) || 0
                    setVariation(Math.min(300000, Math.max(0, val)))
                  }}
                  className="w-24 px-2.5 py-1.5 border border-border rounded-md font-mono text-sm text-ink
                             focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-paper"
                />
              </div>

              {showInfo && (
                <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 p-3.5 bg-white border border-border rounded-xl shadow-lg z-50 text-[11px] text-muted leading-relaxed font-medium">
                  Variation determines how far above and below your rank we should search for cutoffs.
                  <div className="h-2"></div>
                  By default (Auto), we dynamically search slightly above your rank for competitive "dream" colleges, and much further below your rank to ensure you have safe backup options.
                  <div className="h-2"></div>
                  If you want to manually set a fixed search range, enter the exact number here.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side: Buttons */}
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-3 w-full sm:w-auto">
          <Link
            to={`/option-entry?stream=${stream}`}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg
                       bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-200
                       hover:bg-emerald-100 transition-colors duration-150 focus:outline-none shadow-sm
                       w-full sm:w-auto text-center"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>Open option entry generator</span>
          </Link>

          {/* Clear button */}
          <button
            type="button"
            onClick={onClear}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-muted hover:text-ink hover:bg-paper transition-colors duration-150 focus:outline-none flex-1 sm:flex-none text-center"
          >
            Clear
          </button>

          {/* Share button */}
          <button
            type="button"
            aria-label="Share Results"
            onClick={async () => {
              if (window.gtag) {
                window.gtag('event', 'share_clicked', {
                  method: navigator.share ? 'web_share_api' : 'clipboard'
                });
              }

              const url = window.location.href;
              const copyFallback = () => {
                navigator.clipboard.writeText(url)
                const btn = document.getElementById('share-btn-text')
                if (btn) {
                  const original = btn.innerText
                  btn.innerText = 'Copied!'
                  setTimeout(() => { btn.innerText = original }, 2000)
                }
              }

              if (navigator.share) {
                try {
                  await navigator.share({
                    title: 'KCET College Analyzer',
                    text: 'Check out these KCET cutoffs!',
                    url: url
                  })
                } catch (err) {
                  // Fallback to copy if share fails (but not if user just dismissed the sheet)
                  if (err.name !== 'AbortError') copyFallback()
                }
              } else {
                copyFallback()
              }
            }}
            title="Copy link to these results"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg
                       border border-border bg-white text-ink text-sm font-semibold
                       hover:bg-paper transition-colors duration-150 focus:outline-none flex-1 sm:flex-none text-center"
          >
            <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span id="share-btn-text">Share</span>
          </button>

          {/* Search button */}
          <button
            onClick={onSearch}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg
                       bg-ink text-paper text-sm font-semibold
                       hover:bg-accent transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed flex-[2] sm:flex-none text-center"
          >
            {loading ? (
              <>
                <Spinner />
                Searching…
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </div>
    </form>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}