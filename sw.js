const CACHE_NAME = "chunk-response-v4";
const ASSETS = ["./", "./index.html", "./tokens.css", "./styles.css", "./practice.css", "./app.js", "./load-status.js", "./settings.js", "./repeat-display.js", "./auto-mode.js", "./audio-controls.js", "./progress.js", "./reveal.js", "./install.js", "./icon.svg", "./chunks_120_examples.csv", "./edtech_it_chunk_examples.md", "./manifest.webmanifest"];

self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))));
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([caches.keys().then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))), self.clients.claim()])));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
