import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import GearIcon, { ICONS } from '../components/gear/GearIcon.jsx'

export default function GearAdmin() {
  const [session, setSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoadingAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loadingAuth) return <div className="p-8 text-center text-muted">Checking authentication...</div>

  if (!session) {
    return <AdminLogin />
  }

  return (
    <div className="min-h-screen bg-paper p-6 relative">
      <div className="absolute top-6 right-6 flex gap-3">
        <a 
          href="/system/hq/portal/admin/secure/99x" 
          target="_blank" rel="noreferrer"
          className="text-xs font-semibold px-3 py-1.5 bg-ink text-paper rounded hover:bg-accent transition-colors"
        >
          Open Main Admin ↗
        </a>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-semibold px-3 py-1.5 bg-white border border-border rounded hover:bg-gray-50 transition-colors">
          Sign Out
        </button>
      </div>

      <div className="max-w-7xl mx-auto mt-12">
        <GearManager />
      </div>
    </div>
  )
}

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 border border-border rounded-2xl shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-display text-ink mb-6 text-center">Gear Admin</h1>
        {error && <div className="mb-4 p-3 bg-red-50 text-miss text-sm rounded-lg border border-red-100">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                   className="w-full px-3 py-2 border border-border rounded-lg text-ink focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                   className="w-full px-3 py-2 border border-border rounded-lg text-ink focus:outline-none focus:border-accent" />
          </div>
          <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-ink text-paper rounded-lg font-semibold mt-2 hover:bg-accent transition-colors disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </div>
      </form>
    </div>
  )
}

