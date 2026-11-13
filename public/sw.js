// CoreTextil PWA · Service Worker con soporte Standalone Offline.
// Permite abrir el Cuaderno Digital sin internet, guardar anotaciones
// y piezas localmente y sincronizar en caliente al recuperar conexión.

const CACHE = "coretextil-v2";

const PRECACHE = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icon.png",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navegación (HTML): Network-first con fallback a caché para soportar Offline
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // Si estamos desconectados (Offline), busca la página en caché
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallbackOperario = await caches.match("/dashboard/operario");
          if (fallbackOperario) return fallbackOperario;
          return new Response(
            `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>CoreTextil Offline</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{background:#090d16;color:#e2e8f0;font-family:sans-serif;padding:2rem;text-align:center;}h1{color:#38bdf8;}a{color:#38bdf8;text-decoration:none;font-weight:bold;}</style></head><body><h1>📡 Modo Standalone Desconectado</h1><p>Estás en modo sin internet. Puedes continuar anotando tu producción en el Cuaderno Digital.</p><p><a href="/dashboard/operario">Abrir Cuaderno Digital →</a></p></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // 2. Activos inmutables: Cache-first
  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/icon.png" ||
    url.pathname === "/logo.png" ||
    url.pathname === "/manifest.webmanifest";

  if (!cacheable) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })()
  );
});
