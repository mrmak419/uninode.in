import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import examsData from '../exams.json'

export default function NotFound() {
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    // Check if we are in browser and serviceWorker is supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const pathKey = `checked_404_${window.location.pathname}`
      const hasRetried = sessionStorage.getItem(pathKey)
      if (!hasRetried) {
        setIsRetrying(true)
        sessionStorage.setItem(pathKey, 'true')

        // Unregister all service workers and clear caches to force latest code
        navigator.serviceWorker.getRegistrations().then(registrations => {
          const unregisterPromises = registrations.map(r => r.unregister())
          return Promise.all(unregisterPromises)
        }).catch(err => {
          console.error('Error unregistering service workers:', err)
        }).finally(() => {
          if ('caches' in window) {
            caches.keys().then(keys => {
              const deletePromises = keys.map(key => caches.delete(key))
              return Promise.all(deletePromises)
            }).catch(err => {
              console.error('Error clearing caches:', err)
            }).finally(() => {
              window.location.reload()
            })
          } else {
            window.location.reload()
          }
        })
      }
    }
  }, [])

  if (isRetrying) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 font-body">
        <div className="max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-ink mb-2">Checking for updates...</h2>
          <p className="text-muted text-sm">Please wait while we refresh the application.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 font-body">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-border mb-2">404</h1>
        <h2 className="text-2xl font-bold text-ink mb-3">Page not found</h2>
        <p className="text-muted mb-8 text-sm leading-relaxed">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-2.5 bg-ink text-paper font-bold rounded-lg shadow hover:bg-black transition-all text-sm flex items-center justify-center"
          >
            Go Home
          </Link>
          {examsData.map(exam => (
            <Link
              key={exam.id}
              to={`/${exam.id}`}
              className="px-6 py-2.5 bg-paper text-ink font-bold rounded-lg shadow border border-border hover:bg-black/5 transition-all text-sm flex items-center justify-center"
            >
              {exam.title || exam.id.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

