import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminApp() {
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

  // Basic routing based on path
  const path = window.location.pathname
  const isCategoriesTab = path.endsWith('/categories')

  return (
    <div className="min-h-screen bg-paper p-6 relative">
      <div className="absolute top-6 right-6 flex gap-3">
        <a 
          href={isCategoriesTab ? "/system/hq/portal/admin/secure/99x/mak" : "/system/hq/portal/admin/secure/99x/mak/categories"} 
          target="_blank" rel="noreferrer"
          className="text-xs font-semibold px-3 py-1.5 bg-ink text-paper rounded hover:bg-accent transition-colors"
        >
          {isCategoriesTab ? "Open Mapping Matrix ↗" : "Open Categories ↗"}
        </a>
        <button onClick={() => supabase.auth.signOut()} className="text-xs font-semibold px-3 py-1.5 bg-white border border-border rounded hover:bg-gray-50 transition-colors">
          Sign Out
        </button>
      </div>

      <div className="max-w-7xl mx-auto mt-12">
        {isCategoriesTab ? <CategoriesManager /> : <BranchMapping />}
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
        <h1 className="text-2xl font-display text-ink mb-6 text-center">Admin Access</h1>
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

// ── Searchable Dropdown Component ───────────────────────────────────────────

function SearchableSelect({ options, valueId, onSelect, disabled, placeholder, table, hasAlias, onAdded }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  const selectedOption = options.find(o => o.id === valueId)
  
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleCreateNew() {
    if (!query.trim() || !table) return
    const name = query.trim()
    const payload = { name }

    const { data, error } = await supabase.from(table).insert([payload]).select().single()
    if (error) {
      alert(error.message)
    } else {
      if (onAdded) await onAdded()
      onSelect(data.id)
      setOpen(false)
      setQuery('')
    }
  }

  const displayValue = open ? query : (selectedOption ? selectedOption.name : '')
  const filteredOptions = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
  const exactMatchExists = options.some(o => o.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        disabled={disabled}
        placeholder={selectedOption ? selectedOption.name : placeholder}
        value={displayValue}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onClick={() => setOpen(true)}
        className="w-full p-1.5 border border-border rounded text-xs focus:ring-1 focus:ring-accent bg-white disabled:opacity-50 disabled:bg-gray-50 placeholder:text-ink/80"
      />
      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted">No matches</div>
          ) : (
            filteredOptions.map(o => (
              <div 
                key={o.id}
                onClick={() => { onSelect(o.id); setOpen(false); setQuery('') }}
                className="px-3 py-2 text-xs hover:bg-accent/10 cursor-pointer text-ink font-medium border-b border-border/30 last:border-0"
              >
                {o.name}
              </div>
            ))
          )}
          {query.trim() && !exactMatchExists && table && (
            <div 
              onClick={handleCreateNew}
              className="px-3 py-2 text-xs bg-amber-50 hover:bg-amber-100 cursor-pointer text-amber-900 font-bold border-t border-amber-200"
            >
              + Create & Map "{query.trim()}"
            </div>
          )}
          {valueId && (
            <div 
              onClick={() => { onSelect(null); setOpen(false); setQuery('') }}
              className="px-3 py-2 text-xs hover:bg-red-50 text-red-600 cursor-pointer font-semibold border-t border-border"
            >
              Clear Selection
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Manage Categories Screen ────────────────────────────────────────────────

function CategoriesManager() {
  return (
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      <CategoryEditor table="parent_branches" title="Parent Branches" placeholder="e.g. Computer Science" hasAlias={true} />
      <CategoryEditor table="specialisations" title="Specializations" placeholder="e.g. AI/ML" />
    </div>
  )
}

function CategoryEditor({ table, title, placeholder, hasAlias }) {
  const [items, setItems] = useState([])
  const [newName, setNewName] = useState('')
  const [newAlias, setNewAlias] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data } = await supabase.from(table).select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    
    const payload = { name: newName.trim() }
    if (hasAlias && newAlias.trim()) {
      payload.alias = newAlias.trim().toUpperCase()
    }

    const { error } = await supabase.from(table).insert([payload])
    if (!error) {
      setNewName('')
      setNewAlias('')
      loadItems()
    } else {
      alert(error.message)
    }
  }

  async function handleEditAlias(id, currentName, currentAlias) {
    const input = prompt(`Enter new alias for ${currentName} (leave blank to remove alias)`, currentAlias || '')
    if (input === null) return // cancelled
    
    const newVal = input.trim() ? input.trim().toUpperCase() : null
    
    const { error } = await supabase.from(table).update({ alias: newVal }).eq('id', id)
    if (error) alert(error.message)
    else loadItems()
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure? This might break mapped branches.')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) alert(error.message)
    else loadItems()
  }

  return (
    <div className="bg-white p-6 border border-border rounded-xl shadow-sm">
      <h2 className="text-lg font-bold text-ink mb-4">{title}</h2>
      
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={placeholder}
               className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-accent" />
        {hasAlias && (
          <input type="text" value={newAlias} onChange={e => setNewAlias(e.target.value.toUpperCase())} placeholder="Alias (e.g. CSE)"
                 className="w-28 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-accent uppercase" />
        )}
        <button type="submit" className="px-4 py-2 bg-accent text-paper text-sm font-semibold rounded-lg hover:bg-ink transition-colors">
          Add
        </button>
      </form>

      {loading ? <div className="text-sm text-muted">Loading...</div> : (
        <ul className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center justify-between py-2 px-3 bg-paper border border-border rounded-lg text-sm hover:border-accent transition-colors">
              <span className="font-medium text-ink">
                <span className="text-muted mr-2 font-mono text-xs">{index + 1}.</span>
                {item.name}
                {item.alias && <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-mono">{item.alias}</span>}
              </span>
              <div className="flex items-center gap-3">
                {hasAlias && (
                  <button onClick={() => handleEditAlias(item.id, item.name, item.alias)} className="text-accent hover:text-ink text-xs font-semibold">
                    {item.alias ? 'Edit Alias' : 'Add Alias'}
                  </button>
                )}
                <button onClick={() => handleDelete(item.id)} className="text-miss hover:text-red-700 text-xs font-semibold">Delete</button>
              </div>
            </li>
          ))}
          {items.length === 0 && <li className="text-sm text-muted">No entries yet.</li>}
        </ul>
      )}
    </div>
  )
}

