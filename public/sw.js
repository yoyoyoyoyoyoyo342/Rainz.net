// Service Worker for Rainz Weather App with Infrastructure-Level Analytics
const VERSION = 'v4.1';
const CACHE_NAME = `rainz-weather-${VERSION}`;
const STATIC_CACHE = `rainz-static-${VERSION}`;

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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
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
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
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

  event.respondWith(
    (async () => {
      const destination = event.request.destination;
      const isStatic = ['script', 'style', 'font', 'image'].includes(destination);

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
