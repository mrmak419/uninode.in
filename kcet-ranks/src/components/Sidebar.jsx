import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, ChevronDown, BookOpen } from 'lucide-react'
import examsData from '../exams.json'
import RazorpayButton from './RazorpayButton'

export default function Sidebar({ onClose }) {
  const location = useLocation()
  const [openExam, setOpenExam] = useState(null)
  const [openArticle, setOpenArticle] = useState(null)

  // Auto-expand removed per user request

  return (
    <div className="flex flex-col h-full bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-border shrink-0">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={onClose}>
          <img src="/logo.png" alt="KCET Logo" className="w-10 h-10 rounded-lg shadow-sm shrink-0" />
          <span className="font-display font-bold text-ink text-sm tracking-tight leading-tight">Uninode Cutoff Analyzer</span>
        </Link>
        <button onClick={onClose} aria-label="Close Sidebar" className="p-1 text-muted hover:text-ink lg:hidden">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        <Link
          to="/"
          onClick={() => {
            if (window.innerWidth < 1024) onClose()
          }}
          className={`
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2
            ${location.pathname === '/' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-gray-100 hover:text-ink'}
          `}
        >
          Home
        </Link>
        
        <Link
          to="/gear"
          onClick={() => {
            if (window.innerWidth < 1024) onClose()
          }}
          className={`
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2
            ${location.pathname.startsWith('/gear') ? 'bg-accent text-white shadow-sm' : 'text-orange-600 hover:bg-orange-50'}
          `}
        >
          Student Essentials
        </Link>
        
        <Link
          to="/kcet/option-entry"
          onClick={() => {
            if (window.innerWidth < 1024) onClose()
          }}
          className={`
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-6
            ${location.pathname.includes('/option-entry') ? 'bg-ink text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'}
          `}
        >
          Option entry generator
        </Link>

        {/* Dynamic Exam Dropdowns */}
        <div className="pt-2 border-t border-border/50">
          <span className="block px-3 py-2 text-xs font-bold text-muted uppercase tracking-wider">Exam Streams</span>
          {examsData.map((examObj) => (
            <div key={examObj.id} className="mb-1">
              <button 
                onClick={() => setOpenExam(openExam === examObj.id ? null : examObj.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${openExam === examObj.id ? 'text-ink bg-gray-50' : 'text-muted hover:bg-gray-100 hover:text-ink'}`}
              >
                {examObj.title}
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openExam === examObj.id ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Accordion Content */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openExam === examObj.id ? 'max-h-[1200px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}
              >
                <div className="pl-4 pr-1 pb-2 space-y-0.5">
                  <Link
                    to={`/${examObj.id}`}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose()
                    }}
                    className={`
                      block px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${location.pathname === `/${examObj.id}` ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-gray-100 hover:text-ink'}
                    `}
                  >
                    {examObj.title} Streams
                  </Link>
                  {examObj.streams.map(s => {
                    const streamId = typeof s === 'string' ? s : s.id;
                    const displayName = streamId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const targetPath = `/${examObj.id}/${streamId}`;
                    const isActive = location.pathname === targetPath;
                    
                    return (
                      <Link
                        key={streamId}
                        to={targetPath}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose()
                        }}
                        className={`
                          block px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-gray-100 hover:text-ink'}
                        `}
                      >
                        {displayName}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Article Dropdowns */}
        <div className="pt-2 mt-2 border-t border-border/50">
          <Link
            to="/articles"
            onClick={() => {
              if (window.innerWidth < 1024) onClose()
            }}
            className={`
              block px-3 py-2 rounded-lg text-sm font-bold transition-colors mb-2
              ${location.pathname === '/articles' ? 'bg-ink text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'}
            `}
          >
            Article Archives
          </Link>
          {examsData.map((examObj) => (
            <div key={`article-${examObj.id}`} className="mb-1">
              <button 
                onClick={() => setOpenArticle(openArticle === examObj.id ? null : examObj.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${openArticle === examObj.id ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {examObj.title} Articles
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${openArticle === examObj.id ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Accordion Content */}
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openArticle === examObj.id ? 'max-h-[1200px] opacity-100 mt-1' : 'max-h-0 opacity-0'}`}
              >
                <div className="pl-6 pr-1 pb-2 space-y-0.5 border-l-2 border-blue-100 ml-4">
                  <Link
                    to={`/${examObj.id}/articles`}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose()
                    }}
                    className={`
                      block px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${location.pathname === `/${examObj.id}/articles` ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                  >
                    View Streams
                  </Link>
                  {examObj.streams.map(s => {
                    const streamId = typeof s === 'string' ? s : s.id;
                    const displayName = streamId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const targetPath = `/${examObj.id}/articles/${streamId}`;
                    const isActive = location.pathname === targetPath;
                    
                    return (
                      <Link
                        key={`article-stream-${streamId}`}
                        to={targetPath}
                        onClick={() => {
                          if (window.innerWidth < 1024) onClose()
                        }}
                        className={`
                          block px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                        `}
                      >
                        {displayName}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
      
      {/* Footer */}
      <div className="px-4 py-4 border-t border-border mt-auto shrink-0 text-center flex flex-col gap-3">
        <RazorpayButton />
        <Link to="/contact" className="hover:text-ink text-xs text-muted transition-colors" onClick={() => { if (window.innerWidth < 1024) onClose() }}>
          Made with ❤️ by Ayaan and Shreyas
        </Link>
      </div>
    </div>
  )
}