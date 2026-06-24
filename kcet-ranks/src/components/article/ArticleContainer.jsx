import { useState, useEffect, useContext } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Menu } from 'lucide-react'
import { SidebarContext } from '../Layout'
import { slugify, normalizeCourse } from '../../lib/url'

import ArchiveGrid from './ArchiveGrid'
import ArticleHeader from './ArticleHeader'
import ArticleMatrixTable from './ArticleMatrixTable'
import ArticleNarrative from './ArticleNarrative'
import ArticleCTABlocks from './ArticleCTABlocks'
import ArticleFAQ from './ArticleFAQ'
import ArticleOtherCategories from './ArticleOtherCategories'
import ArticleSuggestions from './ArticleSuggestions'
import Footer from '../Footer'

const articleMetaCache = {}
const collegeDataCache = {}

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

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [articleData, setArticleData] = useState(null)
  const [collegeDataObj, setCollegeDataObj] = useState(null)

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
      
      let meta = articleMetaCache[stream];
      if (!meta) {
        const res = await fetch(`/meta_${stream}.json?v=${__BUILD_HASH__}`)
        if (!res.ok) throw new Error("Metadata not found")
        meta = await res.json()
        articleMetaCache[stream] = meta;
      }
      
      const bQuery = slugify(branch)
      const matchingRawNames = meta.branches.filter(b => {
        return bQuery === slugify(b.raw_name)
      }).map(b => b.raw_name)

      if (matchingRawNames.length === 0) {
        setError("Article Not Found")
        setLoading(false)
        return
      }

      // Find colleges by code or name
      const matchedColleges = meta.colleges.filter(c => 
        c.college_code.toLowerCase() === college.toLowerCase() ||
        c.college_name.toLowerCase().includes(college.toLowerCase())
      );
      if (matchedColleges.length === 0) {
        setError("College Not Found (Code mismatch)")
        setLoading(false);
        return;
      }
      
      let finalCollegeData = null;

      for (const colObj of matchedColleges) {
        const collegeCode = colObj.college_code;
        const collegeCacheKey = `${stream}_${collegeCode}`;

        if (collegeDataCache[collegeCacheKey]) {
           finalCollegeData = collegeDataCache[collegeCacheKey];
           break;
        }

        const collegeDataRes = await fetch(`/college_data/${stream}_${collegeCode}.json?v=${__BUILD_HASH__}`);
        
        if (collegeDataRes.ok) {
          finalCollegeData = await collegeDataRes.json();
          collegeDataCache[collegeCacheKey] = finalCollegeData;
          break; // Found it!
        }
      }

      if (!finalCollegeData) {
        setError("Article Not Found (College Data Fetch Error)")
        setLoading(false)
        return
      }

      const allData = finalCollegeData.cutoffs;
      const normalizedMatchingRawNames = matchingRawNames.map(name => normalizeCourse(name));
      const matchedRow = allData.find(r => 
        r.category?.toUpperCase() === category?.toUpperCase() && 
        normalizedMatchingRawNames.includes(normalizeCourse(r.course_name))
      );

      if (!matchedRow) {
        setError("Article Not Found (Row mismatch)")
        setLoading(false)
        return
      }

      setCollegeDataObj(finalCollegeData)
      setArticleData(matchedRow)
      
    } catch (err) {
      console.error("Article load error:", err);
      setError(`Article Not Found (Fetch Error: ${err.message})`)
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
          branch={articleData.course_name} 
          category={category} 
          topYears={topYears} 
          articleData={articleData} 
          seatType={articleData.seat_type} 
        />
        
        <ArticleMatrixTable 
          uniqueRounds={uniqueRounds} 
          sortedYearsDescending={sortedYearsDescending} 
          rounds={rounds} 
        />
        
        <ArticleNarrative 
          branch={articleData.course_name}
          cleanCollege={cleanCollege}
          category={category}
          latestYear={latestYear}
          latestRoundRank={latestRoundRank}
          prevYear={prevYear}
          firstRoundRank={firstRoundRank}
          rounds={rounds}
        />
        
        <ArticleFAQ 
          branch={articleData.course_name}
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
          branch={articleData.course_name}
          category={category}
          cleanCollege={cleanCollege}
          articleData={articleData}
        />

        <ArticleOtherCategories
          stream={stream}
          college={college}
          branch={articleData.course_name}
          currentCategory={category}
          collegeDataObj={collegeDataObj}
          articleData={articleData}
        />
        
        <ArticleSuggestions 
          stream={stream} 
          articleData={articleData} 
          category={category}
          latestRoundRank={latestRoundRank} 
          precomputedSuggestions={collegeDataObj?.suggestions}

        />
      </div>
      <Footer />
    </main>
    </div>
  )
}
