import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Menu } from 'lucide-react'
import TabTitle from '../TabTitle'
import { SidebarContext } from '../Layout'

export default function ArticlesIndex() {
  const [streams, setStreams] = useState([])
  const { toggleSidebar } = useContext(SidebarContext)

  useEffect(() => {
    fetch('/streams.json')
      .then(res => res.json())
      .then(data => setStreams(data))
      .catch(err => console.error("Failed to load streams index:", err))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <TabTitle 
        title="Cutoff Articles & Analysis | Uninode KCET" 
        description="Detailed historical cutoff trends, narrative analysis, and competitiveness tiers for every college and branch in Karnataka."
      />
      
      {/* Top Header Row for Branding & Sidebar Toggle */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center gap-2 text-left mb-6">
            <button 
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-200 transition-colors"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="font-display font-bold text-xl tracking-tight text-gray-900 flex items-center">
              Uninode<span className="text-blue-600 ml-1">KCET</span>
            </Link>
        </div>
      </div>

      <div className="max-w-4xl w-full px-4 pb-12">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-8 flex items-center gap-3 border-b border-gray-200 pb-6">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Cutoff Articles & Analysis
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {streams.map(s => {
            const streamId = typeof s === 'string' ? s : s.id;
            const displayName = streamId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <Link
                key={streamId}
                to={`/article?stream=${streamId}`}
                className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-center"
              >
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {displayName}
                </h2>
                <span className="text-sm text-gray-500 mt-2 font-medium">Browse Articles &rarr;</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
