const CACHE_NAME = "chunk-response-v27";
const SHELL_ASSETS = ["./", "./index.html", "./tokens.css?v=27", "./styles.css?v=27", "./practice.css?v=27", "./app-core.js?v=27", "./install.js?v=27", "./icon.svg", "./manifest.webmanifest"];
const COURSE_DATA = ["/chunks_120_examples.csv", "/edtech_it_chunk_examples.md"];

self.addEventListener("install", (event) => event.waitUntil(
  caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(SHELL_ASSETS))
    .then(() => self.skipWaiting())
));
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
  await self.clients.claim();
  const windows = await self.clients.matchAll({ type: "window" });
  await Promise.all(windows.map((client) => client.navigate(client.url).catch(() => undefined)));
})()));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    }).catch(async () => (await caches.match(event.request)) || caches.match("./index.html")));
    return;
  }
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
