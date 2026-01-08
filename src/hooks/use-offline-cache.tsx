/**
 * Hook for managing offline weather cache for premium users
 */
import { useCallback, useEffect, useState } from 'react';
import { useSubscription } from './use-subscription';
import {
  cacheWeatherData,
  getCachedWeatherData,
  cleanupExpiredCache,
  getCacheStats,
  isOfflineCacheSupported,
} from '@/lib/offline-cache';

interface OfflineCacheState {
  isSupported: boolean;
  cacheCount: number;
  lastCacheTime: Date | null;
}

export function useOfflineCache() {
  const { isSubscribed } = useSubscription();
  const [state, setState] = useState<OfflineCacheState>({
    isSupported: isOfflineCacheSupported(),
    cacheCount: 0,
    lastCacheTime: null,
  });

  // Load cache stats on mount
  useEffect(() => {
    if (!isSubscribed || !state.isSupported) return;

    const loadStats = async () => {
      const stats = await getCacheStats();
      setState(prev => ({
        ...prev,
        cacheCount: stats.count,
        lastCacheTime: stats.newestTimestamp ? new Date(stats.newestTimestamp) : null,
      }));
    };

    loadStats();
    
    // Clean up expired entries
    cleanupExpiredCache();
  }, [isSubscribed, state.isSupported]);

  /**
   * Cache weather data for offline access (premium only)
   */
  const saveToCache = useCallback(async (
    latitude: number,
    longitude: number,
    locationName: string,
    data: any
  ): Promise<boolean> => {
    if (!isSubscribed || !state.isSupported) return false;
    
    const success = await cacheWeatherData(latitude, longitude, locationName, data);
    
    if (success) {
      const stats = await getCacheStats();
      setState(prev => ({
        ...prev,
        cacheCount: stats.count,
        lastCacheTime: new Date(),
      }));
    }
    
    return success;
  }, [isSubscribed, state.isSupported]);

  /**
   * Get cached weather data if available
   */
  const getFromCache = useCallback(async (
    latitude: number,
    longitude: number
  ) => {
    if (!isSubscribed || !state.isSupported) return null;
    
    return getCachedWeatherData(latitude, longitude);
  }, [isSubscribed, state.isSupported]);

  return {
    ...state,
    saveToCache,
    getFromCache,
    isEnabled: isSubscribed && state.isSupported,
  };
}
