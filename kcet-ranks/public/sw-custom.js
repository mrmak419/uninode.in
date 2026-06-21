// Custom Service Worker script to force-reload open tabs when updated.
// This ensures users running older cached code get the latest version immediately upon service worker activation.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          if (client.url) {
            client.navigate(client.url).catch(err => {
              console.error('[SW Custom] Error navigating client during activation:', err)
            })
          }
        })
      })
    })
  )
})
