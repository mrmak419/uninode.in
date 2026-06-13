import { Link } from 'react-router-dom'

export default function LegalFooter() {
  return (
    <footer className="border-t border-border bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-4 text-center text-muted text-xs font-body">
         <Link to="/gear" className="text-indigo-600 hover:text-indigo-800 transition-colors font-medium underline">Student Essentials</Link>
         <span className="hidden sm:inline text-border">•</span>
         <Link to="/privacy-policy" className="hover:text-ink transition-colors underline">Privacy Policy</Link>
         <span className="hidden sm:inline text-border">•</span>
         <Link to="/terms-of-service" className="hover:text-ink transition-colors underline">Terms of Service</Link>
      </div>
    </footer>
  )
}
