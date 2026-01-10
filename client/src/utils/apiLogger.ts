/**
 * API Logger - Centralized logging for all API queries
 * Logs every API request with details like URL, parameters, caching status, and timing
 * Only shows OK/ERROR/CACHE, no PENDING spam
 */

interface ApiLogEntry {
  timestamp: string;
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  endpoint: string;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  fromCache: boolean;
  status?: number;
  duration: number; // milliseconds
  cached?: boolean;
  cacheKey?: string;
}

class ApiLogger {
  private logs: ApiLogEntry[] = [];
  private readonly MAX_LOGS = 1000; // Prevent memory overflow

  /**
   * Log an API query - only shows real network requests (OK/ERROR)
   * Cache hits are not logged (empty log = using cache)
   */
  logQuery(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH' = 'GET',
    options: {
      params?: Record<string, any>;
      fromCache?: boolean;
      cacheKey?: string;
      duration?: number;
      status?: number;
      headers?: Record<string, string>;
    } = {}
  ): void {
    const {
      params,
      fromCache = false,
      cacheKey,
      duration = 0,
      status,
      headers,
    } = options;

    const entry: ApiLogEntry = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      params,
      headers,
      fromCache,
      status,
      duration,
      cacheKey,
    };

    this.logs.push(entry);

    // Keep memory under control
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Only log real network requests (OK/ERROR), skip cache hits
    if (status && !fromCache) {
      this.printLog(entry);
    }
  }

  /**
   * Pretty print log entry to console - compact format
   * Only for real network requests (not cache hits)
   */
  private printLog(entry: ApiLogEntry): void {
    const statusIndicator =
      entry.status && entry.status >= 200 && entry.status < 300
        ? '[OK]'
        : entry.status
          ? '[ERROR]'
          : '';

    const logPrefix = `${statusIndicator} ${entry.method} ${entry.endpoint} [${entry.duration}ms]`;

    // Use color coding for clarity
    const style =
      entry.status && entry.status >= 200 && entry.status < 300
        ? 'color: #0d6; font-weight: bold;' // Green for OK
        : entry.status
          ? 'color: #d00; font-weight: bold;' // Red for error
          : '';

    console.log(`%c${logPrefix}`, style);

    // Log params only if they exist
    if (entry.params && Object.keys(entry.params).length > 0) {
      console.log('  Params:', entry.params);
    }

    // Log error status if present
    if (entry.status && (entry.status < 200 || entry.status >= 300)) {
      console.log('  Status Code:', entry.status);
    }
  }

  /**
   * Get all logs
   */
  getLogs(): ApiLogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalQueries: number;
    cachedQueries: number;
    newQueries: number;
    averageDuration: number;
    cacheHitRate: string;
  } {
    const total = this.logs.length;
    const cached = this.logs.filter((log) => log.fromCache).length;
    const newQueries = total - cached;
    const averageDuration =
      total > 0
        ? this.logs.reduce((sum, log) => sum + log.duration, 0) / total
        : 0;
    const hitRate =
      total > 0 ? ((cached / total) * 100).toFixed(2) : '0.00';

    return {
      totalQueries: total,
      cachedQueries: cached,
      newQueries,
      averageDuration: Math.round(averageDuration),
      cacheHitRate: `${hitRate}%`,
    };
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const summary = this.getSummary();
    console.group('API Query Summary');
    console.table(summary);
    console.groupEnd();
  }
}

// Export singleton instance
export const apiLogger = new ApiLogger();

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).apiLogger = apiLogger;
}
