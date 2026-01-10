/**
 * Cache API Wrapper with localStorage fallback
 * Provides a unified interface for caching with TTL support
 * Automatically falls back to localStorage for browsers without Cache API
 */

const CACHE_NAME = 'SeriesDiff';
const METADATA_KEY = 'cache-metadata';

interface CacheMetadata {
  [key: string]: {
    expiresAt: number;
    timestamp: number;
  };
}

// Check if Cache API is available
const hasCacheAPI = typeof caches !== 'undefined' && 'open' in caches;

/**
 * Cache wrapper that uses Cache API with localStorage fallback
 */
export class CacheAPIWrapper {
  private useLocalStorage: boolean;
  private metadata: CacheMetadata = {};

  constructor() {
    this.useLocalStorage = !hasCacheAPI;
    
    if (this.useLocalStorage) {
      console.info('[CacheAPIWrapper] Cache API not available, using localStorage fallback');
      this.loadMetadata();
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.useLocalStorage) {
      return this.getFromLocalStorage<T>(key);
    }
    return this.getFromCacheAPI<T>(key);
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl : undefined;
    
    if (this.useLocalStorage) {
      return this.setInLocalStorage(key, value, expiresAt);
    }
    return this.setInCacheAPI(key, value, expiresAt);
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    if (this.useLocalStorage) {
      return this.deleteFromLocalStorage(key);
    }
    return this.deleteFromCacheAPI(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (this.useLocalStorage) {
      return this.clearLocalStorage();
    }
    return this.clearCacheAPI();
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    if (this.useLocalStorage) {
      return this.hasInLocalStorage(key);
    }
    return this.hasInCacheAPI(key);
  }

  /**
   * Get all cache keys
   */
  async keys(): Promise<string[]> {
    if (this.useLocalStorage) {
      return this.keysFromLocalStorage();
    }
    return this.keysFromCacheAPI();
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    if (this.useLocalStorage) {
      return this.cleanupLocalStorage();
    }
    return this.cleanupCacheAPI();
  }

  // ==================== Cache API Implementation ====================

  private async getFromCacheAPI<T>(key: string): Promise<T | null> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(this.buildCacheUrl(key));
      
      if (!response) return null;
      
      // Check expiration from headers
      const expiresAt = response.headers.get('X-Expires-At');
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        // Expired - delete and return null
        await cache.delete(this.buildCacheUrl(key));
        return null;
      }
      
