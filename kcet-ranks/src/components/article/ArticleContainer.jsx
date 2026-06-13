import { useState, useEffect, useContext } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Menu } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { SidebarContext } from '../Layout'

import ArchiveGrid from './ArchiveGrid'
import ArticleHeader from './ArticleHeader'
import ArticleMatrixTable from './ArticleMatrixTable'
import ArticleNarrative from './ArticleNarrative'
import ArticleCTABlocks from './ArticleCTABlocks'
import ArticleFAQ from './ArticleFAQ'
import ArticleSuggestions from './ArticleSuggestions'
import Footer from '../Footer'

const articleCache = {}

const TopNavigation = () => {
  const { toggleSidebar } = useContext(SidebarContext)
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center gap-2 text-left mb-2">
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-200 transition-colors"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="font-display font-bold text-xl tracking-tight text-gray-900 flex items-center">
            Uninode<span className="text-blue-600 ml-1">KCET</span>
          </Link>
      </div>
    </div>
  )
}

export default function ArticleContainer() {
  const { stream: streamParam, college, branch, category } = useParams()
  const stream = streamParam || 'engineering'
  const seatType = 'ROK' // Hardcoded since we only support ROK in articles right now

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [articleData, setArticleData] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (college && branch && category) {
      loadArticle()
    } else {
      // Archive mode
      setLoading(false)
    }
  }, [college, branch, category, stream])

  async function loadArticle() {
    try {
      setLoading(true)
      
      const res = await fetch(`/meta_${stream}.json`)
      if (!res.ok) throw new Error("Metadata not found")
      const meta = await res.json()
      
      const bQuery = branch.toLowerCase()
      const matchingRawNames = meta.branches.filter(b => {
        const pName = b.parent_branches?.name?.toLowerCase()
        const pAlias = b.parent_branches?.alias?.toLowerCase()
        return bQuery === pName || bQuery === pAlias || bQuery === b.raw_name?.toLowerCase()
      }).map(b => b.raw_name)

      if (matchingRawNames.length === 0) {
        setError("Article Not Found")
        setLoading(false)
        return
      }

      const cacheKey = `${stream}_${college}_${branch}_${category}_${seatType}`
      if (articleCache[cacheKey]) {
        setArticleData(articleCache[cacheKey])
        setLoading(false)
        return
      }

      let allData = [];
      if (meta.numChunks && meta.numChunks > 0) {
        const fetchPromises = [];
        for (let i = 0; i < meta.numChunks; i++) {
          fetchPromises.push(
            fetch(`/data_${stream}_${i}.json`)
              .then(r => r.ok ? r.json() : [])
          );
        }
        const chunkResults = await Promise.all(fetchPromises);
        allData = chunkResults.flat();
      } else {
        const dataRes = await fetch(`/data_${stream}.json`);
        if (!dataRes.ok) throw new Error("Data not found");
        allData = await dataRes.json();
      }

      const matchedRow = allData.find(r => 
        r.category === category && 
        matchingRawNames.includes(r.course_name) && 
        r.college_name.toLowerCase().includes(college.toLowerCase())
      )

      if (!matchedRow) {
        setError("Article Not Found")
        setLoading(false)
        return
      }

      articleCache[cacheKey] = matchedRow
      setArticleData(matchedRow)
      
    } catch (err) {
      setError("Article Not Found")
    } finally {
      setLoading(false)
    }
  }

    // Render Archive if no specific college/branch requested
    if (!college || !branch || !category) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center w-full">
          <TopNavigation />
          <ArchiveGrid stream={stream} />
        </div>
      )
    }
  
    // Render Loading/Error states for Single Article
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center w-full">
          <TopNavigation />
          <main className="max-w-4xl mx-auto px-4 py-16 text-center w-full">
            <div className="text-xl text-muted font-body animate-pulse">Loading analysis...</div>
          </main>
        </div>
      )
    }
  
    if (error || !articleData) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center w-full">
          <TopNavigation />
          <main className="max-w-4xl mx-auto px-4 py-16 text-center w-full">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Content Not Found</h1>
            <p className="text-gray-600 mb-8">{error || "The cutoff data you're looking for isn't available or couldn't be loaded."}</p>
            <button onClick={() => window.history.back()} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">
              Go Back
            </button>
          </main>
        </div>
      )
    }

  // --- Parse Data for Single Article Subcomponents ---
  const rawRounds = articleData.rounds || {};
  const rounds = {};
  Object.keys(rawRounds).forEach(key => {
     const [yStr, rStr] = key.split('_R');
     const year = Number(yStr);
     const roundNum = Number(rStr);
     const val = rawRounds[key];
     
     if (!isNaN(year) && !isNaN(roundNum)) {
       if (!rounds[year]) rounds[year] = {};
       rounds[year][roundNum] = val;
     }
  });

  const years = Object.keys(rounds).map(Number).sort((a,b) => a - b);
  const topYears = years.slice(-3);
  const cleanCollege = articleData.college_name.split('(')[0].split(',')[0].trim();

  const formattedStream = stream.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  if (topYears.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center w-full">
        <TopNavigation />
        <main className="w-full max-w-4xl mx-auto px-4 py-8 overflow-hidden">
          <div className="mb-6">
            <Link to={`/articles/${stream}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors uppercase tracking-wider">
              <ArrowLeft size={16} /> Back to {formattedStream} Articles
            </Link>
          </div>
          <ArticleHeader cleanCollege={cleanCollege} branch={branch} category={category} topYears={topYears} articleData={articleData} seatType={seatType} />
          <p className="text-gray-700 leading-relaxed mt-6">No historical data available for this specific combination.</p>
        </main>
      </div>
    )
  }

  const latestYear = topYears[topYears.length - 1];
  const prevYear = topYears.length > 1 ? topYears[topYears.length - 2] : null;

  const latestRounds = Object.keys(rounds[latestYear] || {})
    .map(Number)
    .filter(r => rounds[latestYear][r] !== null && rounds[latestYear][r] !== undefined && rounds[latestYear][r] !== '--')
    .sort((a,b) => a - b);
    
  const latestRoundRank = latestRounds.length > 0 ? rounds[latestYear][latestRounds[latestRounds.length - 1]] : null;
  const firstRoundRank = latestRounds.length > 0 ? rounds[latestYear][latestRounds[0]] : null;
  const hasDropHistory = latestRounds.length > 1 && latestRoundRank > firstRoundRank;

  const sortedYearsDescending = [...years].sort((a,b) => b - a);
  let uniqueRoundsSet = new Set();
  years.forEach(y => {
    Object.keys(rounds[y] || {}).forEach(r => uniqueRoundsSet.add(Number(r)));
  });
  const uniqueRounds = Array.from(uniqueRoundsSet).sort((a,b) => a - b);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center w-full">
      <TopNavigation />
      <main className="w-full max-w-4xl mx-auto px-4 py-8 overflow-hidden">
        <div className="mb-6">
          <Link to={`/articles/${stream}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors uppercase tracking-wider">
            <ArrowLeft size={16} /> Back to {formattedStream} Articles
          </Link>
        </div>
      <div className="space-y-6">
        <ArticleHeader 
          cleanCollege={cleanCollege} 
          branch={branch} 
          category={category} 
          topYears={topYears} 
          articleData={articleData} 
          seatType={seatType} 
        />
        
        <ArticleMatrixTable 
          uniqueRounds={uniqueRounds} 
          sortedYearsDescending={sortedYearsDescending} 
          rounds={rounds} 
        />
        
        <ArticleNarrative 
          branch={branch}
          cleanCollege={cleanCollege}
          category={category}
          latestYear={latestYear}
          latestRoundRank={latestRoundRank}
          prevYear={prevYear}
          firstRoundRank={firstRoundRank}
          rounds={rounds}
        />
        
        <ArticleFAQ 
          branch={branch}
          cleanCollege={cleanCollege}
          category={category}
          latestYear={latestYear}
          firstRoundRank={firstRoundRank}
          latestRoundRank={latestRoundRank}
          prevYear={prevYear}
          rounds={rounds}
          hasDropHistory={hasDropHistory}
          topYears={topYears}
          latestRounds={latestRounds}
        />
        
        <ArticleCTABlocks 
          stream={stream}
          branch={branch}
          category={category}
          cleanCollege={cleanCollege}
        />
        
        <ArticleSuggestions 
          stream={stream}
          articleData={articleData}
          category={category}
          latestRoundRank={latestRoundRank}
        />
      </div>
      <Footer />
    </main>
    </div>
  )
}
