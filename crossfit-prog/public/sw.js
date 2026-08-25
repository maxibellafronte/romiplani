// Service Worker de desinstalacion (kill switch)
//
// La version anterior de este archivo cacheaba "/" con estrategia cache-first
// y un CACHE_NAME fijo, por lo que los navegadores que lo tenian instalado
// seguian sirviendo el index.html viejo (y su bundle viejo) para siempre.
// index.html ya no registra ningun service worker, pero los que ya estaban
// instalados no se van solos: este archivo los reemplaza, borra todos los
// caches, se desregistra y recarga las pestanas abiertas.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});

// Sin handler de fetch: todo va directo a la red.
