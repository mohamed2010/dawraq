const CACHE_NAME = "zuhaira-shell-v3";
const APP_SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const acceptsHtml = request.headers.get("accept")?.includes("text/html");
  if (request.mode === "navigate" || acceptsHtml) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() => caches.match("/")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && response.type === "basic") {
        void caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => caches.match("/"))),
  );
});
