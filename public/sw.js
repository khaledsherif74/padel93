const SHELL = 'p93-shell-v1';
const ASSETS = 'p93-assets-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key !== SHELL && key !== ASSETS) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

function isOurs(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return !url.pathname.startsWith('/api');
}

async function pageNetworkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(SHELL)).put('/', res.clone());
    return res;
  } catch (err) {
    const cached = await caches.match('/', { cacheName: SHELL });
    if (cached) return cached;
    throw err;
  }
}

async function assetCacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isOurs(request)) return;
  const { pathname } = new URL(request.url);
  if (request.mode === 'navigate') event.respondWith(pageNetworkFirst(request));
  else if (pathname.startsWith('/assets/')) event.respondWith(assetCacheFirst(request));
});
