import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getArticleUrl } from '../../lib/url'

export default function ArticleHeader({ cleanCollege, branch, category, topYears, articleData, seatType, uniqueCategories, examPrefix, stream, collegeCode }) {
  const [showSeatInfo, setShowSeatInfo] = useState(false)
  const navigate = useNavigate()

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

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    if (newCategory !== category) {
      navigate(getArticleUrl(examPrefix, stream, collegeCode, branch, newCategory))
    }
  }

  return (
    <>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-6">
        {cleanCollege} {branch} Cutoff ({category}) {topYears.length > 0 ? `- ${topYears.join(' & ')}` : ''}
      </h1>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm md:text-base text-gray-700 leading-relaxed break-words relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2"><strong>College:</strong> {articleData.college_name}</div>
            <div className="mb-2"><strong>Branch:</strong> {branch}</div>
            <div className="flex items-center gap-2 mt-2">
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
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-900 font-sans shadow-inner max-w-sm">
                    <p className="mb-2"><strong>ROK (Rest of Karnataka):</strong> Standard seats available to eligible candidates across Karnataka.</p>
                    <p><strong>HK (Hyderabad-Karnataka):</strong> Seats reserved for candidates from the Kalyana-Karnataka region (Article 371J).</p>
                </div>
            )}
          </div>
          
          <div className="flex flex-col md:items-end justify-start">
            {uniqueCategories && uniqueCategories.length > 1 && (
              <div className="w-full md:w-auto">
                <label htmlFor="category-select" className="block text-sm font-bold text-gray-700 mb-1">
                  Change Category:
                </label>
                <select
                  id="category-select"
                  value={category}
                  onChange={handleCategoryChange}
                  className="w-full md:w-48 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-sans"
                >
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
