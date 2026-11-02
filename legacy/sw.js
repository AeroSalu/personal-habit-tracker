// Caches the app so it opens with no signal. Cached files are served straight
// away and refreshed in the background, so an update shows on the next open.
// Bump CACHE on every shipped change, and add new files to FILES.
const CACHE = 'lock-in-v1';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'logic.js',
  'store.js',
  'auth.js',
  'focus.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Firebase's own sign-in pages must always reach the network. SDK files are versioned,
  // so those stay cacheable, which lets the app open offline.
  if (url.pathname.startsWith('/__/auth/')) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    )
  );
});
