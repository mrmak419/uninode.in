import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

let isInitialLoad = true

export default function TabTitle({ title, description }) {
  const location = useLocation()

  useEffect(() => {
    // Update the Canonical Link (runs even on initial load)
    const cleanUrl = `https://kcet.uninode.in${location.pathname}`
    let canonicalTag = document.querySelector('link[rel="canonical"]')
    if (canonicalTag) {
      canonicalTag.setAttribute('href', cleanUrl)
    } else {
      canonicalTag = document.createElement('link')
      canonicalTag.rel = 'canonical'
      canonicalTag.href = cleanUrl
      document.head.appendChild(canonicalTag)
    }

    if (isInitialLoad) {
      isInitialLoad = false
      return // Skip initial hydration for title/description to preserve Edge Worker SEO metadata
    }
    
    // Update the document title
    if (title) {
      document.title = title
    }
    
    // Update the meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', description)
      } else {
        metaDescription = document.createElement('meta')
        metaDescription.name = 'description'
        metaDescription.content = description
        document.head.appendChild(metaDescription)
      }
    }
  }, [title, description, location.pathname])

  return null
}
