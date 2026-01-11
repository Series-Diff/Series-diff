import React, { createContext, useContext, useRef, useEffect } from 'react';
import { cacheAPI } from '../utils/cacheApiWrapper';
import { metricsCacheManager, buildMetricsCacheKey, CacheKey as MetricsCacheKey } from '../utils/metricsCacheManager';

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
  removeCacheKey: (key: string) => Promise<void>;
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
        setScatterEntry(key, data as any);
      } else if (key.startsWith('plugin|')) {
        setPluginEntry(key, data as any);
      } else if (key.startsWith('metrics|') || key.startsWith('timeseries:')) {
        // Normalize legacy metric keys to a canonical builder (order + defaults)
        let normalizedKey = key;

        // Legacy stdDev -> std_dev
        if (normalizedKey.startsWith('metrics|stdDev|')) {
          normalizedKey = normalizedKey.replace('metrics|stdDev|', 'metrics|std_dev|');
          try { cacheAPI.delete(key).catch(() => {}); } catch (e) { /* ignore */ }
        }

        if (normalizedKey.startsWith('metrics|')) {
          const parts = normalizedKey.split('|');
          if (parts.length >= 4) {
            const params: MetricsCacheKey = {
              metricType: parts[1],
              category: parts[2],
              dateRange: parts[3],
              tolerance: parts[4] || 'no-tolerance',
              window: parts[5] || 'no-window',
              fullDateRange: (parts[6] || 'partial-range') === 'full-range',
            };
            normalizedKey = buildMetricsCacheKey(params);
          }
        }

        setMetricsEntry(normalizedKey, data as any);
      }
      // Ignore unknown prefixes
    }

    // After populating the in-memory maps, set metrics cache manager to use the same Map
    // Must be done synchronously so that hooks accessing it verify cache immediately
    try {
      metricsCacheManager.setCache(metricsCache as any);
    } catch (e) {
      console.warn('Failed to link metricsCacheManager:', e);
    }

  } catch (e) {
    console.warn('Failed to initialize caches from cacheAPI:', e);
  }
};

// Sync caches to cacheAPI - called periodically and on unload
// Track dirty keys so we only sync entries that changed since last sync
const dirtyMetricsKeys = new Set<string>();
const dirtyScatterKeys = new Set<string>();
const dirtyPluginKeys = new Set<string>();

const syncCachesToStorage = async () => {
  try {
    // Only sync modified metric keys
    for (const key of Array.from(dirtyMetricsKeys)) {
      const entry = metricsCache.get(key);
      if (!entry) {
        try { await cacheAPI.delete(key); } catch(e) {}
        dirtyMetricsKeys.delete(key);
        continue;
      }
      const ttl = entry.expiresAt ? entry.expiresAt - Date.now() : 30 * 60 * 1000; // Default 30min
      await cacheAPI.set(key, entry, Math.max(ttl, 0));
      dirtyMetricsKeys.delete(key);
    }

    // Only sync modified scatter keys
    for (const key of Array.from(dirtyScatterKeys)) {
      const entry = scatterCache.get(key);
      if (!entry) {
        try { await cacheAPI.delete(key); } catch(e) {}
        dirtyScatterKeys.delete(key);
        continue;
      }
      const ttl = entry.expiresAt ? entry.expiresAt - Date.now() : 30 * 60 * 1000;
      await cacheAPI.set(key, entry, Math.max(ttl, 0));
      dirtyScatterKeys.delete(key);
    }

    // Only sync modified plugin keys
    for (const key of Array.from(dirtyPluginKeys)) {
      const entry = pluginCache.get(key);
      if (!entry) {
        try { await cacheAPI.delete(key); } catch(e) {}
        dirtyPluginKeys.delete(key);
        continue;
      }
      const ttl = entry.expiresAt ? entry.expiresAt - Date.now() : 30 * 60 * 1000;
      await cacheAPI.set(key, entry, Math.max(ttl, 0));
      dirtyPluginKeys.delete(key);
    }
  } catch (e) {
    console.warn('Failed to sync caches to cacheAPI:', e);
  }
};

