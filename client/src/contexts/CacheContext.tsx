import React, { createContext, useContext, useRef, useEffect } from 'react';
import { cacheAPI } from '../utils/cacheApiWrapper';

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt?: number;
  cacheKey?: string;
};

export type MetricsCacheEntry = {
  mean: Record<string, any>;
  median: Record<string, any>;
  variance: Record<string, any>;
  stdDev: Record<string, any>;
  [key: string]: any;
};

interface CacheContextType {
  metricsCache: Map<string, CacheEntry<any>>;
  scatterCache: Map<string, CacheEntry<any>>;
  pluginCache: Map<string, CacheEntry<any>>;
  clearAllCaches: () => Promise<void>;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

// In-memory Maps for quick access (synced with cacheAPI)
let metricsCache = new Map<string, CacheEntry<any>>();
let scatterCache = new Map<string, CacheEntry<any>>();
let pluginCache = new Map<string, CacheEntry<any>>();

// Initialize caches from cacheAPI on startup
const initializeCaches = async () => {
  try {
    const allKeys = await cacheAPI.keys();
    for (const key of allKeys) {
      const data = await cacheAPI.get<CacheEntry<any>>(key);
      if (!data) continue;

      // Route cache entries by prefix
      if (key.startsWith('scatter:')) {
        scatterCache.set(key, data);
      } else if (key.startsWith('plugin|')) {
        pluginCache.set(key, data);
      } else if (key.startsWith('metrics|') || key.startsWith('timeseries:')) {
        metricsCache.set(key, data);
      }
      // Ignore unknown prefixes
    }
  } catch (e) {
    console.warn('Failed to initialize caches from cacheAPI:', e);
  }
};

// Sync caches to cacheAPI - called periodically and on unload
const syncCachesToStorage = async () => {
  try {
    // Metrics
    for (const [key, entry] of Array.from(metricsCache.entries())) {
      const ttl = entry.expiresAt ? entry.expiresAt - Date.now() : 30 * 60 * 1000; // Default 30min
      await cacheAPI.set(key, entry, Math.max(ttl, 0));
    }
    
    // Scatter
    for (const [key, entry] of Array.from(scatterCache.entries())) {
      const ttl = entry.expiresAt ? entry.expiresAt - Date.now() : 30 * 60 * 1000;
      await cacheAPI.set(key, entry, Math.max(ttl, 0));
    }
    
    // Plugin
    for (const [key, entry] of Array.from(pluginCache.entries())) {
      const ttl = entry.expiresAt ? entry.expiresAt - Date.now() : 30 * 60 * 1000;
      await cacheAPI.set(key, entry, Math.max(ttl, 0));
    }
  } catch (e) {
    console.warn('Failed to sync caches to cacheAPI:', e);
  }
};

export const CacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const initialized = useRef(false);

  // Initialize caches from cacheAPI on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initializeCaches()
        .then(() => setIsInitialized(true))
        .catch(e => {
          console.error('Failed to initialize caches:', e);
          setIsInitialized(true); // Still set to true to allow app to continue
        });
    }
  }, []);

  // Sync caches to cacheAPI periodically and on unload/visibility change
  useEffect(() => {
    const syncAll = async () => {
      await syncCachesToStorage();
    };

    const interval = setInterval(syncAll, 500); // Sync every 0.5s

    const handleBeforeUnload = async () => {
      await syncAll();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        syncAll();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const clearAllCaches = async () => {
    metricsCache.clear();
    scatterCache.clear();
    pluginCache.clear();
    await cacheAPI.clear();
  };

  const value: CacheContextType = {
    metricsCache,
    scatterCache,
    pluginCache,
    clearAllCaches,
  };

  // Don't render children until cache is loaded
  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading cache...
      </div>
    );
  }

  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
};

export const useGlobalCache = (): CacheContextType => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useGlobalCache must be used within CacheProvider');
  }
  return context;
};
