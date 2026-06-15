import { useState, useEffect, useContext } from 'react'
import { supabase } from '../../lib/supabase'
import GearIcon from './GearIcon.jsx'
import { Menu, ChevronDown, ChevronUp } from 'lucide-react'
import { SidebarContext } from '../Layout.jsx'

export default function GearIndex() {
  const [categories, setCategories] = useState([])
  const [productsByCat, setProductsByCat] = useState({})
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(new Set())
  const { toggleSidebar } = useContext(SidebarContext)

  useEffect(() => {
    async function fetchData() {
      const [catRes, prodRes] = await Promise.all([
        supabase.from('gear_categories').select('*').order('sort_order', { ascending: true }),
        supabase.from('gear_products').select('*').order('is_featured', { ascending: false }).order('sort_order', { ascending: true })
      ])
      
      if (!catRes.error && catRes.data) {
        setCategories(catRes.data)
      }
      
      if (!prodRes.error && prodRes.data) {
        const grouped = {}
        prodRes.data.forEach(p => {
          if (!grouped[p.category_id]) grouped[p.category_id] = []
          grouped[p.category_id].push(p)
        })
        setProductsByCat(grouped)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const toggleCategory = (id) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 min-h-screen">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-3">
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-ink hover:bg-gray-100 rounded-lg"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-ink tracking-tight">
            Student Essentials
          </h1>
        </div>
        <p className="text-muted text-lg max-w-2xl">
          Curated recommendations from students who've been there. From hostel must-haves to the best engineering laptops.
        </p>
      </div>

      {loading ? (
        <div className="space-y-12">
          {[1,2].map(cat => (
             <div key={cat}>
               <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                 {[1,2,3].map(i => (
                   <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
                 ))}
               </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="space-y-16">
          {categories.map(c => {
            const products = productsByCat[c.id] || []
            if (products.length === 0) return null; // Only show categories with products
            const isCollapsed = collapsed.has(c.id)

            return (
              <div key={c.id} className="scroll-mt-8" id={c.slug}>
                <div 
                  className="flex items-center justify-between mb-6 border-b border-border/50 pb-4 cursor-pointer group"
                  onClick={() => toggleCategory(c.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-ink"><GearIcon name={c.icon} className="w-8 h-8" /></span>
                    <h2 className="text-2xl font-display font-bold text-ink tracking-tight group-hover:text-accent transition-colors">{c.name}</h2>
                    <span className="text-sm font-medium text-muted bg-gray-100 px-2.5 py-1 rounded-full ml-2">{products.length}</span>
                  </div>
                  <button className="p-2 text-muted hover:bg-gray-100 rounded-full transition-colors">
                    {isCollapsed ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
                  </button>
                </div>
                
                {!isCollapsed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                    {products.map(p => (
                      <a 
                        key={p.id}
                        href={p.affiliate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex flex-col bg-white border border-border hover:border-accent p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden h-full"
                      >
                        {p.is_featured && (
                          <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm z-10">
                            Top Pick
                          </div>
                        )}
                        <div className="flex flex-col items-center justify-center mb-4 bg-paper rounded-xl p-4 h-48 shrink-0">
                          <img src={p.image_url} alt={p.name} className="max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="flex-1 flex flex-col">
                          <h3 className="font-bold text-ink text-lg mb-1 line-clamp-2">{p.name}</h3>
                          {p.price_hint && (
                            <div className="self-start inline-block bg-green-50 text-green-700 font-bold text-xs px-2.5 py-1 rounded-md mb-2">
                              {p.price_hint}
                            </div>
                          )}
                          <p className="text-muted text-sm line-clamp-3 mb-4 flex-1">{p.description}</p>
                          <div className="w-full bg-ink text-white text-center py-2.5 rounded-lg font-semibold group-hover:bg-accent transition-colors mt-auto text-sm">
                            View on Amazon
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {categories.length === 0 && (
            <div className="py-12 text-center text-muted border-2 border-dashed border-border rounded-2xl">
              We're stocking up the store! Check back soon for our recommendations.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
