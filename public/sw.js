const CACHE_NAME = 'pawmeet-public-shell-v1'
const STATIC_PATHS = ['/logo.png', '/manifest.webmanifest', '/favicon.ico', '/offline']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_PATHS)).catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  const isStatic = url.pathname.startsWith('/_next/static/') || STATIC_PATHS.includes(url.pathname)
  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
          return response
        })
        return cached || network
      })
    )
    return
  }

  // Only cache the public landing page. Never cache authenticated pages or private user data.
  if (request.mode === 'navigate' && url.pathname === '/') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        return response
      }).catch(async () => (await caches.match(request)) || (await caches.match('/offline')) || Response.error())
    )
  }
})
