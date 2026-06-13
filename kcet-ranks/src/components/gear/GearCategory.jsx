import { useState, useEffect, useContext } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import GearIcon from './GearIcon.jsx'
import { Menu } from 'lucide-react'
import { SidebarContext } from '../Layout.jsx'

export default function GearCategory() {
  const { categorySlug } = useParams()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const { toggleSidebar } = useContext(SidebarContext)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      // 1. Get Category by slug
      const { data: catData, error: catError } = await supabase
        .from('gear_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single()
      
      if (catError || !catData) {
        setLoading(false)
        return
      }
      setCategory(catData)

      // 2. Get Products for this category
      const { data: prodData } = await supabase
        .from('gear_products')
        .select('*')
        .eq('category_id', catData.id)
        .order('is_featured', { ascending: false })
        .order('sort_order', { ascending: true })
      
      setProducts(prodData || [])
      setLoading(false)
    }

    fetchData()
  }, [categorySlug])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-ink hover:bg-gray-100 rounded-lg"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-12 w-64 bg-gray-200 rounded mb-8 animate-pulse"></div>
        <div className="space-y-6">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse"></div>)}
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center min-h-screen">
        <div className="flex items-center gap-3 mb-4 justify-center">
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-ink hover:bg-gray-100 rounded-lg absolute left-4"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-ink">Category not found</h1>
        </div>
        <Link to="/gear" className="text-accent hover:underline">← Back to Gear Store</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-ink hover:bg-gray-100 rounded-lg"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/gear" className="text-sm text-accent hover:underline font-semibold">
          ← Back to Categories
        </Link>
      </div>
      
      <div className="flex items-center gap-4 mb-8">
        <span className="text-ink"><GearIcon name={category.icon} className="w-12 h-12" /></span>
        <h1 className="text-3xl md:text-4xl font-display font-extrabold text-ink tracking-tight">
          {category.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {products.map(p => (
          <a 
            key={p.id}
            href={p.affiliate_url}
            target="_blank"
            rel="noreferrer"
            className="group block bg-white border border-border hover:border-accent p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all relative overflow-hidden"
          >
            {p.is_featured && (
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">
                TOP PICK
              </div>
            )}
            <div className="flex flex-col items-center mb-4 bg-paper rounded-xl p-4">
              <img src={p.image_url} alt={p.name} className="h-48 object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
            </div>
            <h2 className="font-bold text-ink text-xl mb-2 line-clamp-2">{p.name}</h2>
            {p.price_hint && (
              <div className="inline-block bg-green-50 text-green-700 font-bold text-sm px-3 py-1 rounded-full mb-3">
                {p.price_hint}
              </div>
            )}
            <p className="text-muted text-sm line-clamp-3 mb-4">{p.description}</p>
            <div className="w-full bg-ink text-white text-center py-2.5 rounded-lg font-semibold group-hover:bg-accent transition-colors">
              View on Amazon
            </div>
          </a>
        ))}
        
        {products.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted border-2 border-dashed border-border rounded-2xl">
            No products added yet. They are coming soon!
          </div>
        )}
      </div>
    </div>
  )
}
