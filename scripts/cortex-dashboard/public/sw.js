const CACHE = 'cortex-v13';
const SHELL = ['/', '/css/main.css', '/favicon.svg', '/manifest.json'];
// app.js is network-first — always load latest code

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first: API and app.js (always get latest)
  if (url.pathname.startsWith('/api/') || url.pathname === '/js/app.js') {
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok && e.request.method === 'GET') {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Stale-while-revalidate for other shell files
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(r => {
        if (r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      });
      return cached || fetched;
    })
  );
});
