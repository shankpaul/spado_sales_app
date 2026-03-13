// Service Worker for Push Notifications and PWA
/* eslint-disable no-restricted-globals */

// Precache manifest - Workbox will inject files here during build
const precacheManifest = self.__WB_MANIFEST || [];

// Cache name - use timestamp for unique versioning on each build
// IMPORTANT: Update this timestamp on each deployment to force cache refresh
// Generate: date +%s
const CACHE_VERSION = '1773401303'; // Updated: 2026-03-13
const CACHE_NAME = `spado-app-v${CACHE_VERSION}`;

// Install event - precache files
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache the precache manifest files
      const urlsToCache = precacheManifest.map(entry => {
        return typeof entry === 'string' ? entry : entry.url;
      });
      console.log('[Service Worker] Caching app shell:', urlsToCache.length, 'files');
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('[Service Worker] Failed to cache some resources:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - Network-first for HTML, cache-first for assets
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // Skip caching for API requests - always fetch from network
  if (url.pathname.startsWith('/api/') || 
      url.hostname !== self.location.hostname ||
      event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Network-first strategy for HTML documents to get latest content
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(function(fetchResponse) {
          // Cache the new HTML for offline use
          if (fetchResponse && fetchResponse.status === 200) {
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          }
          return fetchResponse;
        })
        .catch(function() {
          // If network fails, try cache
          return caches.match(event.request).then(function(response) {
            return response || caches.match('/offline.html');
          });
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // Return cached version or fetch from network
      return response || fetch(event.request).then(function(fetchResponse) {
        // Cache successful responses for future use
        if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });
        }
        return fetchResponse;
      }).catch(function() {
        // If both cache and network fail, return offline page if available
        return caches.match('/offline.html');
      });
    })
  );
});

// Handle push notification events
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push notification received:', event);
  
  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data:', data);
    
    // Extract notification data from Ably push format
    const notification = data.notification || data;
    const title = notification.title || 'Spado Notification';
    const body = notification.body || 'You have a new update';
    const notificationData = notification.data || {};

    const options = {
      body: body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: notificationData.event || 'order-update',
      data: notificationData,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push notification:', error);
  }
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event.notification);
  
  event.notification.close();
  
  const orderId = event.notification.data?.order_id;
  const eventType = event.notification.data?.event;
  
  let url = '/';
  
  if (orderId) {
    // Navigate to order detail page
    url = `/orders/${orderId}`;
  } else if (eventType && eventType.startsWith('order.')) {
    // Navigate to orders page
    url = '/orders';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(client => {
              // Navigate the existing window
              return client.navigate(url);
            });
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed:', event.notification);
});

// Handle messages from the main app
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
