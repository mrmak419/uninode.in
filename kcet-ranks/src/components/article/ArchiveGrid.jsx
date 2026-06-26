import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getArticleUrl } from '../../lib/url'

export default function ArchiveGrid({ examPrefix = 'kcet', stream }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [articleCombinations, setArticleCombinations] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const page = parseInt(searchParams.get('page')) || 1
  
  const handleSetPage = (newPage) => {
    setSearchParams(prev => {
      prev.set('page', newPage)
      return prev
    })
  }
  const perPage = 24
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatFilter, setSelectedCatFilter] = useState('All')
  const [allCategories, setAllCategories] = useState([])

  useEffect(() => {
    async function loadArchive() {
      try {
        setLoading(true)
        const res = await fetch(`/archive_${examPrefix}_${stream}.json`)
        if (!res.ok) throw new Error("Metadata not found")
        const data = await res.json()
        
        let combs = []
        if (data.articleCombinations && data.articleCombinations.length > 0) {
          // articleCombinations are typically "cCode::cName::b" (length 3). Appending "::GM" makes them length 4.
          combs = data.articleCombinations.map(c => `${c}::GM`)
        } else if (data.combinations) {
          // combinations are typically "cName::b" (length 2). Appending "::GM" makes them length 3.
          combs = data.combinations.map(c => `${c}::GM`)
        }
        
        setArticleCombinations(combs)
        
        const cats = new Set()
        combs.forEach(c => {
          const parts = c.split('::')
          let cat = '';
          if (parts.length === 5) {
            cat = parts[3];
          } else if (parts.length === 4) {
            cat = parts[3];
          } else {
            cat = parts[2];
          }
          if (cat) cats.add(cat)
        })
        setAllCategories(Array.from(cats).sort())
        
        // Do not reset page on initial load to preserve deep links
      } catch (err) {
        setError("Failed to load articles list.")
      } finally {
        setLoading(false)
      }
    }
    loadArchive()
  }, [stream])

  const filteredCombinations = useMemo(() => {
    return articleCombinations.filter(comb => {
       const parts = comb.split('::')
       let cCode, cName, b, cat;
       if (parts.length === 5) {
         [cCode, cName, b, cat] = parts;
       } else if (parts.length === 4) {
         [cCode, cName, b, cat] = parts;
       } else {
         [cName, b, cat] = parts;
         cCode = cName;
       }
       
       let effectiveCat = selectedCatFilter;
       let effectiveSearch = searchQuery.toLowerCase();

       if (effectiveCat !== 'All' && cat !== effectiveCat) return false;
       if (effectiveSearch) {
         if (!cName.toLowerCase().includes(effectiveSearch) && !b.toLowerCase().includes(effectiveSearch)) return false;
       }
       return true;
    })
  }, [articleCombinations, searchQuery, selectedCatFilter, stream])

  const totalPages = Math.ceil(filteredCombinations.length / perPage)
  const paginated = filteredCombinations.slice((page - 1) * perPage, page * perPage)

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-xl text-muted font-body animate-pulse">Loading archive...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-xl text-red-500 font-body">{error}</div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 capitalize">{stream} Cutoffs Archive</h1>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Search by college or branch..." 
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              handleSetPage(1)
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <select 
            value={selectedCatFilter}
            onChange={e => {
              setSelectedCatFilter(e.target.value)
              handleSetPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="All">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map(comb => {
          const parts = comb.split('::')
          let cCode, cName, b, cat, st;
          if (parts.length === 5) {
            [cCode, cName, b, cat, st] = parts;
          } else if (parts.length === 4) {
            [cCode, cName, b, cat] = parts;
          } else {
            [cName, b, cat, st] = parts;
            cCode = cName;
          }
          return (
              <Link 
                key={comb} 
                to={getArticleUrl(examPrefix, stream, cCode, b, cat)}
                className="group block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-md transition-all duration-200"
              >
              <h2 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 line-clamp-2">{cName}</h2>
              <p className="text-sm text-gray-600 font-medium line-clamp-1">{b}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {cat} {st && st !== 'G' ? `(${st})` : ''}
                </span>
                <span className="text-blue-600 text-xs font-bold uppercase tracking-wide group-hover:underline">Read Analysis &rarr;</span>
              </div>
            </Link>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-12 flex justify-center items-center space-x-4">
          <button 
            disabled={page === 1}
            onClick={() => handleSetPage(Math.max(1, page - 1))}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages}
            onClick={() => handleSetPage(Math.min(totalPages, page + 1))}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </main>
  )
}
