import { Link } from 'react-router-dom'

export default function LegalFooter() {
  return (
    <footer className="border-t border-border bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-center text-muted text-xs font-body">
         <Link to="/privacy-policy" className="hover:text-ink transition-colors underline">Privacy Policy</Link>
         <span className="hidden sm:inline text-border">•</span>
         <Link to="/terms-of-service" className="hover:text-ink transition-colors underline">Terms of Service</Link>
      </div>
    </footer>
  )
}
