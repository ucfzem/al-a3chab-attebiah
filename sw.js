// Service worker hors-ligne : coquille + données + polices + images déjà consultées.
const CACHE = 'a3chab-v1.3.9';
const CORE = [
  './',
  'index.html',
  'style.css?v=1.3.9',
  'wiki-images.js?v=1.3.9',
  'data.js?v=1.3.9',
  'app.js?v=1.3.9',
  'manifest.json',
  'icon.svg',
  'icon-192.png',
  'icon-512.png'
];

function fetchTO(url, opts, ms = 15000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, Object.assign({}, opts, { signal: c.signal })).finally(() => clearTimeout(t));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map((u) => fetchTO(u).then((r) => {
      if (r && (r.ok || r.type === 'opaque')) return cache.put(u, r);
    }).catch(() => {})));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.startsWith('a3chab-')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetchTO(req, {}, 10000);
        if (fresh && fresh.ok) cache.put('index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match('index.html')) || (await cache.match('./')) ||
          new Response('غير متصل بالإنترنت، ولا توجد نسخة محفوظة بعد.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
