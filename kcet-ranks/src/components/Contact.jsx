import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { SidebarContext } from './Layout.jsx'
import LegalFooter from './LegalFooter.jsx'
import TabTitle from './TabTitle.jsx'

export default function Contact() {
  const { toggleSidebar } = useContext(SidebarContext)

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <TabTitle 
        title="Contact Us | Uninode KCET" 
        description="Get in touch with the student developers behind the Uninode KCET Cutoff Analyzer. We built this tool to help students navigate KCET counseling."
      />
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="mb-8 flex items-center justify-between border-b border-border/50 pb-6">
            <div className="flex items-center gap-2 text-left">
              <button 
                onClick={toggleSidebar}
                className="p-2 -ml-2 text-muted hover:text-ink rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Toggle Sidebar"
              >
                <Menu className="w-6 h-6" />
              </button>
              <Link to="/" className="font-display font-bold text-xl tracking-tight text-ink flex items-center hover:opacity-80 transition-opacity">
                Uninode<span className="text-blue-600 ml-1">KCET</span>
              </Link>
            </div>
            <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-lg">
                Back to Analyzer
            </Link>
        </div>

        <h1 className="text-3xl font-display font-bold text-ink mb-6">About & Contact</h1>
        
        <div className="prose prose-sm sm:prose-base prose-blue max-w-none text-ink space-y-6">
          <section className="bg-white border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold font-display mb-3">Why we built this</h2>
            <p className="text-muted leading-relaxed">
              We know exactly how chaotic KCET counseling is. We've been in your shoes, desperately scrolling through massive confusing PDFs trying to figure out which colleges we could actually get into with our ranks. We built this tool because we wanted a simple, instant way to see all our options without the headache. Built by students, for students. <br/><br/>
              <strong>Best of luck with your counseling!</strong>
            </p>
          </section>

          <section className="bg-white border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold font-display mb-4">Contact Us</h2>
            <p className="text-muted mb-4">
              If you found a bug, have a feature request, spotted a data error, or just want to say hi, feel free to connect with us on Instagram!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="https://instagram.com/uninode" target="_blank" rel="noreferrer" className="flex items-center justify-center sm:justify-start gap-3 text-pink-700 hover:text-pink-900 font-medium bg-pink-50/50 hover:bg-pink-100/50 p-3 rounded-xl transition-colors border border-pink-100 flex-1">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Connect on Instagram (@uninode)
              </a>
            </div>
            <div className="mt-5 pt-4 border-t border-border/50 text-sm text-muted text-center sm:text-left">
              Or email us directly at <a href="mailto:ayaan@myuvce.in" className="text-ink hover:underline font-medium">ayaan@myuvce.in</a> and <a href="mailto:shreyas.v@myuvce.in" className="text-ink hover:underline font-medium">shreyas.v@myuvce.in</a>
            </div>
          </section>

          <section className="bg-orange-50 border border-orange-200 p-6 rounded-2xl shadow-sm text-sm">
            <h2 className="text-lg font-bold font-display text-orange-900 mb-2">Disclaimer</h2>
            <p className="text-orange-800 leading-relaxed">
              We cannot provide personalized college counseling or guarantee admission. This tool uses historical data for reference and convenience only. Cutoffs fluctuate significantly every year based on exam difficulty, seat availability, and student preferences. <strong>Always verify with the official KEA website</strong>.
            </p>
          </section>
        </div>
      </main>
      <LegalFooter />
    </div>
  )
}