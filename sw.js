const CACHE_NAME = "chunk-response-v25";
const SHELL_ASSETS = ["./", "./index.html", "./tokens.css?v=25", "./styles.css?v=25", "./practice.css?v=25", "./app-core.js?v=25", "./install.js?v=25", "./icon.svg", "./manifest.webmanifest"];
const COURSE_DATA = ["/chunks_120_examples.csv", "/edtech_it_chunk_examples.md"];

self.addEventListener("install", (event) => event.waitUntil(
  caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(SHELL_ASSETS))
    .then(() => self.skipWaiting())
));
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))), self.clients.claim()])));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (COURSE_DATA.some((path) => url.pathname.endsWith(path))) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(network.catch(() => undefined));
        return cached;
      }
      return network;
    }));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
