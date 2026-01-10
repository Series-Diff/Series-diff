import { apiLogger } from '../utils/apiLogger';
import { cacheAPI } from '../utils/cacheApiWrapper';

type TimeSeriesCacheEntry = {
  data: TimeSeriesResponse;
  timestamp: number;
};

const TIME_SERIES_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export type TimeSeriesEntry = {
  x: string; // ISO string timestamp
  y: number;
};

export type TimeSeriesResponse = Record<string, TimeSeriesEntry[]>;

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('session_token');
  return token ? { 'X-Session-ID': token } : {};
};

const handleSessionToken = (response: Response) => {
  const newToken = response.headers.get('X-Session-ID');
  if (newToken) {
    localStorage.setItem('session_token', newToken);
  }
};

export const clearTimeSeriesCache = async () => {
  // Clear all time series entries from cacheAPI
  const keys = await cacheAPI.keys();
  for (const key of keys) {
    if (key.startsWith('timeseries:')) {
      try {
        await cacheAPI.delete(key);
      } catch (e) {
        console.warn(`Failed to delete cache entry ${key}:`, e);
      }
    }
  }
};

export const fetchTimeSeriesData = async (
  start?: string,
  end?: string
): Promise<TimeSeriesResponse> => {
  const cacheKey = `timeseries:${start || 'no-start'}|${end || 'no-end'}`;
  
  // Check cacheAPI first
  try {
    const cached = await cacheAPI.get<TimeSeriesCacheEntry>(cacheKey);
    if (cached) {
      apiLogger.logQuery('/api/timeseries', 'GET', {
        params: { start, end },
        fromCache: true,
        cacheKey,
        duration: 0,
        status: 200,
      });
      return cached.data;
    }
  } catch (e) {
    console.warn('Failed to check timeseries cache:', e);
  }

  let url = `${API_URL}/api/timeseries`;
  const params: string[] = [];
  if (start) params.push(`start=${encodeURIComponent(start)}`);
  if (end) params.push(`end=${encodeURIComponent(end)}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  const startTime = performance.now();

  apiLogger.logQuery('/api/timeseries', 'GET', {
    params: { start, end },
  });

  const resp = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) throw new Error(await resp.text());
  const duration = Math.round(performance.now() - startTime);
  apiLogger.logQuery('/api/timeseries', 'GET', {
    params: { start, end },
    duration,
    status: resp.status,
  });

  const json: Record<string, Record<string, Record<string, number>>> = await resp.json();
  const out: TimeSeriesResponse = {};

  for (const [timestamp, timestampData] of Object.entries(json)) {
    if (typeof timestampData !== 'object' || timestampData === null) continue;

    for (const [groupName, seriesData] of Object.entries(timestampData)) {
      if (typeof seriesData !== 'object' || seriesData === null) continue;

      for (const [seriesName, value] of Object.entries(seriesData)) {
        if (typeof value !== 'number') continue;

        const compositeKey = `${groupName}.${seriesName}`;
        if (!out[compositeKey]) out[compositeKey] = [];
        out[compositeKey].push({ x: timestamp, y: value });
      }
    }
  }

  // Cache the response using cacheAPI
  const cacheEntry: TimeSeriesCacheEntry = { data: out, timestamp: Date.now() };
  try {
    await cacheAPI.set(cacheKey, cacheEntry, TIME_SERIES_CACHE_DURATION);
  } catch (e) {
    console.warn('Failed to cache time series data:', e);
  }

  return out;
};

export const fetchRawTimeSeriesData = async (): Promise<Record<string, any[]>> => {
  const resp = await fetch(`${API_URL}/api/timeseries`, {
    headers: getAuthHeaders(),
  });

  handleSessionToken(resp);

  if (!resp.ok) throw new Error(await resp.text());

  return await resp.json();
};
