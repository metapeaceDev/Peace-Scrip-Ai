// Service Worker for PWA offline support
const CACHE_NAME = 'peace-script-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle safe cacheable requests.
  // - Skip non-GET
  // - Skip cross-origin (e.g., Firebase Storage video URLs)
  // - Skip media streaming and range requests (common source of cache errors)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.headers && req.headers.has('range')) return;

  const dest = req.destination;
  const cacheableDestinations = new Set(['document', 'script', 'style', 'image', 'font']);
  if (dest && !cacheableDestinations.has(dest)) return;

  event.respondWith(
    caches.match(req).then((response) => {
      if (response) return response;
      return fetch(req);
    })
  );
});
