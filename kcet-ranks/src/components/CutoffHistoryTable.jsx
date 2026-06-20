import React from 'react'

export default function CutoffHistoryTable({ rounds, item, studentRank, evaluateSafety }) {
  if (!rounds || rounds.length === 0) return null
  const uniqueYears = Array.from(new Set(rounds.map(r => r.year))).sort((a, b) => b - a).slice(0, 4)
  const roundMap = new Map()
  rounds.forEach(r => roundMap.set(r.round, r.round_name || r.round.toString()))
  const uniqueRoundNums = Array.from(new Set(rounds.map(r => r.round))).sort((a, b) => a - b)

  return (
    <div className="mt-3 px-3 py-2.5 bg-paper border border-border rounded-lg text-xs cursor-default" onClick={e => e.stopPropagation()}>
      <span className="block font-semibold uppercase text-muted tracking-wider mb-2 text-[10px]">Cutoff History</span>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-left text-ink">
          <thead>
            <tr className="bg-gray-100 border-b border-border/50 font-bold uppercase tracking-wider text-[10px] text-muted">
              <th className="px-3 py-1.5 border-r border-border/50">Year</th>
              {uniqueRoundNums.map(roundNum => (
                <th key={roundNum} className="px-3 py-1.5 text-center border-r border-border/50 last:border-r-0 whitespace-nowrap min-w-[75px]">
                  {roundMap.get(roundNum)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueYears.map((year, idx) => {
              const hasData = uniqueRoundNums.some(roundNum => item.rounds[`${year}_R${roundNum}`] != null)
              if (!hasData) return null

              return (
                <tr key={year} className={`bg-white ${idx !== uniqueYears.length - 1 ? 'border-b border-border/30' : ''}`}>
                  <td className="px-3 py-2 font-semibold text-ink border-r border-border/50 font-mono">
                    {year}
                  </td>
                  {uniqueRoundNums.map(roundNum => {
                    const rankVal = item.rounds[`${year}_R${roundNum}`]
                    let cls = 'px-3 py-2 text-center border-r border-border/50 last:border-r-0 font-mono '
                    if (rankVal == null) {
                      return <td key={roundNum} className="px-3 py-2 text-center border-r border-border/50 text-muted/40 font-mono">—</td>
                    }
                    if (typeof rankVal === 'string' && isNaN(Number(rankVal))) {
                      return <td key={roundNum} className="px-3 py-2 text-center border-r border-border/50 text-muted font-mono">{rankVal}</td>
                    }

                    const rNum = Number(rankVal)
                    const safetyStatus = evaluateSafety(rNum, studentRank)
                    
                    if (safetyStatus === 'safe') cls += 'text-green-700 font-semibold'
                    else if (safetyStatus === 'borderline') cls += 'text-yellow-700 font-semibold'
                    else if (safetyStatus === 'dream') cls += 'text-red-700 font-semibold'
                    else cls += 'text-ink'

                    return (
                      <td key={roundNum} className={cls}>
                        {rNum.toLocaleString('en-IN')}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
