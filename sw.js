const CACHE_NAME = 'gymlog-v2';
const ASSETS = [
  './',
  './index.html',
  './session.html',
  './exercise.html',
  './add.html',
  './stats.html',
  './profile.html',
  './css/style.css',
  './js/db.js',
  './js/sessions.js',
  './js/exercises.js',
  './js/ui.js',
  './js/theme.js',
  './js/notifications.js',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.svg',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Cache failed:', err))
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[SW] Serving from cache:', event.request.url);
          return response;
        }
        
        console.log('[SW] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // Don't cache non-GET requests or non-successful responses
            if (event.request.method !== 'GET' || !response || response.status !== 200) {
              return response;
            }
            
            // Clone response to cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(err => {
            console.error('[SW] Fetch failed:', err);
            // Return offline page if available
            return caches.match('./index.html');
          });
      })
  );
});

// Push notification event
self.addEventListener('push', event => {
  console.log('[SW] Push received:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'GymLog Reminder';
  const options = {
    body: data.body || 'Time for your workout!',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url || './',
    actions: [
      { action: 'open', title: 'Open App', icon: './icons/icon-72x72.png' },
      { action: 'close', title: 'Dismiss', icon: './icons/icon-72x72.png' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data || './')
    );
  }
});

// Background sync event (for future use)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-exercises') {
    event.waitUntil(syncExercises());
  }
});

async function syncExercises() {
  // Placeholder for future sync functionality
  console.log('[SW] Syncing exercises...');
  return Promise.resolve();
}

// Message event - handle updates from clients
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});
