const CACHE_NAME = 'story-app-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  console.log('🟢 [ServiceWorker] Installing...');
  event.waitUntil((async () => {
    self.skipWaiting();
    const cache = await caches.open(CACHE_NAME);
    const results = [];
    for (const asset of STATIC_ASSETS) {
      try {
        const res = await fetch(asset, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        await cache.put(asset, res.clone());
        results.push({ asset, status: 'cached' });
      } catch (err) {
        results.push({ asset, status: 'failed', reason: err.message || String(err) });
      }
    }
    console.log('🟢 [ServiceWorker] Cache install result:', results);
  })());
});

self.addEventListener('activate', (event) => {
  console.log('🟣 [ServiceWorker] Activated');
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(event.request, networkResponse.clone());
            } catch (err) {
            }
            return networkResponse;
          });
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

self.addEventListener('push', (event) => {
  try {
    if (Notification.permission !== 'granted') {
      console.warn('🔕 [ServiceWorker] Push event received but notification permission not granted.');
      return;
    }
    const data = event.data?.json() || {};
    const title = data.title || 'Cerita Baru!';
    const options = {
      body: data.body || 'Ada cerita baru yang menunggumu!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: data, 
      actions: [
        { action: 'open', title: 'Buka Cerita' }
      ],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn('🔶 [ServiceWorker] push handler error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const targetUrl = payload.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        if (client.url !== targetUrl && client.navigate) {
          return client.navigate(targetUrl);
        }
        return;
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('message', (event) => {
  try {
    if (event.data?.type === 'push-mock') {
      if (Notification.permission !== 'granted') {
        console.warn('🔕 [ServiceWorker] Mock push requested but notification permission not granted.');
        if (event.source && event.source.postMessage) {
          event.source.postMessage({ type: 'push-mock-result', ok: false, reason: 'no-permission' });
        }
        return;
      }
      const { title, body } = event.data.data;
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
      });
      console.log('🔔 [ServiceWorker] Mock push received');
    }
  } catch (err) {
    console.warn('🔶 [ServiceWorker] message handler error:', err);
  }
});