// ── Branch Mapping Screen ───────────────────────────────────────────────────

function InlineAdder({ table, placeholder, onAdded, hasAlias, existingItems = [] }) {
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  
  const searchName = name.trim().toLowerCase()
  const exactMatch = searchName && existingItems.find(i => i.name.toLowerCase() === searchName)
  const similarMatches = searchName.length > 2 && !exactMatch 
    ? existingItems.filter(i => i.name.toLowerCase().includes(searchName)).slice(0, 2)
    : []

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim() || exactMatch) return
    const payload = { name: name.trim() }
    if (hasAlias && alias.trim()) payload.alias = alias.trim().toUpperCase()

    const { error } = await supabase.from(table).insert([payload])
    if (error) alert(error.message)
    else {
      setName('')
      setAlias('')
      onAdded()
    }
  }

  return (
    <div className="flex flex-col relative z-50">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={placeholder}
               className={`w-48 px-2 py-1.5 text-xs border rounded focus:outline-none focus:border-accent ${exactMatch ? 'border-red-400 bg-red-50' : 'border-border bg-white'}`} />
        {hasAlias && (
          <input type="text" value={alias} onChange={e => setAlias(e.target.value.toUpperCase())} placeholder="Alias"
                 className="w-16 px-2 py-1.5 text-xs border border-border bg-white rounded focus:outline-none focus:border-accent uppercase" />
        )}
        <button type="submit" disabled={!!exactMatch} className="px-3 py-1.5 bg-ink text-paper text-xs font-semibold rounded hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Add
        </button>
      </form>
      {exactMatch && (
        <span className="absolute top-full mt-1 left-1 text-[10px] font-semibold text-red-600 truncate max-w-[200px]">
          Already exists
        </span>
      )}
      {similarMatches.length > 0 && (
        <span className="absolute top-full mt-1 left-1 text-[10px] text-muted truncate max-w-[200px]">
          Similar: {similarMatches.map(m => m.name).join(', ')}
        </span>
      )}
    </div>
  )
}

