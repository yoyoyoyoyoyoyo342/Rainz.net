import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import * as amplitude from '@amplitude/unified';

amplitude.initAll('1134523e7129723aad004d4d744c184b', {
  analytics: { autocapture: true },
  sessionReplay: { sampleRate: 1 },
});

const SW_CLEANUP_FLAG = 'rejn-sw-cleanup-done';
const CHUNK_RECOVERY_FLAG = 'rejn-chunk-recovery-attempted';
const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !!navigator.serviceWorker && typeof navigator.serviceWorker.register === 'function';
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isPreviewHost =
  host === 'localhost' ||
  host.endsWith('.localhost') ||
  host.endsWith('.lovable.app') ||
  host.endsWith('.lovableproject.com') ||
  host.startsWith('id-preview--');
const shouldRegisterServiceWorker =
  hasServiceWorker && import.meta.env.PROD && window.location.protocol === 'https:' && !isPreviewHost;

const isChunkLikeError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk')
  );
};

const getErrorMessage = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const cleanupServiceWorkers = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    return false;
  }

  const [registrations, cacheNames] = await Promise.all([
    navigator.serviceWorker.getRegistrations(),
    caches.keys(),
  ]);

  await Promise.all(registrations.map((registration) => registration.unregister()));
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

  return registrations.length > 0 || cacheNames.length > 0;
};

const recoverFromChunkFailure = async (reason: string) => {
  const attemptedRecovery = sessionStorage.getItem(CHUNK_RECOVERY_FLAG) === '1';
  if (attemptedRecovery) return;

  sessionStorage.setItem(CHUNK_RECOVERY_FLAG, '1');
  console.warn('Detected chunk/runtime asset mismatch. Recovering app...', reason);

  try {
    await cleanupServiceWorkers();
  } catch (error) {
    console.error('Chunk recovery cleanup failed:', error);
  } finally {
    window.location.reload();
  }
};

window.addEventListener('error', (event) => {
  const message = getErrorMessage(event.error || event.message);
  if (isChunkLikeError(message)) {
    void recoverFromChunkFailure(message);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const message = getErrorMessage(event.reason);
  if (isChunkLikeError(message)) {
    event.preventDefault();
    void recoverFromChunkFailure(message);
  }
});

const HARD_REFRESH_DONE_FLAG = 'rejn-hard-refresh-rejn-2.0';

if (hasServiceWorker) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'REJN_HARD_REFRESH') {
      const flag = `rejn-hard-refresh-${msg.tag || 'unknown'}`;
      if (sessionStorage.getItem(flag) === '1') return;
      sessionStorage.setItem(flag, '1');
      try {
        localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
      } catch {
        /* noop */
      }
      window.location.reload();
    }
  });
}

window.addEventListener('load', () => {
  if (!hasServiceWorker) return;

  if (shouldRegisterServiceWorker) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
        // If a brand new worker is found, ensure it activates immediately.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Old SW still controlling — new one waiting. Force it.
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
    return;
  }

  void cleanupServiceWorkers()
    .then((didCleanup) => {
      if (didCleanup && sessionStorage.getItem(SW_CLEANUP_FLAG) !== '1') {
        sessionStorage.setItem(SW_CLEANUP_FLAG, '1');
        window.location.reload();
      }
    })
    .catch((error) => {
      console.error('Service Worker cleanup failed:', error);
    });
});

createRoot(document.getElementById('root')!).render(<App />);
