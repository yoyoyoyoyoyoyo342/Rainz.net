// Service Worker for Rejn Weather App with Infrastructure-Level Analytics
// v5.0 — Rejn 2.0 hard-refresh release. On activate we wipe ALL caches +
// known IndexedDB databases and force every open client to reload so no user
// stays on a stale pre-2.0 bundle.
const VERSION = 'v5.0';
const CACHE_NAME = `rainz-weather-${VERSION}`;
const STATIC_CACHE = `rainz-static-${VERSION}`;

// Bump this string for every future hard-refresh release.
const HARD_REFRESH_TAG = 'rejn-2.0';

const ANALYTICS_ENDPOINT = 'https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/track-analytics';
const ANALYTICS_BATCH_SIZE = 10;
const ANALYTICS_BATCH_TIMEOUT = 5000;
let analyticsBatch = [];
let batchTimer = null;

const getSessionId = () => {
  let sessionId = self.sessionId;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    self.sessionId = sessionId;
  }
  return sessionId;
};

self.addEventListener('install', (event) => {
  // Skip waiting immediately — old SW is replaced on the next event loop tick.
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([
          '/',
          '/logo.png',
          '/logo-icon.png',
          '/favicon.ico',
          '/favicon-32.png',
          '/favicon-192.png',
          '/pwa-icon.png',
        ])
      )
      .then(() => self.skipWaiting())
  );
});

async function wipeAllCaches() {
  const names = await caches.keys();
  await Promise.all(names.map((n) => caches.delete(n)));
}

async function wipeKnownIDBs() {
  // Best-effort — older browsers don't expose databases().
  try {
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .filter((d) => !!d.name && !d.name.startsWith('firebase-'))
          .map((d) => new Promise((resolve) => {
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve();
          })),
      );
    }
  } catch {
    // ignore — IDB wipe is opportunistic
  }
}

async function reloadAllClients() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    try {
      client.postMessage({ type: 'REJN_HARD_REFRESH', tag: HARD_REFRESH_TAG });
    } catch {
      /* noop */
    }
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await wipeAllCaches();
      await wipeKnownIDBs();
      await self.clients.claim();
      await reloadAllClients();
    })()
  );
});

const sendAnalyticsBatch = async () => {
  if (analyticsBatch.length === 0) return;

  const batch = [...analyticsBatch];
  analyticsBatch = [];

  try {
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // don't block the SW on analytics
  }
};

const trackAnalytics = (eventData) => {
  analyticsBatch.push(eventData);

  if (analyticsBatch.length >= ANALYTICS_BATCH_SIZE) {
    clearTimeout(batchTimer);
    sendAnalyticsBatch();
  } else {
    clearTimeout(batchTimer);
    batchTimer = setTimeout(sendAnalyticsBatch, ANALYTICS_BATCH_TIMEOUT);
  }
};

const shouldBypassRuntimeCache = (request, url) => {
  if (request.destination === 'script') return true;
  if (url.pathname.includes('/node_modules/.vite/')) return true;
  if (url.pathname.includes('/@vite/')) return true;
  return false;
};

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request);
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const startTime = Date.now();

  if (url.href.includes('track-analytics')) return;

  const sessionId = getSessionId();

  let requestType = 'other';
  if (url.hostname === self.location.hostname) {
    if (event.request.mode === 'navigate') {
      requestType = 'pageview';
    } else if (url.pathname.match(/\.(js|css|woff|woff2|ttf)$/)) {
      requestType = 'asset';
    } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
      requestType = 'image';
    } else {
      requestType = 'resource';
    }
  } else if (url.hostname.includes('supabase.co')) {
    requestType = url.pathname.includes('/rest/')
      ? 'api_database'
      : url.pathname.includes('/functions/')
        ? 'api_function'
        : url.pathname.includes('/storage/')
          ? 'api_storage'
          : 'api_other';
  } else {
    requestType = 'external';
  }

  if (event.request.method !== 'GET') {
    trackAnalytics({
      event_type: requestType,
      page_path: url.pathname,
      session_id: sessionId,
      method: event.request.method,
      hostname: url.hostname,
      query: url.search,
    });
    return;
  }

  if (url.hostname !== self.location.hostname) {
    trackAnalytics({
      event_type: requestType,
      page_path: url.pathname,
      session_id: sessionId,
      method: event.request.method,
      hostname: url.hostname,
      query: url.search,
    });
    return;
  }

  // Always fetch navigation requests from network to prevent stale HTML/chunk mismatches
  // that can lead to blank/black screens after deployments.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(async () => {
        const cachedHome = await caches.match('/');
        return cachedHome || Response.error();
      })
    );
    return;
  }

  if (shouldBypassRuntimeCache(event.request, url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    (async () => {
      const destination = event.request.destination;
      const isStatic = ['style', 'font', 'image'].includes(destination);

      try {
        const response = isStatic ? await cacheFirst(event.request) : await networkFirst(event.request);

        trackAnalytics({
          event_type: requestType,
          page_path: url.pathname,
          session_id: sessionId,
          method: event.request.method,
          hostname: url.hostname,
          status_code: response.status,
          duration_ms: Date.now() - startTime,
          query: url.search,
        });

        return response;
      } catch (error) {
        trackAnalytics({
          event_type: requestType,
          page_path: url.pathname,
          session_id: sessionId,
          method: event.request.method,
          hostname: url.hostname,
          status_code: 0,
          error: String(error?.message || error),
          query: url.search,
        });

        return caches.match(event.request);
      }
    })()
  );
});

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Rejn Weather', body: 'You have a new weather update!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo-icon.png',
    tag: data.data?.type || 'rainz-notification',
    requireInteraction: data.data?.type === 'severe_weather',
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Open Rejn' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
