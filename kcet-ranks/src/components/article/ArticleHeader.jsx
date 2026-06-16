import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'

export default function ArticleHeader({ cleanCollege, branch, category, topYears, articleData, seatType }) {
  const [showSeatInfo, setShowSeatInfo] = useState(false)

  // Update document title for SPA navigation (edge function handles initial SSR title + JSON-LD)
  useEffect(() => {
    if (!articleData) return;
    
    const rawRounds = articleData.rounds || {};
    const parsedRounds = {};
    Object.keys(rawRounds).forEach(key => {
       const [yStr, rStr] = key.split('_R');
       const year = Number(yStr);
       if (!isNaN(year)) parsedRounds[year] = true;
    });

    const years = Object.keys(parsedRounds).map(Number).sort((a,b) => a - b);
    const topSEOYears = years.slice(-3);
    
    document.title = `${cleanCollege} ${branch} Cutoff (${category}) - ${topSEOYears.join(' & ')} | Uninode`;
  }, [articleData, branch, category, cleanCollege])

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-6">
        {cleanCollege} {branch} Cutoff ({category}) {topYears.length > 0 ? `- ${topYears.join(' & ')}` : ''}
      </h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm md:text-base text-gray-700 leading-relaxed break-words relative">
        <div><strong>College:</strong> {articleData.college_name}</div>
        <div><strong>Branch:</strong> {branch}</div>
        <div><strong>Category:</strong> {category}</div>
        <div className="flex items-center gap-2 mt-1">
            <strong>Seat Type:</strong> {seatType}
            <button 
                onClick={() => setShowSeatInfo(!showSeatInfo)} 
                className="text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
                title="What does this mean?"
            >
                <Info size={16} />
            </button>
        </div>
        
        {showSeatInfo && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-900 font-sans shadow-inner">
                <p className="mb-2"><strong>ROK (Rest of Karnataka):</strong> Standard seats available to eligible candidates across Karnataka.</p>
                <p><strong>HK (Hyderabad-Karnataka):</strong> Seats reserved for candidates from the Kalyana-Karnataka region (Article 371J).</p>
            </div>
        )}
      </div>
    </>
  )
}
