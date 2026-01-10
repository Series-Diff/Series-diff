/**
 * Metrics Cache Manager
 * Handles caching of all dashboard metrics and statistics
 * Now supports external cache Map for global persistence
 */

import { apiLogger } from './apiLogger';

export interface CacheKey {
  metricType: string; // 'mean', 'median', 'variance', 'stdDev', 'autocorrelation', etc.
  category: string;
  dateRange: string; // ISO date range format: "YYYY-MM-DD_to_YYYY-MM-DD"
  tolerance?: string; // For difference chart
  window?: string; // For moving average (e.g., "1d", "2d")
  fullDateRange?: boolean; // For "Calculate metrics on full date range" option
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  cacheKey?: string;
  error?: string; // Cached error message - if set, data should be ignored
}

/**
 * Generate a unique cache key from cache parameters
 * Prefixed with 'metrics:' for proper cache segregation
 */
export const buildMetricsCacheKey = (params: CacheKey): string => {
  const parts = [
    'metrics',
    params.metricType,
    params.category,
    params.dateRange,
    params.tolerance || 'no-tolerance',
    params.window || 'no-window',
    params.fullDateRange ? 'full-range' : 'partial-range',
  ];
  return parts.join('|');
};

/**
 * Metrics Cache Manager - handles all metric caching with external cache support
 */
class MetricsCacheManager {
  private cache: Map<string, CacheEntry<unknown>> | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  // Optional change listener to notify external systems when a cache key is set/deleted
  private changeListener?: (key: string, action: 'set' | 'delete') => void;

  /**
   * Set external cache (from CacheContext)
   */
  setCache(externalCache: Map<string, CacheEntry<unknown>>) {
    this.cache = externalCache;
  }

  /**
   * Optional listener registration so outer code can mark dirty keys or sync
   */
  setChangeListener(listener: (key: string, action: 'set' | 'delete') => void) {
    this.changeListener = listener;
  }

  /**
   * Get cache instance (fallback to temp Map if not set)
   */
  private getCache(): Map<string, CacheEntry<unknown>> {
    if (!this.cache) {
      this.cache = new Map();
    }
    return this.cache;
  }

  /**
   * Get cached metric data
   */
  get<T>(params: CacheKey): T | null {
    const cacheKey = buildMetricsCacheKey(params);
    const cache = this.getCache();
    const entry = cache.get(cacheKey);

    if (!entry) {
      apiLogger.logQuery(
        `metric_${params.metricType}`,
        'GET',
        {
          params,
          fromCache: false,
          duration: 0,
        }
      );
      return null;
    }

    // Check if cache has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cache.delete(cacheKey);
      try { this.changeListener?.(cacheKey, 'delete'); } catch(e) { console.warn('changeListener error:', e); }
      return null;
    }

    // Log cache hit (will be skipped by apiLogger now)
    apiLogger.logQuery(
      `metric_${params.metricType}`,
      'GET',
      {
        params,
        fromCache: true,
        cacheKey,
        duration: 0,
      }
    );

