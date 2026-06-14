import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function ArticleSuggestions({ stream, articleData, category, precomputedSuggestions }) {
  if (!articleData || !precomputedSuggestions) return null;

  const suggKey = `${articleData.course_name}|${category}|${articleData.seat_type || 'G'}`;
  const suggestionsObj = precomputedSuggestions[suggKey] || {};

  const prevItem = suggestionsObj.similarBranch;
  const nextItem = suggestionsObj.similarCollege;

  if (!prevItem && !nextItem) return null;

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
      {prevItem ? (
        <Link 
          to={`/articles/${stream}/${encodeURIComponent(prevItem.college)}/${encodeURIComponent(prevItem.branch)}/${encodeURIComponent(prevItem.category)}`}
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
          to={`/articles/${stream}/${encodeURIComponent(nextItem.college)}/${encodeURIComponent(nextItem.branch)}/${encodeURIComponent(nextItem.category)}`}
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