function GearManager() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Link Builder State
  const [rawUrl, setRawUrl] = useState('')
  const [fetchingAmazon, setFetchingAmazon] = useState(false)
  const [amazonError, setAmazonError] = useState(null)
  const [amazonSuccess, setAmazonSuccess] = useState(null)

  // Category Form
  const [catName, setCatName] = useState('')
  const [catSlug, setCatSlug] = useState('')
  const [catIcon, setCatIcon] = useState('')
  const [catSort, setCatSort] = useState(0)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [catError, setCatError] = useState(null)
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState(null)
  
  // Product Form
  const [prodName, setProdName] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodPriceHint, setProdPriceHint] = useState('')
  const [prodImage, setProdImage] = useState('')
  const [prodAffiliate, setProdAffiliate] = useState('')
  const [prodFeatured, setProdFeatured] = useState(false)
  const [prodSort, setProdSort] = useState(0)
  const [editingProductId, setEditingProductId] = useState(null)
  const [prodError, setProdError] = useState(null)
  const [confirmDeleteProdId, setConfirmDeleteProdId] = useState(null)

  // Auto-generate slug from name
  useEffect(() => {
    if (catName && !catSlug) {
      setCatSlug(catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    }
  }, [catName])

  // Extract ASIN from URL
  const extractAsin = (str) => {
    const match = str.match(/(?:dp|o|asin|product)\/(B[0-9A-Z]{9}|\d{9}(?:X|\d))/i);
    return match ? match[1] : str.trim(); // fallback to assume it's just the ASIN
  }

  async function handleAutoFetch(e) {
    e.preventDefault()
    if (!rawUrl) return
    setFetchingAmazon(true)
    setAmazonError(null)
    setAmazonSuccess(null)

    const asin = extractAsin(rawUrl)
    if (!asin || asin.length < 10) {
      setAmazonError('Could not find a valid ASIN in that URL.')
      setFetchingAmazon(false)
      return
    }

    try {
      const res = await fetch('/api/amazon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin })
      })

      let data;
      try {
        data = await res.json()
      } catch (e) {
        throw new Error('Backend returned an empty or invalid response. Are you running the Cloudflare Functions locally? (Try deploying to test!)')
      }

      if (!res.ok) {
        if (data?.fallbackUrl) {
          setProdAffiliate(data.fallbackUrl);
          throw new Error(`Amazon API locked: ${data.error}. BUT we successfully generated your Affiliate Link! It has been pasted in the box below. Just manually add the title and price.`);
        }
        throw new Error(data.error || 'Failed to fetch from Amazon')
      }

      setProdName(data.title || '')
      setProdImage(data.imageUrl || '')
      setProdPriceHint(data.priceHint || '')
      setProdAffiliate(data.affiliateUrl || '')
      
      setAmazonSuccess('Product data auto-filled successfully!')
    } catch (err) {
      setAmazonError(err.message)
    } finally {
      setFetchingAmazon(false)
    }
  }

  // Load Categories / Products
  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      loadProducts(selectedCategory.id)
    } else {
      setProducts([])
    }
    setConfirmDeleteProdId(null)
  }, [selectedCategory])

  async function loadCategories() {
    setLoading(true)
    const { data, error } = await supabase.from('gear_categories').select('*').order('sort_order', { ascending: true })
    if (error) console.error("Error loading categories", error)
    else setCategories(data || [])
    setLoading(false)
  }

  async function loadProducts(categoryId) {
    setLoading(true)
    const { data, error } = await supabase.from('gear_products').select('*').eq('category_id', categoryId).order('sort_order', { ascending: true })
    if (error) console.error("Error loading products", error)
    else setProducts(data || [])
    setLoading(false)
  }

  async function addCategory(e) {
    e.preventDefault()
    setSaving(true)
    setCatError(null)
    const categoryData = { name: catName, slug: catSlug, icon: catIcon, sort_order: parseInt(catSort) }
    
    if (editingCategoryId) {
      const { error } = await supabase.from('gear_categories').update(categoryData).eq('id', editingCategoryId)
      if (error) setCatError(error.message)
      else {
        resetCategoryForm()
        loadCategories()
      }
    } else {
      const { error } = await supabase.from('gear_categories').insert([categoryData])
      if (error) setCatError(error.message)
      else {
        resetCategoryForm()
        loadCategories()
      }
    }
    setSaving(false)
  }

  function resetCategoryForm() {
    setCatName(''); setCatSlug(''); setCatIcon(''); setCatSort(0); setEditingCategoryId(null);
    setCatError(null)
  }

  function editCategory(c) {
    setCatName(c.name); setCatSlug(c.slug); setCatIcon(c.icon); setCatSort(c.sort_order || 0);
    setEditingCategoryId(c.id);
    setCatError(null)
  }

  async function deleteCategory(id) {
    const { error } = await supabase.from('gear_categories').delete().eq('id', id)
    if (error) {
      setCatError(error.message)
    } else {
      if(selectedCategory?.id === id) setSelectedCategory(null)
      setConfirmDeleteCatId(null)
      loadCategories()
    }
  }

  async function addProduct(e) {
    e.preventDefault()
    if (!selectedCategory) return
    setSaving(true)
    setProdError(null)
    
    const productData = {
      category_id: selectedCategory.id,
      name: prodName, description: prodDesc, price_hint: prodPriceHint,
      image_url: prodImage, affiliate_url: prodAffiliate, is_featured: prodFeatured, sort_order: parseInt(prodSort)
    }

    if (editingProductId) {
      const { error } = await supabase.from('gear_products').update(productData).eq('id', editingProductId)
      if (error) setProdError(error.message)
      else {
        resetProductForm()
        loadProducts(selectedCategory.id)
      }
    } else {
      const { error } = await supabase.from('gear_products').insert([productData])
      if (error) setProdError(error.message)
      else {
        resetProductForm()
        loadProducts(selectedCategory.id)
      }
    }
    setSaving(false)
  }

  function resetProductForm() {
    setProdName(''); setProdDesc(''); setProdPriceHint(''); setProdImage(''); setProdAffiliate(''); setProdFeatured(false); setProdSort(0);
    setRawUrl('')
    setEditingProductId(null)
    setProdError(null)
  }

  function editProduct(p) {
    setProdName(p.name); setProdDesc(p.description || ''); setProdPriceHint(p.price_hint || ''); 
    setProdImage(p.image_url || ''); setProdAffiliate(p.affiliate_url || ''); 
    setProdFeatured(p.is_featured || false); setProdSort(p.sort_order || 0);
    setEditingProductId(p.id)
    setProdError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteProduct(id) {
    const { error } = await supabase.from('gear_products').delete().eq('id', id)
    if (error) {
      setProdError(error.message)
    } else {
      setConfirmDeleteProdId(null)
      loadProducts(selectedCategory.id)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* AUTO-FETCH BANNER */}
      <div className="bg-gradient-to-r from-ink to-blue-900 text-white rounded-xl p-5 shadow-sm">
        <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <GearIcon name="Plug" className="w-5 h-5 text-accent" />
          Auto-Fetch from Amazon
        </h2>
        <form onSubmit={handleAutoFetch} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">Raw Amazon URL or ASIN</label>
            <input 
              type="text" 
              placeholder="Paste regular Amazon link or ASIN here..." 
              value={rawUrl} 
              onChange={e => { setRawUrl(e.target.value); setAmazonError(null); setAmazonSuccess(null); }} 
              className="w-full px-3 py-2 border border-blue-800 bg-blue-950/50 rounded text-sm text-white focus:outline-none focus:border-accent" 
            />
          </div>
          <button 
            type="submit"
            disabled={fetchingAmazon || !rawUrl || !selectedCategory}
            className="whitespace-nowrap px-6 py-2 bg-accent text-white rounded text-sm font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fetchingAmazon ? 'Fetching...' : 'Auto-Fill Form'}
          </button>
        </form>
        {amazonError && (
          <div className="mt-4 text-sm text-red-300 font-semibold">{amazonError}</div>
        )}
        {amazonSuccess && (
          <div className="mt-4 text-sm text-green-300 font-semibold">{amazonSuccess}</div>
        )}
        {!selectedCategory && (
          <div className="mt-3 text-xs text-blue-300">Please select a Category from the list below before fetching.</div>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* LEFT: Categories */}
      <div className="w-1/3 bg-white border border-border rounded-xl p-5 shadow-sm">
        <h2 className="text-xl font-display font-bold text-ink mb-4">Categories</h2>
        
        {catError && (
          <div className="mb-4 p-3 bg-red-50 text-miss text-sm rounded-lg border border-red-100 flex justify-between items-center">
            <span>{catError}</span>
            <button type="button" onClick={() => setCatError(null)} className="font-bold text-red-700 hover:text-red-900">×</button>
          </div>
        )}

        <form onSubmit={addCategory} className="mb-6 space-y-3 bg-paper p-4 rounded-lg border border-border">
          <input type="text" placeholder="Category Name (e.g. Laptops)" value={catName} onChange={e => { setCatName(e.target.value); setCatError(null) }} required className="w-full px-3 py-2 border rounded text-sm" />
          <input type="text" placeholder="Slug (e.g. laptops)" value={catSlug} onChange={e => { setCatSlug(e.target.value); setCatError(null) }} required className="w-full px-3 py-2 border rounded text-sm" />
          
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Select an Icon</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.keys(ICONS).map(iconName => (
                <button 
                  key={iconName} type="button" 
                  onClick={() => { setCatIcon(iconName); setCatError(null) }}
                  className={`w-10 h-10 rounded flex items-center justify-center transition-colors border ${catIcon === iconName ? 'bg-accent text-white border-accent' : 'bg-white border-border hover:bg-gray-50'}`}
                  title={iconName}
                >
                  <GearIcon name={iconName} className="w-5 h-5" />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" placeholder="Custom Icon Name" value={catIcon} onChange={e => { setCatIcon(e.target.value); setCatError(null) }} className="w-1/2 px-3 py-2 border rounded text-sm" />
              <input type="number" placeholder="Sort Order" value={catSort} onChange={e => { setCatSort(e.target.value); setCatError(null) }} className="w-1/2 px-3 py-2 border rounded text-sm" />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-ink text-white py-2 rounded text-sm font-semibold hover:bg-accent disabled:opacity-50">
              {editingCategoryId ? 'Save Changes' : 'Add Category'}
            </button>
            {editingCategoryId && (
              <button type="button" onClick={resetCategoryForm} className="px-4 py-2 bg-white text-ink border border-border rounded text-sm font-semibold hover:bg-gray-50">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="space-y-2">
          {loading && !categories.length && <div className="text-sm text-muted">Loading...</div>}
          {categories.map(c => (
            <div key={c.id} 
                 className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${selectedCategory?.id === c.id ? 'border-accent bg-blue-50' : 'border-border hover:bg-paper'}`}
                 onClick={() => { setSelectedCategory(c); setCatError(null); }}>
              <div className="flex items-center gap-3">
                <span className="text-ink"><GearIcon name={c.icon} className="w-6 h-6" /></span>
                <div>
                  <div className="font-semibold text-ink text-sm">{c.name}</div>
                  <div className="text-xs text-muted">/{c.slug} (Sort: {c.sort_order})</div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={(e) => { e.stopPropagation(); editCategory(c); }} className="text-blue-500 hover:text-blue-700 text-xs font-semibold">Edit</button>
                {confirmDeleteCatId === c.id ? (
                  <div className="flex items-center gap-2 bg-red-50 px-2 py-0.5 rounded border border-red-200" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-bold text-miss">Sure?</span>
                    <button type="button" onClick={() => deleteCategory(c.id)} className="text-miss font-bold hover:underline text-xs">Yes</button>
                    <button type="button" onClick={() => setConfirmDeleteCatId(null)} className="text-muted font-bold hover:underline text-xs">No</button>
                  </div>
                ) : (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDeleteCatId(c.id); setCatError(null); }} className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Products */}
      <div className="w-2/3 bg-white border border-border rounded-xl p-5 shadow-sm">
        <h2 className="text-xl font-display font-bold text-ink mb-4">
          {selectedCategory ? `Products in "${selectedCategory.name}"` : 'Select a Category'}
        </h2>

        {prodError && (
          <div className="mb-4 p-3 bg-red-50 text-miss text-sm rounded-lg border border-red-100 flex justify-between items-center">
            <span>{prodError}</span>
            <button type="button" onClick={() => setProdError(null)} className="font-bold text-red-700 hover:text-red-900">×</button>
          </div>
        )}

        {selectedCategory ? (
          <>
            <form onSubmit={addProduct} className="mb-6 grid grid-cols-2 gap-3 bg-paper p-4 rounded-lg border border-border">
              <input type="text" placeholder="Product Name" value={prodName} onChange={e => { setProdName(e.target.value); setProdError(null) }} required className="col-span-2 px-3 py-2 border rounded text-sm" />
              <input type="text" placeholder="Description / Why recommend it?" value={prodDesc} onChange={e => { setProdDesc(e.target.value); setProdError(null) }} className="col-span-2 px-3 py-2 border rounded text-sm" />
              <input type="text" placeholder="Image URL (Amazon)" value={prodImage} onChange={e => { setProdImage(e.target.value); setProdError(null) }} required className="col-span-2 px-3 py-2 border rounded text-sm" />
              <input type="url" placeholder="Affiliate Link" value={prodAffiliate} onChange={e => { setProdAffiliate(e.target.value); setProdError(null) }} required className="col-span-2 px-3 py-2 border rounded text-sm" />
              <input type="text" placeholder="Price Hint (e.g. ₹50k)" value={prodPriceHint} onChange={e => { setProdPriceHint(e.target.value); setProdError(null) }} className="px-3 py-2 border rounded text-sm" />
              <input type="number" placeholder="Sort Order" value={prodSort} onChange={e => { setProdSort(e.target.value); setProdError(null) }} className="px-3 py-2 border rounded text-sm" />
              <label className="col-span-2 flex items-center gap-2 text-sm text-ink cursor-pointer p-2 border border-border rounded bg-white">
                <input type="checkbox" checked={prodFeatured} onChange={e => { setProdFeatured(e.target.checked); setProdError(null) }} className="w-4 h-4 text-accent" />
                Featured Product (Show at top)
              </label>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-ink text-white py-2 rounded text-sm font-semibold hover:bg-accent disabled:opacity-50">
                  {editingProductId ? 'Save Changes' : 'Add Product'}
                </button>
                {editingProductId && (
                  <button type="button" onClick={resetProductForm} className="px-4 py-2 bg-white text-ink border border-border rounded text-sm font-semibold hover:bg-gray-50">
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              {loading && categories.length > 0 && <div className="text-sm text-muted">Loading products...</div>}
              {products.length === 0 && !loading && <div className="text-sm text-muted text-center py-8">No products found. Add one above!</div>}
              {products.map(p => (
                <div key={p.id} className="flex gap-4 p-4 border border-border rounded-lg bg-white relative">
                  {p.is_featured && <div className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">FEATURED</div>}
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-24 h-24 object-contain rounded bg-white border border-border" />}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-ink">{p.name}</h3>
                      <div className="flex gap-3 shrink-0">
                        <button type="button" onClick={() => editProduct(p)} className="text-blue-500 hover:text-blue-700 text-xs font-semibold">Edit</button>
                        {confirmDeleteProdId === p.id ? (
                          <div className="flex items-center gap-2 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                            <span className="text-[10px] font-bold text-miss">Sure?</span>
                            <button type="button" onClick={() => deleteProduct(p.id)} className="text-miss font-bold hover:underline text-xs">Yes</button>
                            <button type="button" onClick={() => setConfirmDeleteProdId(null)} className="text-muted font-bold hover:underline text-xs">No</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => { setConfirmDeleteProdId(p.id); setProdError(null); }} className="text-red-500 hover:text-red-700 text-xs font-semibold">Delete</button>
                        )}
                      </div>
                    </div>
                    {p.price_hint && <div className="text-xs font-semibold text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded mt-1">{p.price_hint}</div>}
                    <p className="text-sm text-muted mt-2">{p.description}</p>
                    <div className="mt-3 text-xs text-muted flex gap-4">
                      <a href={p.affiliate_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">Test Affiliate Link ↗</a>
                      <span>Sort: {p.sort_order}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted text-sm border-2 border-dashed border-border rounded-lg">
            ← Click a category on the left to view and manage its products.
          </div>
        )}
      </div>
    </div>
  </div>
  )
}
