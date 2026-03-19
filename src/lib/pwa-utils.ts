/**
 * Utility functions for PWA installation and iOS/Apple device detection
 */

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isAppleDevice = (): boolean => {
  const ua = navigator.userAgent;
  // iOS devices
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return true;
  // iPadOS (reports as Mac with touch)
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  // macOS Safari (exclude Chrome/Firefox/Edge on Mac)
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/.test(ua)) return true;
  return false;
};

export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

export const needsPWAInstall = (): boolean => {
  return isIOS() && !isPWAInstalled();
};

export const canRequestNotifications = (): boolean => {
  if (isIOS()) {
    return isPWAInstalled();
  }
  return 'Notification' in window;
};