    return entry.data as T;
  }

  /**
   * Set cached metric data
   */
  set<T>(params: CacheKey, data: T, duration?: number): void {
    const cacheKey = buildMetricsCacheKey(params);
    const cache = this.getCache();
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (duration || this.CACHE_DURATION),
      cacheKey,
    };

    cache.set(cacheKey, entry);

    // Notify listener that a key was set so outer code can mark dirty keys for persistence
    try { this.changeListener?.(cacheKey, 'set'); } catch(e) { console.warn('changeListener error:', e); }

    apiLogger.logQuery(
      `metric_${params.metricType}`,
      'POST',
      {
        params,
        fromCache: false,
        cacheKey,
        duration: 0,
      }
    );
  }

  /**
   * Set cached error for a metric - stores error so page reload shows error instead of retrying
   */
  setError(params: CacheKey, errorMessage: string, duration?: number): void {
    const cacheKey = buildMetricsCacheKey(params);
    const cache = this.getCache();
    const entry: CacheEntry<null> = {
      data: null,
      timestamp: Date.now(),
      expiresAt: Date.now() + (duration || this.CACHE_DURATION),
      cacheKey,
      error: errorMessage,
    };

    cache.set(cacheKey, entry);

    // Notify listener that a key was set so outer code can mark dirty keys for persistence
    try { this.changeListener?.(cacheKey, 'set'); } catch(e) { console.warn('changeListener error:', e); }
  }

  /**
   * Get cached error for a metric (if any)
   */
  getError(params: CacheKey): string | null {
    const cacheKey = buildMetricsCacheKey(params);
    const cache = this.getCache();
    const entry = cache.get(cacheKey);

    if (!entry) return null;

    // Check if cache has expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cache.delete(cacheKey);
      try { this.changeListener?.(cacheKey, 'delete'); } catch(e) { console.warn('changeListener error:', e); }
      return null;
    }

    return entry.error || null;
  }

  /**
   * Clear cached error for a metric (used when user clicks Retry)
   */
  clearError(params: CacheKey): void {
    const cacheKey = buildMetricsCacheKey(params);
    const cache = this.getCache();
    const entry = cache.get(cacheKey);

    if (entry && entry.error) {
      cache.delete(cacheKey);
      try { this.changeListener?.(cacheKey, 'delete'); } catch(e) { console.warn('changeListener error:', e); }
    }
  }

  /**
   * Check if metric is cached
   */
  has(params: CacheKey): boolean {
    const cacheKey = buildMetricsCacheKey(params);
    const cache = this.getCache();
    const entry = cache.get(cacheKey);

    if (!entry) return false;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Clear cache for a specific metric type
   */
  clearMetricType(metricType: string): void {
    const cache = this.getCache();
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      if (key.startsWith(metricType + '|')) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => {
      cache.delete(key);
      try { this.changeListener?.(key, 'delete'); } catch(e) { console.warn('changeListener error:', e); }
    });
  }

  /**
   * Clear cache for a specific category
   */
  clearCategory(category: string): void {
    const cache = this.getCache();
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      const parts = key.split('|');
      if (parts[1] === category) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cache.delete(key));
  }

  /**
   * Clear cache for a specific date range (when date range changes)
   */
  clearDateRange(dateRange: string): void {
    const cache = this.getCache();
    const keysToDelete: string[] = [];
    cache.forEach((_, key) => {
      const parts = key.split('|');
      if (parts[2] === dateRange) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    const cache = this.getCache();
    for (const key of Array.from(cache.keys())) {
      cache.delete(key);
      try { this.changeListener?.(key, 'delete'); } catch(e) { console.warn('changeListener error:', e); }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    cacheSize: string;
    entries: Array<{ key: string; age: number; expiresIn: number }>;
  } {
    const cache = this.getCache();
    const now = Date.now();
    const entries: Array<{ key: string; age: number; expiresIn: number }> = [];
    
    cache.forEach((entry, key) => {
      entries.push({
        key,
        age: now - entry.timestamp,
        expiresIn: (entry.expiresAt || 0) - now,
      });
    });

    // Rough estimate of cache size
    const cacheSize = JSON.stringify(Array.from(cache.entries())).length;

    return {
      totalEntries: cache.size,
      cacheSize: `${(cacheSize / 1024).toFixed(2)} KB`,
      entries,
    };
  }

  /**
   * Print cache statistics to console
   */
  printStats(): void {
    const stats = this.getStats();
    console.group('Metrics Cache Statistics');
    console.log('Total Entries:', stats.totalEntries);
    console.log('Cache Size:', stats.cacheSize);
    console.table(stats.entries);
    console.groupEnd();
  }
}

// Export singleton instance
export const metricsCacheManager = new MetricsCacheManager();

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).metricsCacheManager = metricsCacheManager;
}
