/* ============================================================
   My Tools — sw.js (Service Worker)
   Caches the app shell (HTML/CSS/JS/fonts/icons) so the site
   still loads with no internet connection. Firebase requests are
   deliberately left untouched so the SDK can manage its own
   networking/retry behavior.
   ============================================================ */

const CACHE_NAME = 'my-tools-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept live Firebase / Google auth API traffic — let the SDK
  // handle its own connectivity, retries, and offline queuing. The SDK's
  // static .js files (served from gstatic.com) are NOT excluded here, so
  // they get cached like any other static asset and still load offline.
  if(
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com')
  ){
    return;
  }

  // Page navigations: try the network first (fresh content when online),
  // fall back to the cached app shell when offline.
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets (CSS, fonts, icons, Font Awesome, etc.): cache-first,
  // populate the cache the first time each one is fetched.
  event.respondWith(
    caches.match(req).then((cached) => {
      if(cached) return cached;
      return fetch(req)
        .then((res) => {
          if(res && res.status === 200){
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
