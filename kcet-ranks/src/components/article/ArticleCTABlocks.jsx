import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ArticleCTABlocks({ stream, branch, category, cleanCollege }) {
  const [userRankInput, setUserRankInput] = useState('')

  return (
    <div className="mt-12 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold text-blue-900 mb-3">Will you get a seat?</h3>
          <p className="text-blue-800 mb-4 text-sm">Enter your rank to see which other colleges you can get into for {branch}.</p>
          <input 
            type="number" 
            value={userRankInput}
            onChange={(e) => setUserRankInput(e.target.value)}
            placeholder="Enter your KCET Rank" 
            className="w-full px-4 py-2 mb-4 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
          />
        </div>
        <Link 
          to={userRankInput 
            ? `/analyzer/${stream}/rank/${userRankInput}/${encodeURIComponent(category)}?branches=${encodeURIComponent(branch)}`
            : `/explorer/${stream}/branch/${encodeURIComponent(branch)}?cat=${encodeURIComponent(category)}`
          }
          className="inline-block bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:bg-blue-700 hover:shadow-md transition-all"
        >
          Analyze
        </Link>
      </div>
      
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-bold text-emerald-900 mb-3">Explore more branches</h3>
          <p className="text-emerald-800 mb-6 text-sm">Discover and compare cutoff ranks for all other branches offered at {cleanCollege}.</p>
        </div>
        <Link 
          to={`/explorer/${stream}/college/${encodeURIComponent(cleanCollege)}?cat=${encodeURIComponent(category)}`}
          className="inline-block bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow hover:bg-emerald-700 hover:shadow-md transition-all"
        >
          View College
        </Link>
      </div>
    </div>
  )
}
