import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { SidebarContext } from './Layout.jsx'
import LegalFooter from './LegalFooter.jsx'

export default function Contact() {
  const { toggleSidebar } = useContext(SidebarContext)

  return (
    <div className="min-h-screen bg-paper flex flex-col">
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
              If you found a bug, have a feature request, spotted a data error, or just want to say hi, we'd love to hear from you.
            </p>
            <div className="flex flex-col gap-3">
              <a href="mailto:ayaan@myuvce.in" className="flex items-center gap-3 text-blue-600 hover:text-blue-800 font-medium bg-blue-50/50 p-3 rounded-xl transition-colors border border-blue-100">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ayaan@myuvce.in
              </a>
              <a href="mailto:shreyas.v@myuvce.in" className="flex items-center gap-3 text-blue-600 hover:text-blue-800 font-medium bg-blue-50/50 p-3 rounded-xl transition-colors border border-blue-100">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                shreyas.v@myuvce.in
              </a>
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