function BranchMapping() {
  const [branches, setBranches] = useState([])
  const [parents, setParents] = useState([])
  const [specs, setSpecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => { loadAll() }, [])

  function loadAll() {
    Promise.all([
      supabase.from('branches').select('*').order('raw_name'),
      supabase.from('parent_branches').select('*').order('name'),
      supabase.from('specialisations').select('*').order('name'),
    ]).then(([bRes, pRes, sRes]) => {
      setBranches(bRes.data || [])
      setParents(pRes.data || [])
      setSpecs(sRes.data || [])
      setLoading(false)
    })
  }

  function loadParents() {
    supabase.from('parent_branches').select('*').order('name').then(res => setParents(res.data || []))
  }

  function loadSpecs() {
    supabase.from('specialisations').select('*').order('name').then(res => setSpecs(res.data || []))
  }

  async function saveMapping(id, field, valueId) {
    setSavingId(id)
    const updates = { [field]: valueId }
    const { error } = await supabase.from('branches').update(updates).eq('id', id)
    if (error) alert(error.message)
    else {
      setBranches(branches.map(b => b.id === id ? { ...b, ...updates } : b))
    }
    setSavingId(null)
  }

  if (loading) return <div className="text-center py-12 text-muted">Loading massive branch matrix...</div>

  const unmappedCount = branches.filter(b => !b.parent_id).length

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-visible pb-32 relative">
      <div className="sticky top-0 z-30 bg-[#fafaf7] px-4 py-4 border-b border-border flex flex-col gap-4 xl:flex-row justify-between items-start xl:items-center shadow-sm">
        <div>
          <span className="text-sm font-semibold text-ink block">Raw Branches ({branches.length})</span>
          <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200 mt-2 inline-block">
            {unmappedCount} Unmapped
          </span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted font-medium">Quick Add Parent Branch:</span>
            <InlineAdder table="parent_branches" placeholder="e.g. Computer Science" onAdded={loadParents} hasAlias={true} existingItems={parents} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted font-medium">Quick Add Specialization:</span>
            <InlineAdder table="specialisations" placeholder="e.g. AI/ML" onAdded={loadSpecs} existingItems={specs} />
          </div>
        </div>
      </div>
      
      <div className="overflow-visible">
        <table className="w-full text-sm text-left">
          <thead className="sticky top-[104px] z-20 bg-[#fafaf7] text-xs uppercase tracking-wider text-muted border-b border-border/50 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-semibold bg-[#fafaf7] w-12 text-center">#</th>
              <th className="px-4 py-3 font-semibold bg-[#fafaf7]">Raw Branch Name</th>
              <th className="px-4 py-3 font-semibold w-72 bg-[#fafaf7]">Parent Branch</th>
              <th className="px-4 py-3 font-semibold w-72 bg-[#fafaf7]">Specialization</th>
              <th className="px-4 py-3 font-semibold w-24 text-center bg-[#fafaf7]">Status</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b, index) => (
              <tr key={b.id} className="border-b border-border/30 hover:bg-amber-50/30 transition-colors">
                <td className="px-4 py-3 text-muted text-xs text-center font-mono">{index + 1}</td>
                <td className="px-4 py-3 font-medium text-ink">{b.raw_name}</td>
                <td className="px-4 py-2">
                  <SearchableSelect 
                    options={parents} 
                    valueId={b.parent_id} 
                    onSelect={(val) => saveMapping(b.id, 'parent_id', val)}
                    disabled={savingId === b.id}
                    placeholder="-- Search Parent --"
                    table="parent_branches"
                    hasAlias={true}
                    onAdded={loadParents}
                  />
                </td>
                <td className="px-4 py-2">
                  <SearchableSelect 
                    options={specs} 
                    valueId={b.specialisation_id} 
                    onSelect={(val) => saveMapping(b.id, 'specialisation_id', val)}
                    disabled={savingId === b.id}
                    placeholder="-- Search Specialization --"
                    table="specialisations"
                    hasAlias={false}
                    onAdded={loadSpecs}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  {savingId === b.id ? (
                    <span className="text-[10px] text-accent uppercase tracking-wide font-bold animate-pulse">Saving...</span>
                  ) : b.parent_id ? (
                    <span className="text-[10px] text-green-600 uppercase tracking-wide font-bold">Mapped ✓</span>
                  ) : (
                    <span className="text-[10px] text-yellow-600 uppercase tracking-wide font-bold">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
