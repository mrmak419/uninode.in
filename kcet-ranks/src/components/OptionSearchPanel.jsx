import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Search, CheckCircle2, Plus } from 'lucide-react'
import CutoffHistoryTable from './CutoffHistoryTable'
import { slugify, normalizeCourse } from '../lib/url'

export default function OptionSearchPanel({
  findCollegesOpen,
  setFindCollegesOpen,
  searchQuery,
  setSearchQuery,
  safetyFilter,
  setSafetyFilter,
  eligibleColleges,
  optionsList,
  addOption,
  removeOption,
  expandedHistory,
  toggleHistory,
  stream,
  rounds,
  rank,
  evaluateSafety,
  activeTab
}) {
  const [inputValue, setInputValue] = useState(searchQuery)
  const [visibleCount, setVisibleCount] = useState(100)

  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    setVisibleCount(100)
  }, [searchQuery, safetyFilter, stream])

  return (
    <div className={`flex flex-col gap-4 print:hidden ${activeTab === 'search' ? 'block' : 'hidden'}`}>
      <div className="bg-white border border-border rounded-2xl p-4 shadow-sm flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setFindCollegesOpen(!findCollegesOpen)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <h2 className="font-display font-bold text-lg text-ink">Find & Add Colleges</h2>
          <ChevronDown className={`w-5 h-5 text-muted transition-transform ${findCollegesOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {findCollegesOpen && (
          <div className="flex flex-col gap-4 border-t border-border/50 pt-4">
            {/* Search Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                setSearchQuery(inputValue)
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by college name or code..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-paper border border-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-ink text-paper text-xs font-bold rounded-xl hover:bg-accent transition-colors shrink-0"
              >
                Search
              </button>
            </form>

            {/* Safety filter buttons */}
            <div>
              <span className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Filter by Safety</span>
              <div className="grid grid-cols-4 gap-1 bg-paper border border-border rounded-lg p-0.5">
                <button onClick={() => setSafetyFilter('all')} className={`py-1.5 rounded text-[11px] font-bold transition-all ${safetyFilter === 'all' ? 'bg-white text-ink shadow-sm border border-border/50' : 'text-muted'}`}>All</button>
                <button onClick={() => setSafetyFilter('safe')} className={`py-1.5 rounded text-[11px] font-bold transition-all ${safetyFilter === 'safe' ? 'bg-green-600 text-white shadow-sm font-semibold' : 'text-green-700'}`}>Safe</button>
                <button onClick={() => setSafetyFilter('borderline')} className={`py-1.5 rounded text-[11px] font-bold transition-all ${safetyFilter === 'borderline' ? 'bg-yellow-600 text-white shadow-sm font-semibold' : 'text-yellow-700'}`}>Target</button>
                <button onClick={() => setSafetyFilter('dream')} className={`py-1.5 rounded text-[11px] font-bold transition-all ${safetyFilter === 'dream' ? 'bg-red-600 text-white shadow-sm font-semibold' : 'text-red-700'}`}>Dream</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions Results List */}
      {findCollegesOpen && (
        <div className="flex-1 max-h-[600px] overflow-y-auto border border-border rounded-2xl bg-white shadow-sm scrollbar-thin">
          <div className="bg-[#fafaf7] px-4 py-3 border-b border-border/80 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-muted tracking-wider">Matching Choices ({eligibleColleges.length})</span>
          </div>

          {eligibleColleges.length === 0 ? (
            <div className="text-center py-16 px-4 text-muted text-xs font-body">
              {searchQuery
                ? "No colleges match your search criteria and safety filters."
                : "Type in the search bar above or choose a stream to find options."}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {eligibleColleges.slice(0, visibleCount).map((item) => {
                const rowKey = `${item.college_code}||${item.course_name}`
                const isAdded = optionsList.some(
                  o => o.college_code.toUpperCase() === item.college_code.toUpperCase() && 
                       normalizeCourse(o.course_name) === normalizeCourse(item.course_name)
                )
                const isHistoryExpanded = expandedHistory.has(rowKey)

                let safetyBadgeColor = 'bg-gray-100 text-gray-800 border-gray-200'
                let safetyLabel = 'Neutral'
                if (item.safety === 'safe') {
                  safetyBadgeColor = 'bg-green-50 text-green-700 border-green-200'
                  safetyLabel = 'Safe'
                } else if (item.safety === 'borderline') {
                  safetyBadgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  safetyLabel = 'Target'
                } else if (item.safety === 'dream') {
                  safetyBadgeColor = 'bg-red-50 text-red-700 border-red-200'
                  safetyLabel = 'Dream'
                }

                return (
                  <div key={rowKey} className="p-4 hover:bg-paper/30 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-paper border border-border rounded text-muted">{item.college_code}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${safetyBadgeColor}`}>{safetyLabel}</span>
                        </div>
                        <h4 className="font-semibold text-ink text-sm leading-snug line-clamp-1">{item.college_name}</h4>
                        <p className="text-muted text-xs font-body mt-0.5">{item.course_name}</p>
                        {item.cutoff_rank && (
                          <p className="text-muted font-mono text-[10px] mt-1">
                            Cutoff: <span className="font-bold text-ink">{item.cutoff_rank.toLocaleString('en-IN')}</span> ({item.cutoff_label})
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (isAdded) {
                            const idx = optionsList.findIndex(
                              o => o.college_code.toUpperCase() === item.college_code.toUpperCase() && 
                                   normalizeCourse(o.course_name) === normalizeCourse(item.course_name)
                            )
                            if (idx !== -1) removeOption(idx)
                          } else {
                            addOption(item)
                          }
                        }}
                        className={`shrink-0 rounded-xl border text-xs font-bold transition-all shadow-sm flex items-center justify-center ${
                          isAdded 
                            ? 'px-3 py-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 gap-1.5 cursor-pointer' 
                            : 'w-10 h-10 bg-white border-border hover:bg-gray-50 text-ink cursor-pointer'
                        }`}
                        aria-label={isAdded ? "Remove option" : "Add option"}
                      >
                        {isAdded ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>Added</span>
                          </>
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Action Bar for suggestions */}
                    <div className="mt-3 flex items-center justify-between border-t border-dashed border-border/60 pt-2.5">
                      <button
                        onClick={() => toggleHistory(rowKey)}
                        className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        {isHistoryExpanded ? 'Hide Cutoffs' : 'Show Cutoffs History'}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <Link
                        to={`/explorer/${stream}/branch/${slugify(item.course_name)}?college=${item.college_code.toLowerCase()}`}
                        target="_blank"
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        Explore College
                      </Link>
                    </div>

                    {isHistoryExpanded && (
                      <CutoffHistoryTable
                        rounds={rounds}
                        item={item}
                        studentRank={rank}
                        evaluateSafety={evaluateSafety}
                      />
                    )}
                  </div>
                )
              })}
              {eligibleColleges.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 100)}
                  className="w-full py-3 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50/30 border-t border-border/80 transition-colors focus:outline-none cursor-pointer"
                >
                  Load More Choices (+100) — Showing {visibleCount} of {eligibleColleges.length}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
