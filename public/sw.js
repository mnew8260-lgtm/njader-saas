/* Telegram Master Tool — Service Worker
 * Golden Build v6.0 — Offline-first PWA
 * Strategies:
 *   - App shell (HTML/CSS/JS/static): Cache-first
 *   - API calls: Network-first with cache fallback
 *   - Images/fonts: Cache-first with network fallback
 */

const SW_VERSION = 'gb-v6.0-pwa-1';
const APP_SHELL_CACHE = `tg-master-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `tg-master-runtime-${SW_VERSION}`;
const ASSET_CACHE = `tg-master-assets-${SW_VERSION}`;

// App shell — pre-cached on install (everything needed for offline first load)
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/robots.txt',
];

// Maximum entries in runtime cache
const RUNTIME_CACHE_LIMIT = 60;

// ===== INSTALL: pre-cache the app shell =====
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${SW_VERSION}`);
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then(async (cache) => {
      // Use addAll for atomicity, but tolerate failures (e.g., dev endpoints)
      const results = await Promise.allSettled(
        APP_SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length) {
        console.warn(`[SW] ${failed.length} resource(s) failed to pre-cache:`, failed.map(f => f.reason?.message));
      }
      console.log(`[SW] App shell cached (${APP_SHELL.length - failed.length}/${APP_SHELL.length})`);
    })
  );
  // Activate immediately for new features
  self.skipWaiting();
});

// ===== ACTIVATE: clean old caches =====
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${SW_VERSION}`);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![APP_SHELL_CACHE, RUNTIME_CACHE, ASSET_CACHE].includes(k))
          .map((k) => {
            console.log(`[SW] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => {
      console.log('[SW] Now controlling all clients');
      return self.clients.claim();
    })
  );
});

// ===== FETCH: route by request type =====
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip non-http(s) schemes (chrome-extension://, blob:, data:, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Skip Next.js dev/HMR endpoints
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Skip cross-origin requests in dev (avoid CORS issues)
  if (url.origin !== self.location.origin && url.hostname !== 'z-cdn.chatglm.cn') {
    return;
  }

  // === 1. Navigation requests (HTML pages) — Network-first with offline fallback ===
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigations
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline: try runtime cache, then app shell, then offline page
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          return new Response(
            `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<title>غير متصل</title>
<style>body{font-family:system-ui,sans-serif;background:#0e1621;color:#e5e9f0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem}
.icon{font-size:4rem;margin-bottom:1rem}
h1{color:#2AABEE;font-size:1.5rem;margin:0 0 0.5rem}
p{color:#8eacc0;margin:0.25rem 0}
button{margin-top:1.5rem;padding:0.6rem 1.5rem;background:#2AABEE;color:#fff;border:0;border-radius:0.5rem;cursor:pointer;font-size:0.95rem}
</style></head><body>
<div class="icon">⚠️</div>
<h1>لا يوجد اتصال بالإنترنت</h1>
<p>أنت غير متصل حالياً.</p>
<p>سيتم تحميل اللوحة تلقائياً عند عودة الاتصال.</p>
<button onclick="location.reload()">إعادة المحاولة</button>
</body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
          );
        })
    );
    return;
  }

  // === 2. Static assets (JS/CSS/fonts/images) — Cache-first ===
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|ico)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Refresh in background (stale-while-revalidate)
          fetch(request)
            .then((resp) => {
              if (resp && resp.ok) {
                const clone = resp.clone();
                caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
              }
            })
            .catch(() => {});
          return cached;
        }
        return fetch(request).then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // === 3. API calls — Network-first with cache fallback ===
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.ok && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(cache, RUNTIME_CACHE_LIMIT);
            });
          }
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // === 4. Other requests — Stale-while-revalidate ===
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((resp) => {
          if (resp && resp.ok && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
              trimCache(cache, RUNTIME_CACHE_LIMIT);
            });
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Trim runtime cache to limit (LRU-ish)
async function trimCache(cache, limit) {
  const keys = await cache.keys();
  if (keys.length > limit) {
    const toRemove = keys.slice(0, keys.length - limit);
    await Promise.all(toRemove.map((k) => cache.delete(k)));
  }
}

// ===== MESSAGE: allow client to trigger updates =====
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(APP_SHELL_CACHE),
        caches.delete(RUNTIME_CACHE),
        caches.delete(ASSET_CACHE),
      ]).then(() => {
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      })
    );
  } else if (data.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'VERSION', version: SW_VERSION });
  }
});

// ===== Periodic background sync (optional) =====
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tg-master-refresh') {
    event.waitUntil(refreshAppShell());
  }
});

async function refreshAppShell() {
  try {
    const cache = await caches.open(APP_SHELL_CACHE);
    await Promise.allSettled(APP_SHELL.map((url) =>
      fetch(new Request(url, { cache: 'reload' })).then((resp) => {
        if (resp.ok) cache.put(url, resp);
      })
    ));
    console.log('[SW] Background refresh complete');
  } catch (e) {
    console.warn('[SW] Background refresh failed:', e);
  }
}
