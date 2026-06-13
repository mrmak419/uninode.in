import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import GearIcon from './GearIcon.jsx'
import { Menu } from 'lucide-react'
import { SidebarContext } from '../Layout.jsx'

export default function GearIndex() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const { toggleSidebar } = useContext(SidebarContext)

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('gear_categories')
        .select('*')
        .order('sort_order', { ascending: true })
      
      if (!error && data) {
        setCategories(data)
      }
      setLoading(false)
    }
    fetchCategories()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-ink hover:bg-gray-100 rounded-lg lg:hidden"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-ink tracking-tight">
            College Essentials Store
          </h1>
        </div>
        <p className="text-muted text-lg">
          Curated recommendations from students who've been there. From hostel must-haves to the best engineering laptops.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map(c => (
            <Link 
              key={c.id} 
              to={`/gear/${c.slug}`}
              className="group bg-white border border-border hover:border-accent p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center text-center"
            >
              <div className="text-ink mb-4 group-hover:scale-110 transition-transform"><GearIcon name={c.icon} className="w-12 h-12" /></div>
              <h2 className="font-bold text-ink text-xl">{c.name}</h2>
            </Link>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted border-2 border-dashed border-border rounded-2xl">
              We're stocking up the store! Check back soon for our recommendations.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
