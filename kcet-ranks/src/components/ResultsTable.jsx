import { useState } from 'react'

export default function ResultsTable({ rows, rounds, userRank }) {
  // Determine unique years and rounds for the matrix
  // Only keep the top 3 recent years
  const uniqueYears = Array.from(new Set(rounds.map(r => r.year))).sort((a, b) => b - a).slice(0, 3)
  const uniqueRoundNums = Array.from(new Set(rounds.map(r => r.round))).sort((a, b) => a - b)

  const [expandedRowKey, setExpandedRowKey] = useState(null)

  function toggleRow(key) {
    setExpandedRowKey(prev => prev === key ? null : key)
  }

  // Get the latest available cutoff for a specific row
  function getLatestRoundRank(row) {
    for (const r of rounds) {
      const key = r.year + '_R' + r.round
      const rank = row.rounds[key]
      if (rank != null) {
        return {
          label: `${r.year} R${r.round}`,
          rank: rank
        }
      }
    }
    return null
  }

  return (
    <div className="w-full">
      {/* Table Header - Unified for both Desktop and Mobile */}
      <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-4 py-3 bg-ink text-paper rounded-t-xl text-xs uppercase tracking-wider font-semibold">
        <div>College</div>
        <div>Course</div>
        <div className="text-right">Latest Cutoff</div>
        <div className="w-8"></div>
      </div>

      {/* Rows */}
      <div className="border border-border rounded-b-xl md:rounded-t-none rounded-xl overflow-hidden bg-white shadow-sm">
        {rows.map((row, i) => {
          const rowKey = row.college_code + '||' + row.course_name
          const isExpanded = expandedRowKey === rowKey
          const latestCutoff = getLatestRoundRank(row)

          return (
            <div key={rowKey} className={`border-b border-border last:border-b-0 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fafaf7]'} hover:bg-amber-50/40`}>
              {/* Main Row Content */}
              <div 
                onClick={() => toggleRow(rowKey)}
                className="cursor-pointer grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_auto] gap-2 md:gap-4 px-4 py-3 md:py-4 items-center"
              >
                {/* College Info */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs px-1.5 py-0.5 bg-paper border border-border rounded text-muted font-medium">
                      {row.college_code}
                    </span>
                  </div>
                  <span className="font-medium text-ink leading-snug text-sm md:text-base">
                    {row.college_name}
                  </span>
                </div>

                {/* Course Info */}
                <div className="text-sm md:text-base text-ink leading-snug">
                  {row.course_name}
                </div>

                {/* Latest Cutoff & Mobile Layout Container */}
                <div className="flex items-center justify-between md:justify-end mt-2 md:mt-0">
                  <span className="md:hidden text-xs text-muted uppercase tracking-wider font-semibold">Latest Cutoff</span>
                  <div className="flex flex-col md:items-end gap-1">
                    {latestCutoff ? (
                      <>
                        <span className="text-[10px] md:text-xs font-semibold text-muted uppercase tracking-wider">{latestCutoff.label}</span>
                        <RankCell rank={latestCutoff.rank} userRank={userRank} />
                      </>
                    ) : (
                      <span className="text-muted/40 font-mono text-sm">—</span>
                    )}
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="hidden md:flex justify-end w-8 text-muted">
                  <svg className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Mobile Expand Hint */}
                <div className="md:hidden mt-2 pt-2 border-t border-border/50 text-center text-xs font-medium text-accent flex items-center justify-center gap-1">
                  {isExpanded ? 'Hide History' : 'Show History'}
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Matrix Panel */}
              {isExpanded && (
                <div className="px-4 pb-5 pt-1 md:pt-2 cursor-default" onClick={e => e.stopPropagation()}>
                  <div className="bg-white border border-border rounded-lg shadow-inner overflow-hidden">
                    <div className="bg-paper px-3 py-2 border-b border-border flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase text-muted tracking-wider">Historical Cutoffs</span>
                    </div>
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="bg-[#fafaf7] border-b border-border/50 text-xs text-muted uppercase tracking-wider">
                            <th className="px-4 py-2 font-semibold border-r border-border/50 w-24">Year</th>
                            {uniqueRoundNums.map(roundNum => (
                              <th key={roundNum} className="px-4 py-2 font-semibold text-center border-r border-border/50 last:border-r-0 min-w-[90px]">
                                Round {roundNum}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uniqueYears.map((year, idx) => (
                            <tr key={year} className={`${idx !== uniqueYears.length - 1 ? 'border-b border-border/30' : ''}`}>
                              <td className="px-4 py-2.5 font-semibold text-ink border-r border-border/50 bg-[#fafaf7] text-xs">
                                {year}
                              </td>
                              {uniqueRoundNums.map(roundNum => {
                                const rank = row.rounds[`${year}_R${roundNum}`]
                                return (
                                  <td key={roundNum} className="px-4 py-2.5 text-center border-r border-border/50 last:border-r-0">
                                    <RankCell rank={rank} userRank={userRank} />
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RankCell({ rank, userRank }) {
  if (rank == null) {
    return <span className="text-muted/40 font-mono text-xs">—</span>
  }

  // userRank ≤ cutoff → student qualifies (lower rank number = better student)
  const qualifies  = userRank <= rank
  // within 20% of cut-off above the student's rank
  const borderline = !qualifies && rank >= userRank * 0.85

  let cls = 'font-mono text-xs md:text-sm px-2 py-0.5 rounded-md inline-block '
  if (qualifies)       cls += 'bg-green-100 text-green-800 border border-green-200'
  else if (borderline) cls += 'bg-yellow-100 text-yellow-800 border border-yellow-200'
  else                 cls += 'bg-red-50 text-red-700 border border-red-100'

  return <span className={cls}>{rank.toLocaleString('en-IN')}</span>
}
