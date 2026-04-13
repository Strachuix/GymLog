const VERSION = '1.4.5';
const CACHE_NAME = `gymlog-v${VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/stats.html',
  '/history.html',
  '/profile.html',
  '/app.js',
  '/install.js',
  '/js/sw-manager.js',
  '/js/wake-lock.js',
  '/js/main-page.js',
  '/js/profile-page.js',
  '/js/history-page.js',
  '/js/stats-page.js',
  '/js/supabase-config.js',
  '/js/supabase-sync.js',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/logo-small-64.png',
  '/assets/logo-small-128.png',
  '/assets/logo-small-192.png',
  '/assets/logo-small-256.png',
  '/assets/logo-small-512.png',
  '/assets/dumbbell-solid-full.svg',
  '/assets/chart-simple-solid-full.svg'
];

// Install event - cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache error:', err))
  );
  self.skipWaiting();
});

// Message event - obsługa SKIP_WAITING
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: VERSION
    });
  }
});

// Fetch event - serve same-origin files from cache, let cross-origin requests go directly to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Offline'
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('GymLog Service Worker activated, version:', VERSION);
      // Powiadom wszystkie karty o nowej wersji
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'VERSION',
            version: VERSION
          });
        });
      });
    })
  );
  self.clients.claim();
});
