const PRECACHE = ['./index.html'];
const VERSION = 'v2';
const SHELL = `time-shell-${VERSION}`;
const ASSETS = `time-assets-${VERSION}`;
const SHELL_URL = new URL('./index.html', self.registration.scope).pathname;
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await Promise.all(
        PRECACHE.map((path) =>
          shell.add(new Request(new URL(path, self.registration.scope), { cache: 'reload' })).catch(() => {}),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});
function refresh(cacheName, request, key = request) {
  return fetch(request)
    .then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(cacheName).then((c) => c.put(key, copy));
      }
      return res;
    })
    .catch(() => null);
}
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(SHELL_URL).then((hit) => {
        if (hit) {
          event.waitUntil(refresh(SHELL, new Request(SHELL_URL, { cache: 'reload' }), SHELL_URL));
          return hit;
        }
        return refresh(SHELL, req, SHELL_URL).then((res) => res ?? fetch(req));
      }),
    );
    return;
  }
  const cacheable =
    url.pathname.includes('/assets/') || /(\.(png|svg|webmanifest|woff2?)|\/theme\.js)$/.test(url.pathname);
  if (!cacheable) return;
  event.respondWith(caches.match(req).then((hit) => hit ?? refresh(ASSETS, req).then((res) => res ?? fetch(req))));
});
