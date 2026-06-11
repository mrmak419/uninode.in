import { useEffect } from 'react'

export default function TabTitle({ title, description }) {
  useEffect(() => {
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
  }, [title, description])

  return null
}
