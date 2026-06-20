import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import streams from '../streams.json'
import RazorpayButton from './RazorpayButton' // Ensure correct import path

export default function Sidebar({ onClose }) {
  const location = useLocation()

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
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-2
            ${location.pathname.startsWith('/gear') ? 'bg-accent text-white shadow-sm' : 'text-orange-600 hover:bg-orange-50'}
          `}
        >
          Student Essentials
        </Link>
        
        <Link
          to="/option-entry"
          onClick={() => {
            if (window.innerWidth < 1024) onClose()
          }}
          className={`
            block px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-4
            ${location.pathname === '/option-entry' ? 'bg-ink text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'}
          `}
        >
          Option entry generator
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
      <div className="px-4 py-4 border-t border-border mt-auto shrink-0 text-center flex flex-col gap-3">
        <RazorpayButton />
        <Link to="/contact" className="hover:text-ink text-xs text-muted transition-colors" onClick={() => { if (window.innerWidth < 1024) onClose() }}>
          Made with ❤️ by Ayaan and Shreyas
        </Link>
      </div>
    </div>
  )
}