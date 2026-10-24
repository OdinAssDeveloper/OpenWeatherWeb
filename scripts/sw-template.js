/* Generated at build time. Cache only the explicitly listed application assets. */
const CACHE_PREFIX = 'openweatherweb-shell-';
const CACHE_NAME = CACHE_PREFIX + '__VERSION__';
const PRECACHE = __PRECACHE__;
const scopeUrl = self.registration.scope;
const shellUrl = new URL('index.html', scopeUrl).href;
const allowedUrls = new Set(PRECACHE.map(path => new URL(path, scopeUrl).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([...allowedUrls].map(url => new Request(url, { cache: 'reload' })))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Exclude OpenWeather and all query-bearing URLs, including appid/API keys.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  const navigation = request.mode === 'navigate' && url.pathname.startsWith(new URL(scopeUrl).pathname);
  if (!navigation && !allowedUrls.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(navigation ? shellUrl : request);
    if (cached) return cached;
    // Runtime responses are deliberately never written to Cache Storage.
    return fetch(request);
  })());
});
