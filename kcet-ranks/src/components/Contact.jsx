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
              If you found a bug, have a feature request, spotted a data error, or just want to say hi, feel free to connect with us on LinkedIn!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="https://www.linkedin.com/in/mrmak/" target="_blank" rel="noreferrer" className="flex items-center justify-center sm:justify-start gap-3 text-blue-700 hover:text-blue-900 font-medium bg-blue-50/50 hover:bg-blue-100/50 p-3 rounded-xl transition-colors border border-blue-100 flex-1">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                Connect with Ayaan
              </a>
              <a href="https://www.linkedin.com/in/ishreyasv/" target="_blank" rel="noreferrer" className="flex items-center justify-center sm:justify-start gap-3 text-blue-700 hover:text-blue-900 font-medium bg-blue-50/50 hover:bg-blue-100/50 p-3 rounded-xl transition-colors border border-blue-100 flex-1">
                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                Connect with Shreyas
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
