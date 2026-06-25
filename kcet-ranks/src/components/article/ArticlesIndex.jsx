import { useContext } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BookOpen, Menu, GraduationCap, Building2, Library } from 'lucide-react'
import TabTitle from '../TabTitle'
import { SidebarContext } from '../Layout'
import streams from '../../streams.json'

const EXAM_INFO = {
  kcet: { title: 'KCET', desc: 'Karnataka Common Entrance Test', icon: GraduationCap, color: 'from-blue-500 to-indigo-600' },
  comedk: { title: 'COMEDK', desc: 'Consortium of Medical, Engineering and Dental Colleges of Karnataka', icon: Building2, color: 'from-emerald-500 to-teal-600' },
  dcet: { title: 'DCET', desc: 'Diploma Common Entrance Test', icon: Library, color: 'from-purple-500 to-fuchsia-600' }
}

export default function ArticlesIndex() {
  const { exam } = useParams()
  const { toggleSidebar } = useContext(SidebarContext)

  const isExamView = !!exam;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <TabTitle 
        title="Cutoff Articles & Analysis | Uninode" 
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
              Uninode<span className="text-blue-600 ml-1">{exam ? exam.toUpperCase() : ''}</span>
            </Link>
        </div>
      </div>

      <div className="max-w-4xl w-full px-4 pb-12">
        {isExamView && (
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-500">
            <Link to="/articles" className="hover:text-gray-900 transition-colors">Article Archives</Link>
            <span>/</span>
            <span className="text-gray-900 uppercase">{exam}</span>
          </div>
        )}

        <h1 className="text-3xl font-display font-bold text-gray-900 mb-8 flex items-center gap-3 border-b border-gray-200 pb-6">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Cutoff Articles & Analysis
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {!isExamView ? (
             Object.entries(EXAM_INFO).map(([examId, info]) => {
                const IconComponent = info.icon;
                return (
                  <Link
                    key={examId}
                    to={`/${examId}/articles`}
                    className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-center relative overflow-hidden"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${info.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    <IconComponent className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors mb-3" />
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {info.title} Archive
                    </h2>
                    <span className="text-sm text-gray-500 mt-2 font-medium">Browse Streams &rarr;</span>
                  </Link>
                )
             })
          ) : (
            streams.map(s => {
              const streamId = typeof s === 'string' ? s : s.id;
              const displayName = streamId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              
              return (
                <Link
                  key={streamId}
                  to={`/${exam}/articles/${streamId}`}
                  className="group p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-center"
                >
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {displayName}
                  </h2>
                  <span className="text-sm text-gray-500 mt-2 font-medium">Browse Articles &rarr;</span>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
