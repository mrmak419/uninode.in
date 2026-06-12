export default function ArticleMatrixTable({ uniqueRounds, sortedYearsDescending, rounds }) {
  return (
    <div className="mt-6 mb-6 w-full max-w-full overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Year</th>
            {uniqueRounds.map(r => (
              <th key={r} className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Round {r}</th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Round Shift</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedYearsDescending.map(year => {
            const yrRounds = Object.keys(rounds[year] || {}).map(Number).sort((a,b) => a - b);
            const rFirst = yrRounds.length > 0 ? rounds[year][yrRounds[0]] : null;
            const rLast = yrRounds.length > 0 ? rounds[year][yrRounds[yrRounds.length - 1]] : null;
            
            let changeStr = '--';
            if (rFirst && rLast && yrRounds.length > 1) {
              const diff = rLast - rFirst;
              const pct = ((diff / rFirst) * 100).toFixed(1);
              const lastR = yrRounds[yrRounds.length - 1];
              changeStr = `${diff > 0 ? '+' : ''}${diff} (${pct}%) to R${lastR}`;
            }

            return (
              <tr key={year} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 bg-gray-50/50">{year}</td>
                {uniqueRounds.map(r => {
                  const rankVal = rounds[year]?.[r];
                  return (
                    <td key={r} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                      {rankVal && rankVal !== '--' ? rankVal.toLocaleString() : '--'}
                    </td>
                  )
                })}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium bg-gray-50/30">
                  {changeStr}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
