/**
 * Notification utilities for Rainz
 * Handles Web Push API with VAPID from edge function
 */

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

let cachedVapidKey: string | null = null;

/**
 * Fetch VAPID public key from edge function
 */
async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/get-vapid-key`);
    if (!resp.ok) return null;
    const data = await resp.json();
    cachedVapidKey = data.publicKey || null;
    return cachedVapidKey;
  } catch (error) {
    console.error('Failed to fetch VAPID key:', error);
    return null;
  }
}

/**
 * Convert a base64url string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window &&
         'Notification' in window;
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    return await (registration as any).pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.warn('Push notifications not supported');
    return null;
  }

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    console.warn('VAPID public key not available');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check existing subscription
    let subscription = await (registration as any).pushManager.getSubscription();
    
    if (subscription) {
      return extractSubscriptionData(subscription);
    }
    
    // Subscribe with VAPID key
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });
    
    return extractSubscriptionData(subscription);
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Extract subscription data for sending to server
 */
function extractSubscriptionData(subscription: PushSubscription): PushSubscriptionData {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
    },
  };
}

/**
 * Request notification permission with graceful fallback
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  return await Notification.requestPermission();
}

/**
 * Show a local notification (fallback when push is not available)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options,
    });
    return true;
  } catch (error) {
    // Fallback to basic notification
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }
}
