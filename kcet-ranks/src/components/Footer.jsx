import { Link } from 'react-router-dom'
import RazorpayButton from './RazorpayButton'

export default function Footer({ className = "" }) {
  return (
    <footer className={`mt-6 py-4 border-t border-border bg-gray-50/50 print:hidden ${className}`}>
      <div className="max-w-7xl mx-auto px-4 text-center text-muted text-xs font-body flex flex-col items-center space-y-4">
        
        {/* Buy Us a Chai Button */}
        <RazorpayButton />

        {/* Disclaimer Texts */}
        <div className="space-y-1">
          <p>Cut-off ranks are from previous counselling rounds and are for reference only.</p>
          <p>Always verify on the official <a href="https://cetonline.karnataka.gov.in" target="_blank" rel="noreferrer" className="underline hover:text-ink">KEA website</a>.</p>
        </div>
      </div>
    </footer>
  )
}