import { useState } from 'react';

export default function ArticleMasterTable({ matchedRows, cleanCollege, branch }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!matchedRows || matchedRows.length === 0) return null;

  // Find all unique years across all categories
  const allYearsSet = new Set();
  matchedRows.forEach(row => {
    if (row.rounds) {
      Object.keys(row.rounds).forEach(key => {
        const [yStr] = key.split('_R');
        const year = Number(yStr);
        if (!isNaN(year)) allYearsSet.add(year);
      });
    }
  });
  
  const allYears = Array.from(allYearsSet).sort((a,b) => b - a); // descending

  // For each row (category), find the final round cutoff for each year
  const tableData = matchedRows.map(row => {
    const category = row.category;
    const yearCutoffs = {};
    
    allYears.forEach(year => {
      if (row.rounds) {
        // find all rounds for this year
        const roundsForYear = Object.keys(row.rounds)
          .filter(k => k.startsWith(`${year}_R`))
          .map(k => {
             const rStr = k.split('_R')[1];
             return { roundNum: Number(rStr), val: row.rounds[k] };
          })
          .filter(r => !isNaN(r.roundNum) && r.val !== null && r.val !== undefined && r.val !== '--')
          .sort((a, b) => a.roundNum - b.roundNum); // ascending rounds
          
        if (roundsForYear.length > 0) {
          // final round is the last one in the array
          yearCutoffs[year] = roundsForYear[roundsForYear.length - 1].val;
        } else {
          yearCutoffs[year] = '--';
        }
      } else {
        yearCutoffs[year] = '--';
      }
    });

    return { category, yearCutoffs };
  });

  return (
    <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div 
        className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h2 className="text-xl font-bold text-gray-900">All Categories Master Table</h2>
          <p className="text-sm text-gray-600 mt-1">Final closing ranks for {branch} at {cleanCollege} across all available quotas.</p>
        </div>
        <button className="text-gray-500 hover:text-gray-800 transition-colors p-2" aria-label="Toggle Table">
          <svg className={`w-6 h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100/50">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold border-b border-gray-200">Category</th>
                {allYears.map(year => (
                  <th key={year} scope="col" className="px-6 py-4 font-bold border-b border-gray-200">{year} Closing Rank</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={row.category} className={idx !== tableData.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-6 py-4 font-bold text-gray-900 bg-gray-50/30">{row.category}</td>
                  {allYears.map(year => (
                    <td key={year} className="px-6 py-4">
                      {row.yearCutoffs[year] !== '--' ? row.yearCutoffs[year].toLocaleString() : '--'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
