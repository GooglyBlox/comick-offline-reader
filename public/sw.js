const CACHE_NAME = "comick-offline-v1.8";

const urlsToCache = [
  "/",
  "/settings",
  "/offline.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  console.log(
    "Fetch request:",
    request.mode,
    request.destination,
    url.pathname
  );

  if (url.origin !== location.origin) {
    if (url.hostname === "meo.comick.pictures") {
      if (
        url.searchParams.has("sw-bypass") ||
        request.headers.get("X-Bypass-SW") === "true" ||
        url.search.includes("sw-bypass-")
      ) {
        console.log(
          "Bypassing service worker for image download:",
          url.pathname
        );
        return;
      }

      event.respondWith(
        caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open("comick-images").then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              return caches.match(request);
            });
        })
      );
    }
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open("api-cache").then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp)$/)
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open("static-assets").then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(request);
          });
      })
    );
    return;
  }

  if (
    request.mode === "navigate" ||
    request.destination === "document" ||
    (request.method === "GET" &&
      request.headers.get("Accept")?.includes("text/html")) ||
    (request.mode === "cors" &&
      request.method === "GET" &&
      !url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/_next/") &&
      !url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|json)$/))
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          console.log("Found cached page:", url.pathname);
          return response;
        }

        console.log("Page not in cache, fetching:", url.pathname);
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              console.log("Caching page:", url.pathname);
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            console.log(
              "Fetch failed, serving offline page for:",
              url.pathname
            );
            return caches.match("/offline.html").then((offlineResponse) => {
              if (offlineResponse) {
                return offlineResponse;
              }
              return new Response(
                `<!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Offline - Comick Reader</title>
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #0f172a; color: #fff; margin: 0; padding: 20px;
                    display: flex; align-items: center; justify-content: center;
                    min-height: 100vh; text-align: center;
                  }
                  .container { max-width: 400px; }
                  h1 { color: #60a5fa; margin-bottom: 20px; }
                  p { color: #94a3b8; margin-bottom: 30px; }
                  button { 
                    background: #3b82f6; color: white; border: none; padding: 12px 24px;
                    border-radius: 8px; cursor: pointer; margin: 0 10px;
                  }
                  button:hover { background: #2563eb; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>You're Offline</h1>
                  <p>This page isn't available offline. Check your connection and try again, or go back to your manga collection.</p>
                  <button onclick="window.location.reload()">Try Again</button>
                  <button onclick="window.location.href='/'">Go Home</button>
                </div>
              </body>
              </html>`,
                {
                  headers: {
                    "Content-Type": "text/html",
                    "Cache-Control": "no-store",
                  },
                }
              );
            });
          });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
