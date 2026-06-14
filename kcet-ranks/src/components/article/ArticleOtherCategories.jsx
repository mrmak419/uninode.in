import { Link } from 'react-router-dom'
import { Tag } from 'lucide-react'

export default function ArticleOtherCategories({ stream, college, branch, currentCategory, collegeDataObj, articleData }) {
  if (!collegeDataObj || !collegeDataObj.cutoffs || !articleData) return null;

  const otherCategories = collegeDataObj.cutoffs
    .filter(r => {
      if (r.course_name !== articleData.course_name) return false;
      if (r.category === currentCategory) return false;
      // Ensure the category has at least one valid historical rank
      const hasValidRank = r.rounds && Object.values(r.rounds).some(val => val !== null && val !== undefined && val !== '--');
      return hasValidRank;
    })
    .map(r => r.category);

  const uniqueCategories = [...new Set(otherCategories)].sort();

  if (uniqueCategories.length === 0) return null;

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5 text-blue-600" />
        View Cutoffs for Other Categories
      </h3>
      <div className="flex flex-wrap gap-2">
        {uniqueCategories.map(cat => (
          <Link
            key={cat}
            to={`/articles/${stream}/${encodeURIComponent(college)}/${encodeURIComponent(branch)}/${encodeURIComponent(cat)}`}
            className="px-4 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-sm font-semibold text-gray-700 hover:text-blue-700 rounded-lg transition-colors"
          >
            {cat}
          </Link>
        ))}
      </div>
    </div>
  )
}
