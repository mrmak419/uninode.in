import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-gray-200 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Page not found</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition-all text-sm"
          >
            Go Home
          </Link>
          <Link
            to="/articles/engineering"
            className="px-6 py-2.5 bg-white text-gray-700 font-bold rounded-lg shadow border border-gray-200 hover:bg-gray-50 transition-all text-sm"
          >
            Browse Articles
          </Link>
        </div>
      </div>
    </div>
  )
}
