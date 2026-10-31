// Service worker hors-ligne : coquille + données + polices + toutes les images (cache dédié).
const CACHE = 'a3chab-v1.4.0';
const IMG_CACHE = 'a3chab-images-v1';
const CORE = [
  './',
  './index.html',
  './style.css?v=1.4.0',
  './wiki-images.js?v=1.4.0',
  './data.js?v=1.4.0',
  './app.js?v=1.4.0',
  './image-manifest.json?v=1.4.0',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];
const IMG_HOSTS = ['commons.wikimedia.org', 'upload.wikimedia.org', 'thumb.wikimedia.org'];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri:wght@400;700&display=swap';

function fetchTO(url, opts, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms || 15000);
  return fetch(url, Object.assign({}, opts, { signal: c.signal })).finally(() => clearTimeout(t));
}

function isImageRequest(url) {
  return IMG_HOSTS.indexOf(url.hostname) >= 0 || url.pathname.indexOf('/wiki/Special:FilePath/') >= 0;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map((u) => fetchTO(u, {}, 15000).then((r) => {
      if (r && (r.ok || r.type === 'opaque')) return cache.put(u, r);
    }).catch(() => {})));
    try {
      const cssRes = await fetchTO(FONT_CSS, { mode: 'cors' }, 15000);
      if (cssRes && cssRes.ok) {
        await cache.put(FONT_CSS, cssRes.clone());
        const css = await cssRes.text();
        const fontUrls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
        await Promise.all(fontUrls.map((u) => fetchTO(u, { mode: 'cors' }, 15000).then((r) => {
          if (r && r.ok) return cache.put(u, r);
        }).catch(() => {})));
      }
    } catch (e) {}
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('a3chab-') && k !== CACHE && k !== IMG_CACHE)
        .map((k) => caches.delete(k))))
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
        if (fresh && fresh.ok) cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match('./index.html')) || (await cache.match('./')) ||
          new Response('غير متصل بالإنترنت، ولا توجد نسخة محفوظة بعد.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const network = fetchTO(req, {}, 12000).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => null);
      if (cached) { network; return cached; }
      const loose = await caches.match(req, { ignoreSearch: true });
      if (loose) { network; return loose; }
      return (await network) || new Response('', { status: 504 });
    })());
    return;
  }

  if (isImageRequest(url)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetchTO(req, {}, 30000);
        if (res && (res.ok || res.type === 'opaque')) {
          const c = await caches.open(IMG_CACHE);
          await c.put(req, res.clone());
        }
        return res;
      } catch (e) {
        return (await caches.match('./icon.svg')) || new Response('', { status: 504 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const hit = await caches.match(req);
    try {
      const res = await fetchTO(req, {}, 15000);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(CACHE);
        await c.put(req, res.clone());
      }
      return res;
    } catch (e) {
      return hit || new Response('', { status: 204 });
    }
  })());
});
