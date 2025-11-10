const CACHE_NAME = 'story-app-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  console.log('🟢 [ServiceWorker] Installing...');
  event.waitUntil((async () => {
    self.skipWaiting();
    const cache = await caches.open(CACHE_NAME);
    const results = [];
    for (const asset of STATIC_ASSETS) {
      try {
        // try fetching each asset; some assets may not exist in dev mode (hashed bundles, etc.)
        const res = await fetch(asset, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        await cache.put(asset, res.clone());
        results.push({ asset, status: 'cached' });
      } catch (err) {
        // don't fail the whole install when a single resource is missing
        console.warn(`🔶 [ServiceWorker] Failed to cache ${asset}:`, err.message || err);
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
          // Cache successful GET responses for future usage (best-effort)
          return caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(event.request, networkResponse.clone());
            } catch (err) {
              // some requests (opaque/cors) may fail to be put into cache — ignore
              console.warn('[ServiceWorker] cache.put failed:', err);
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
  const data = event.data?.json() || {};
  const title = data.title || 'Cerita Baru!';
  const options = {
    body: data.body || 'Ada cerita baru yang menunggumu!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: data, // include payload for notificationclick
    actions: [
      { action: 'open', title: 'Buka Cerita' }
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const targetUrl = payload.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        // focus the first client and navigate it if possible
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
  if (event.data?.type === 'push-mock') {
    const { title, body } = event.data.data;
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
    });
    console.log('🔔 [ServiceWorker] Mock push received');
  }
});
