import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ArticleSuggestions({ stream, articleData, category, latestRoundRank }) {
  const [suggestions, setSuggestions] = useState({ prev: null, next: null })
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    if (!articleData || !latestRoundRank) return

    async function getSuggestions() {
      setIsFetching(true)
      try {
        function getLatestRank(roundsObj) {
            if (!roundsObj) return null;
            let latestY = 0;
            let latestR = 0;
            let rank = null;
            for (const key of Object.keys(roundsObj)) {
                const [y, r] = key.split('_R').map(Number);
                if (!isNaN(y) && !isNaN(r)) {
                    if (y > latestY || (y === latestY && r > latestR)) {
                        latestY = y;
                        latestR = r;
                        rank = roundsObj[key];
                    }
                }
            }
            return rank;
        }

        // Find other branches in the same college
        const { data: sameCollegeData } = await supabase
          .from(`cutoffs_matrix_${stream}`)
          .select('course_name, rounds')
          .eq('college_name', articleData.college_name)
          .eq('category', category)
          .eq('seat_type', articleData.seat_type)
          .neq('course_name', articleData.course_name)
        
        let bestPrev = null;
        let minDiffPrev = Infinity;
        
        if (sameCollegeData) {
            sameCollegeData.forEach(row => {
                const r = getLatestRank(row.rounds);
                if (r) {
                    const diff = Math.abs(r - latestRoundRank);
                    if (diff < minDiffPrev) {
                        minDiffPrev = diff;
                        bestPrev = row;
                    }
                }
            })
        }

        // Find similar colleges for the same branch
        const { data: sameBranchData } = await supabase
          .from(`cutoffs_matrix_${stream}`)
          .select('college_name, rounds')
          .eq('course_name', articleData.course_name)
          .eq('category', category)
          .eq('seat_type', articleData.seat_type)
          .neq('college_name', articleData.college_name)
        
        let bestNext = null;
        let minDiffNext = Infinity;

        if (sameBranchData) {
            sameBranchData.forEach(row => {
                const r = getLatestRank(row.rounds);
                if (r) {
                    const diff = Math.abs(r - latestRoundRank);
                    if (diff < minDiffNext) {
                        minDiffNext = diff;
                        bestNext = row;
                    }
                }
            })
        }

        setSuggestions({ 
            prev: bestPrev ? { college: articleData.college_name, branch: bestPrev.course_name, category } : null, 
            next: bestNext ? { college: bestNext.college_name, branch: articleData.course_name, category } : null 
        })

      } catch (err) {
        console.error("Failed to load suggestions", err)
      } finally {
        setIsFetching(false)
      }
    }
    getSuggestions()
  }, [stream, articleData, category, latestRoundRank])

  if (isFetching) {
    return (
      <div className="mt-12 pt-8 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-28 bg-gray-100 rounded-xl animate-pulse w-full"></div>
        <div className="h-28 bg-gray-100 rounded-xl animate-pulse w-full"></div>
      </div>
    )
  }

  if (!suggestions.prev && !suggestions.next) return null

  const prevItem = suggestions.prev
  const nextItem = suggestions.next

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {prevItem ? (
        <Link 
          to={`/article?stream=${stream}&college=${encodeURIComponent(prevItem.college)}&branch=${encodeURIComponent(prevItem.branch)}&cat=${encodeURIComponent(prevItem.category)}`}
          className="group flex flex-col justify-center items-start p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
        >
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Similar Ranked Branch
          </span>
          <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-700 line-clamp-1">{prevItem.branch}</h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{prevItem.college.split('(')[0].split(',')[0]}</p>
        </Link>
      ) : <div />}

      {nextItem ? (
        <Link 
          to={`/article?stream=${stream}&college=${encodeURIComponent(nextItem.college)}&branch=${encodeURIComponent(nextItem.branch)}&cat=${encodeURIComponent(nextItem.category)}`}
          className="group flex flex-col justify-center items-end text-right p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
        >
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
            Similar Ranked College <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </span>
          <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-700 line-clamp-1">{nextItem.college.split('(')[0].split(',')[0]}</h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{nextItem.branch}</p>
        </Link>
      ) : <div />}
    </div>
  )
}
