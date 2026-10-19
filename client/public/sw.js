/* DentEra service worker — safe by design for an auth'd clinical app:
   - HTML/network resources: network-first (never serve stale auth pages)
   - hashed build assets: stale-while-revalidate (immutable, content-named)
   - images: cache-first with cap
   - /api/*: never cached (live clinic data + auth cookies)
   - offline fallback page for navigations when the network is gone      */
'use strict';
const VERSION = 'dentera-v3';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const IMAGES = `${VERSION}-images`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL, '/manifest.webmanifest', '/pwa-192.png', '/pwa-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;       // fonts/CDN: browser default
  if (url.pathname.startsWith('/api/')) return;     // live data + auth: straight to network
  if (req.method !== 'GET') return;

  // Navigations: network-first, offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); event.waitUntil(caches.open(SHELL).then((c) => c.put(req, copy))); return res; })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match(OFFLINE_URL))
    );
    return;
  }

  // hashed Vite build assets (content-named, immutable): stale-while-revalidate
  if (/^\/assets\//.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const refresh = fetch(req).then((res) => {
          const copy = res.clone(); // clone synchronously — a lazy clone throws "body is already used"
          event.waitUntil(caches.open(ASSETS).then((c) => c.put(req, copy)));
          return res;
        }).catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  // images/other static: network-first (public images can be swapped any time),
  // cache only as offline fallback so they stay fresh on every visit
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone(); // clone synchronously — a lazy clone throws "body is already used"
          event.waitUntil(caches.open(IMAGES).then((c) => c.put(req, copy)));
          const cachePromise = caches.open(IMAGES).then(async (c) => {
            const keys = await c.keys();
            if (keys.length > 60) await c.delete(keys[0]);
          });
          event.waitUntil(cachePromise);
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || Response.error()))
  );
});
