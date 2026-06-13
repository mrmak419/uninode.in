import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

export default function Sidebar({ onClose }) {
  const [streams, setStreams] = useState([])
  const location = useLocation()

  useEffect(() => {
    fetch('/streams.json')
      .then(res => res.json())
      .then(data => setStreams(data))
      .catch(err => console.error("Failed to load streams index:", err))
  }, [])

  return (
    <div className="flex flex-col h-full bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-6 border-b border-border shrink-0">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={onClose}>
          <img src="/logo.png" alt="KCET Logo" className="w-10 h-10 rounded-lg shadow-sm shrink-0" />
          <span className="font-display font-bold text-ink text-sm tracking-tight leading-tight">Uninode KCET Cutoff Analyzer</span>
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
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${location.pathname === '/' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-gray-100 hover:text-ink'}
          `}
        >
          Home
        </Link>
        
        <Link
          to="/articles"
          onClick={() => {
            if (window.innerWidth < 1024) onClose()
          }}
          className={`
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2
            ${location.pathname === '/articles' ? 'bg-ink text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'}
          `}
        >
          Articles
        </Link>
        
        <Link
          to="/gear"
          onClick={() => {
            if (window.innerWidth < 1024) onClose()
          }}
          className={`
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-4
            ${location.pathname.startsWith('/gear') ? 'bg-accent text-white shadow-sm' : 'text-orange-600 hover:bg-orange-50'}
          `}
        >
          Student Essentials
        </Link>
        
        {streams.map(s => {
          const streamId = typeof s === 'string' ? s : s.id;
          const displayName = streamId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const isActive = location.pathname === `/${streamId}`;
          
          return (
            <Link
              key={streamId}
              to={`/${streamId}`}
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
      
      {/* Footer */}
      <div className="px-4 py-4 border-t border-border mt-auto shrink-0 text-center text-xs text-muted">
        <p>Made with ❤️ by Ayaan and Shreyas</p>
      </div>
    </div>
  )
}
