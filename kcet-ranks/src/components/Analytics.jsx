import { useEffect } from 'react'

export default function Analytics() {
  useEffect(() => {
    const trackingId = import.meta.env.VITE_GA_TRACKING_ID
    if (!trackingId) return

    // Prevent adding the script multiple times
    if (document.getElementById('google-analytics')) return

    // Inject the gtag script
    const script = document.createElement('script')
    script.id = 'google-analytics'
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`
    script.async = true
    document.head.appendChild(script)

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', trackingId)
  }, [])

  return null
}
