import { useState, useRef, useEffect } from 'react'

const SEAT_TYPES = [
  { value: 'ROK', label: 'Rest of Karnataka' },
  { value: 'HK',  label: 'Hyderabad Karnataka' },
]

const VARIATION_PRESETS = [1000, 3000, 5000, 10000]

export default function SearchForm({
  rank, setRank,
  variation, setVariation,
  category, setCategory,
  seatType, setSeatType,
  branchQuery, setBranchQuery,
  branches,
  allCategories,
  onSearch,
  loading,
}) {
  const [branchOpen, setBranchOpen] = useState(false)
  const branchRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (branchRef.current && !branchRef.current.contains(e.target)) {
        setBranchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Expand shorthand before filtering dropdown using DB aliases
  let expandedQuery = branchQuery.trim()
  const upperQ = expandedQuery.toUpperCase()
  const aliasMatch = branches.find(b => b.parent_branches?.alias === upperQ)
  if (aliasMatch) {
    expandedQuery = aliasMatch.parent_branches.name
  }

  const filteredBranches = branches
    .filter(b => !branchQuery || b.raw_name.toUpperCase().includes(expandedQuery.toUpperCase()))
    .slice(0, 50)

  function handleKey(e) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className="bg-white border border-border rounded-2xl p-5 md:p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Rank */}
        <div className="lg:col-span-1">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Your Rank
          </label>
          <input
            type="number"
            min="1"
            max="300000"
            placeholder="e.g. 8500"
            value={rank}
            onChange={e => setRank(e.target.value.replace(/-/g, ''))}
            onKeyDown={handleKey}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg font-mono text-base text-ink
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                       placeholder:text-muted/40 bg-paper"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
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
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Seat Type
          </label>
          <select
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

        {/* Branch search */}
        <div className="relative" ref={branchRef}>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            Branch <span className="font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Computer Science"
            value={branchQuery}
            onChange={e => { setBranchQuery(e.target.value); setBranchOpen(true) }}
            onFocus={() => setBranchOpen(true)}
            onKeyDown={handleKey}
            className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-ink
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                       placeholder:text-muted/40 bg-paper"
          />
          {branchOpen && (aliasMatch || filteredBranches.length > 0) && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto scrollbar-thin">
              {aliasMatch && branchQuery.trim() !== expandedQuery && (
                <button
                  onMouseDown={() => { setBranchQuery(expandedQuery); setBranchOpen(false) }}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-ink bg-amber-50 hover:bg-amber-100 transition-colors border-b border-amber-200 font-bold"
                >
                  Select all {expandedQuery} branches →
                </button>
              )}
              {expandedQuery !== branchQuery.trim() && branchQuery.trim() && !aliasMatch && (
                <div className="px-3.5 py-1.5 text-[10px] text-muted bg-paper border-b border-border">
                  Showing results for <span className="font-semibold text-ink">{expandedQuery}</span>
                </div>
              )}
              {filteredBranches.map(b => (
                <button
                  key={b.raw_name}
                  onMouseDown={() => { setBranchQuery(b.raw_name); setBranchOpen(false) }}
                  className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper transition-colors border-b border-border/40 last:border-0"
                >
                  <span className="font-medium">{b.raw_name}</span>
                  {b.parent_branches?.name && (
                    <span className="ml-2 text-muted">{b.parent_branches.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Variation row */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">
            ± Variation
          </span>
          <div className="flex items-center gap-1">
            {VARIATION_PRESETS.map(v => (
              <button
                key={v}
                onClick={() => setVariation(v)}
                className={
                  'px-2.5 py-1 rounded-md text-xs font-mono transition-colors ' +
                  (variation === v
                    ? 'bg-ink text-paper'
                    : 'bg-paper border border-border text-muted hover:border-ink hover:text-ink')
                }
              >
                {v >= 1000 ? (v/1000) + 'k' : v}
              </button>
            ))}
            <input
              type="number"
              min="0"
              max="50000"
              value={variation}
              onChange={e => {
                let val = parseInt(e.target.value) || 0
                setVariation(Math.min(50000, Math.max(0, val)))
              }}
              className="w-20 px-2 py-1 border border-border rounded-md font-mono text-xs text-ink
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-paper"
            />
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={onSearch}
          disabled={loading}
          className="sm:ml-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg
                     bg-ink text-paper text-sm font-semibold
                     hover:bg-accent transition-colors duration-150
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Spinner />
              Searching…
            </>
          ) : (
            'Find Colleges'
          )}
        </button>
      </div>
    </div>
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