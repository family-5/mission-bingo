const CACHE = "mission-bingo-v1";
const BASE = "/mission-bingo/";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([BASE, `${BASE}manifest.webmanifest`])));
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response;
    }).catch(() => caches.match(request).then(hit => hit || caches.match(BASE))));
    return;
  }
  if (new URL(request.url).pathname.startsWith(`${BASE}_next/`)) {
    event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response;
    })));
  }
});