// Helper functions to set/delete entries and mark dirty keys (avoid Proxy to keep Map methods intact)
const setMetricsEntry = (key: string, entry: CacheEntry<any>) => {
  metricsCache.set(key, entry);
  dirtyMetricsKeys.add(key);
};
const deleteMetricsEntry = (key: string) => {
  metricsCache.delete(key);
  dirtyMetricsKeys.add(key);
};
const clearMetricsMap = () => {
  for (const k of Array.from(metricsCache.keys())) dirtyMetricsKeys.add(k);
  metricsCache.clear();
};

const setScatterEntry = (key: string, entry: CacheEntry<any>) => {
  scatterCache.set(key, entry);
  dirtyScatterKeys.add(key);
};
const deleteScatterEntry = (key: string) => {
  scatterCache.delete(key);
  dirtyScatterKeys.add(key);
};
const clearScatterMap = () => {
  for (const k of Array.from(scatterCache.keys())) dirtyScatterKeys.add(k);
  scatterCache.clear();
};

const setPluginEntry = (key: string, entry: CacheEntry<any>) => {
  pluginCache.set(key, entry);
  dirtyPluginKeys.add(key);
};
const deletePluginEntry = (key: string) => {
  pluginCache.delete(key);
  dirtyPluginKeys.add(key);
};
const clearPluginMap = () => {
  for (const k of Array.from(pluginCache.keys())) dirtyPluginKeys.add(k);
  pluginCache.clear();
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

  // Expose helpers on window for debugging convenience (do not use in production code)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).setMetricsEntry = setMetricsEntry;
      (window as any).deleteMetricsEntry = deleteMetricsEntry;
      (window as any).setPluginEntry = setPluginEntry;
      (window as any).deletePluginEntry = deletePluginEntry;
    }

    // Register metricsCacheManager change listener so any calls to metricsCacheManager.set/delete
    // (which use the same Map instance after setCache) will mark dirty keys for persistence.
    // Additionally, eagerly persist the entry to cacheAPI when set so reloads immediately have a copy.
    try {
      metricsCacheManager.setChangeListener(async (key: string, action: 'set' | 'delete') => {
        try {
          if (action === 'set') {
            dirtyMetricsKeys.add(key);
            const entry = metricsCache.get(key);
            if (entry) {
              const ttl = entry.expiresAt ? entry.expiresAt - Date.now() : 30 * 60 * 1000;
              cacheAPI.set(key, entry, Math.max(ttl, 0)).catch(() => {});
            }
          }
          if (action === 'delete') {
            dirtyMetricsKeys.add(key);
            cacheAPI.delete(key).catch(() => {});
          }
        } catch (e) {
          // swallow to avoid impacting main thread
        }
      });
    } catch (e) {
      // ignore if metricsCacheManager not ready
    }
  }, []);

  // Sync caches to cacheAPI periodically and on unload/visibility change
  useEffect(() => {
    const syncAll = async () => {
      await syncCachesToStorage();
    };

    const rawInterval = process.env.REACT_APP_CACHE_SYNC_INTERVAL_MS;
    const parsedInterval = rawInterval != null ? parseInt(rawInterval, 10) : NaN;
    const intervalMs = Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : 5000;
    const interval = setInterval(syncAll, Math.max(1000, intervalMs)); // min 1s

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
    clearMetricsMap();
    clearScatterMap();
    clearPluginMap();
    await cacheAPI.clear();
  };

  // Helper to remove a single cache key immediately (updates in-memory map + cacheAPI)
  const removeCacheKey = async (key: string) => {
    if (metricsCache.has(key)) {
      deleteMetricsEntry(key);
    }
    if (scatterCache.has(key)) {
      deleteScatterEntry(key);
    }
    if (pluginCache.has(key)) {
      deletePluginEntry(key);
    }
    try {
      await cacheAPI.delete(key);
    } catch (e) {
      console.warn('Failed to remove cache key from cacheAPI', e);
    }
  };


  const value: CacheContextType = {
    metricsCache,
    scatterCache,
    pluginCache,
    clearAllCaches,
    removeCacheKey,
  };

  // Helpful debug hook for manual deletion from console
  if (typeof window !== 'undefined') {
    (window as any).removeCacheKey = removeCacheKey;
    (window as any).metricsCache = metricsCache;
    (window as any).pluginCache = pluginCache;
  }

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
