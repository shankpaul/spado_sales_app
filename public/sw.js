// Service Worker for Push Notifications
/* eslint-disable no-restricted-globals */

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

// Install event
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main app
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
