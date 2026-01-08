/**
 * Offline weather caching for Rainz+ premium users
 * Stores weather data in IndexedDB for offline access
 */

const DB_NAME = 'rainz-offline-cache';
const DB_VERSION = 1;
const WEATHER_STORE = 'weather-data';
const CACHE_EXPIRY_HOURS = 6;

interface CachedWeatherData {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string;
  data: any;
  timestamp: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Open or create the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('Failed to open offline cache database');
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(WEATHER_STORE)) {
        const store = db.createObjectStore(WEATHER_STORE, { keyPath: 'id' });
        store.createIndex('location', ['latitude', 'longitude'], { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
  
  return dbPromise;
}

/**
 * Generate a unique cache ID for a location
 */
function getCacheId(latitude: number, longitude: number): string {
  // Round to 2 decimal places for cache consistency
  const lat = Math.round(latitude * 100) / 100;
  const lng = Math.round(longitude * 100) / 100;
  return `weather_${lat}_${lng}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  const now = Date.now();
  const ageHours = (now - timestamp) / (1000 * 60 * 60);
  return ageHours < CACHE_EXPIRY_HOURS;
}

/**
 * Save weather data to offline cache
 */
export async function cacheWeatherData(
  latitude: number,
  longitude: number,
  locationName: string,
  data: any
): Promise<boolean> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(WEATHER_STORE, 'readwrite');
    const store = transaction.objectStore(WEATHER_STORE);
    
    const cacheEntry: CachedWeatherData = {
      id: getCacheId(latitude, longitude),
      latitude: Math.round(latitude * 100) / 100,
      longitude: Math.round(longitude * 100) / 100,
      locationName,
      data,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve) => {
      const request = store.put(cacheEntry);
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Failed to cache weather data:', request.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Error caching weather data:', error);
    return false;
  }
}

/**
 * Get cached weather data for a location
 */
export async function getCachedWeatherData(
  latitude: number,
  longitude: number
): Promise<{ data: any; timestamp: number; locationName: string } | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(WEATHER_STORE, 'readonly');
    const store = transaction.objectStore(WEATHER_STORE);
    const id = getCacheId(latitude, longitude);
    
    return new Promise((resolve) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result as CachedWeatherData | undefined;
        
        if (result && isCacheValid(result.timestamp)) {
          resolve({
            data: result.data,
            timestamp: result.timestamp,
            locationName: result.locationName,
          });
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('Failed to get cached weather data:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Error getting cached weather data:', error);
    return null;
  }
}

/**
 * Clear all cached weather data
 */
export async function clearWeatherCache(): Promise<boolean> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(WEATHER_STORE, 'readwrite');
    const store = transaction.objectStore(WEATHER_STORE);
    
    return new Promise((resolve) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (error) {
    console.error('Error clearing weather cache:', error);
    return false;
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(WEATHER_STORE, 'readwrite');
    const store = transaction.objectStore(WEATHER_STORE);
    const index = store.index('timestamp');
    
    const expiryTime = Date.now() - (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
    const range = IDBKeyRange.upperBound(expiryTime);
    
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  count: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(WEATHER_STORE, 'readonly');
    const store = transaction.objectStore(WEATHER_STORE);
    
    return new Promise((resolve) => {
      const countRequest = store.count();
      let count = 0;
      let oldestTimestamp: number | null = null;
      let newestTimestamp: number | null = null;
      
      countRequest.onsuccess = () => {
        count = countRequest.result;
      };
      
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const results = getAllRequest.result as CachedWeatherData[];
        if (results.length > 0) {
          const timestamps = results.map(r => r.timestamp);
          oldestTimestamp = Math.min(...timestamps);
          newestTimestamp = Math.max(...timestamps);
        }
        resolve({ count, oldestTimestamp, newestTimestamp });
      };
      
      getAllRequest.onerror = () => {
        resolve({ count, oldestTimestamp, newestTimestamp });
      };
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { count: 0, oldestTimestamp: null, newestTimestamp: null };
  }
}

/**
 * Check if browser supports IndexedDB
 */
export function isOfflineCacheSupported(): boolean {
  return 'indexedDB' in window;
}
