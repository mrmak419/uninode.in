import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-6 py-4 border-t border-border bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 text-center text-muted text-xs font-body flex flex-col items-center space-y-2">
        
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <Link to="/gear" className="text-indigo-600 hover:text-indigo-800 transition-colors font-medium underline">Student Essentials</Link>
          <span className="hidden sm:inline text-border">•</span>
          <Link to="/privacy-policy" className="hover:text-ink transition-colors underline">Privacy Policy</Link>
          <span className="hidden sm:inline text-border">•</span>
          <Link to="/terms-of-service" className="hover:text-ink transition-colors underline">Terms of Service</Link>
        </div>

        <div className="space-y-1">
          <p>Cut-off ranks are from previous counselling rounds and are for reference only.</p>
          <p>Always verify on the official <a href="https://cetonline.karnataka.gov.in" target="_blank" rel="noreferrer" className="underline hover:text-ink">KEA website</a>.</p>
        </div>
      </div>
    </footer>
  )
}