      const data = await response.json();
      return data as T;
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to get from Cache API:', e);
      return null;
    }
  }

  private async setInCacheAPI<T>(key: string, value: T, expiresAt?: number): Promise<void> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const headers = new Headers({
        'Content-Type': 'application/json',
      });
      
      if (expiresAt) {
        headers.set('X-Expires-At', expiresAt.toString());
        headers.set('X-Timestamp', Date.now().toString());
      }
      
      const response = new Response(JSON.stringify(value), { headers });
      await cache.put(this.buildCacheUrl(key), response);
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to set in Cache API:', e);
    }
  }

  private async deleteFromCacheAPI(key: string): Promise<void> {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(this.buildCacheUrl(key));
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to delete from Cache API:', e);
    }
  }

  private async clearCacheAPI(): Promise<void> {
    try {
      await caches.delete(CACHE_NAME);
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to clear Cache API:', e);
    }
  }

  private async hasInCacheAPI(key: string): Promise<boolean> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(this.buildCacheUrl(key));
      
      if (!response) return false;
      
      // Check expiration
      const expiresAt = response.headers.get('X-Expires-At');
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        await cache.delete(this.buildCacheUrl(key));
        return false;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }

  private async keysFromCacheAPI(): Promise<string[]> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      return requests.map(req => this.extractKeyFromUrl(req.url));
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to get keys from Cache API:', e);
      return [];
    }
  }

  private async cleanupCacheAPI(): Promise<number> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      let cleaned = 0;
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (!response) continue;
        
        const expiresAt = response.headers.get('X-Expires-At');
        if (expiresAt && Date.now() > parseInt(expiresAt)) {
          await cache.delete(request);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to cleanup Cache API:', e);
      return 0;
    }
  }

  private buildCacheUrl(key: string): string {
    // Use a fake URL for Cache API (it needs a valid URL)
    return `https://cache-api-wrapper.local/${encodeURIComponent(key)}`;
  }

  private extractKeyFromUrl(url: string): string {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1]);
  }

  // ==================== localStorage Implementation ====================

  private loadMetadata(): void {
    try {
      const stored = localStorage.getItem(METADATA_KEY);
      this.metadata = stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to load metadata:', e);
      this.metadata = {};
    }
  }

  private saveMetadata(): void {
    try {
      localStorage.setItem(METADATA_KEY, JSON.stringify(this.metadata));
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to save metadata:', e);
      // QuotaExceeded - try to cleanup expired entries
      this.cleanupLocalStorage();
      try {
        localStorage.setItem(METADATA_KEY, JSON.stringify(this.metadata));
      } catch (retryErr) {
        console.error('[CacheAPIWrapper] Failed to save metadata after cleanup:', retryErr);
      }
    }
  }

  private getCacheKey(key: string): string {
    return `cache:${key}`;
  }

  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const cacheKey = this.getCacheKey(key);
      const meta = this.metadata[key];
      
      // Check expiration
      if (meta?.expiresAt && Date.now() > meta.expiresAt) {
        this.deleteFromLocalStorage(key);
        return null;
      }
      
      const stored = localStorage.getItem(cacheKey);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to get from localStorage:', e);
      return null;
    }
  }

  private setInLocalStorage<T>(key: string, value: T, expiresAt?: number): void {
    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.setItem(cacheKey, JSON.stringify(value));
      
      this.metadata[key] = {
        timestamp: Date.now(),
        expiresAt: expiresAt || 0,
      };
      this.saveMetadata();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[CacheAPIWrapper] localStorage quota exceeded, cleaning up...');
        this.cleanupLocalStorage();
        // Retry after cleanup
        try {
          const cacheKey = this.getCacheKey(key);
          localStorage.setItem(cacheKey, JSON.stringify(value));
          this.metadata[key] = {
            timestamp: Date.now(),
            expiresAt: expiresAt || 0,
          };
          this.saveMetadata();
        } catch (retryErr) {
          console.error('[CacheAPIWrapper] Failed to set after cleanup:', retryErr);
        }
      } else {
        console.warn('[CacheAPIWrapper] Failed to set in localStorage:', e);
      }
    }
  }

  private deleteFromLocalStorage(key: string): void {
    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.removeItem(cacheKey);
      delete this.metadata[key];
      this.saveMetadata();
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to delete from localStorage:', e);
    }
  }

  private clearLocalStorage(): void {
    try {
      const keys = Object.keys(this.metadata);
      for (const key of keys) {
        const cacheKey = this.getCacheKey(key);
        localStorage.removeItem(cacheKey);
      }
      this.metadata = {};
      localStorage.removeItem(METADATA_KEY);
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to clear localStorage:', e);
    }
  }

  private hasInLocalStorage(key: string): boolean {
    try {
      const meta = this.metadata[key];
      
      // Check expiration
      if (meta?.expiresAt && Date.now() > meta.expiresAt) {
        this.deleteFromLocalStorage(key);
        return false;
      }
      
      const cacheKey = this.getCacheKey(key);
      return localStorage.getItem(cacheKey) !== null;
    } catch (e) {
      return false;
    }
  }

  private keysFromLocalStorage(): string[] {
    return Object.keys(this.metadata);
  }

  private cleanupLocalStorage(): number {
    try {
      const now = Date.now();
      let cleaned = 0;
      
      // Remove expired entries
      const keys = Object.keys(this.metadata);
      for (const key of keys) {
        const meta = this.metadata[key];
        if (meta.expiresAt && now > meta.expiresAt) {
          this.deleteFromLocalStorage(key);
          cleaned++;
        }
      }
      
      // If still not enough space, remove oldest 30% of entries
      if (cleaned === 0) {
        const entries = keys.map(key => ({
          key,
          timestamp: this.metadata[key].timestamp,
        }));
        entries.sort((a, b) => a.timestamp - b.timestamp);
        
        const toPurge = Math.ceil(entries.length * 0.3);
        for (let i = 0; i < toPurge; i++) {
          this.deleteFromLocalStorage(entries[i].key);
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (e) {
      console.warn('[CacheAPIWrapper] Failed to cleanup localStorage:', e);
      return 0;
    }
  }
}

// Export singleton instance
export const cacheAPI = new CacheAPIWrapper();

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).cacheAPI = cacheAPI;
}
