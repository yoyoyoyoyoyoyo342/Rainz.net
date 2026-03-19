import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const SW_CLEANUP_FLAG = 'rainz-sw-cleanup-done';
const shouldRegisterServiceWorker = import.meta.env.PROD && window.location.protocol === 'https:';

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

window.addEventListener('load', () => {
  if (shouldRegisterServiceWorker) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
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
