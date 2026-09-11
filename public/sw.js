const CACHE = 'crossplay-solver-v2';

function detachCachedResponse(response) {
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    const shell = await fetch(scope, { cache: 'reload' });
    const html = await shell.clone().text();
    const urls = new Set([scope, 'dictionary/words.txt', 'dictionary/additions.txt', 'dictionary/removals.txt', 'recognition/templates.json', 'fixtures/midgame.json', 'manifest.webmanifest'].map(path => new URL(path, scope).href));
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const url = new URL(match[1], scope);
      if (url.origin === location.origin) urls.add(url.href);
    }
    const cache = await caches.open(CACHE);
    await Promise.all([...urls].map(async url => {
      try { const response = url === scope ? shell.clone() : await fetch(url, { cache: 'reload' }); if (response.ok) await cache.put(url, response); } catch {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.all((await caches.keys()).filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    // Next's worker bootstrap stores module parameters in the URL fragment.
    // Cache responses retain their own fragment-free URL, so return a detached
    // response and let the browser keep the URL used to construct the worker.
    if (cached) return event.request.destination === 'worker' ? detachCachedResponse(cached) : cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) (await caches.open(CACHE)).put(event.request, response.clone());
      return response;
    } catch {
      return (await caches.match(self.registration.scope)) ?? Response.error();
    }
  })());
});
