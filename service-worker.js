// Name of the cache
const CACHE_NAME = 'my-site-cache-v1';
// Files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/bundle.js',
];

// Installing the service worker and caching resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercepting network requests and serving cached content
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the resource is in the cache, serve it, otherwise fetch it from the network
        return response || fetch(event.request);
      })
  );
});

// Updating the service worker (clearing old caches)
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
