import { fetchTimeSeriesData, fetchRawTimeSeriesData, clearTimeSeriesCache } from './fetchTimeSeries';
import { cacheAPI } from '../utils/cacheApiWrapper';

// Mock cacheAPI
jest.mock('../utils/cacheApiWrapper', () => ({
  cacheAPI: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn(() => Promise.resolve([])),
  },
}));

describe('fetchTimeSeriesData', () => {
  const createMockResponse = (data: object, ok = true, status = 200, sessionToken: string | null = null) => ({
    ok,
    status,
    headers: { get: jest.fn((key: string) => key === 'X-Session-ID' ? sessionToken : null) },
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve('Error')),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    (cacheAPI.get as jest.Mock).mockResolvedValue(null);
    (cacheAPI.set as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('should parse and structure time series data correctly', async () => {
      const mockJson = {
        '2025-01-01T00:00:00Z': {
          temperature: { model1: 22.5, model2: 23.1 },
          humidity: { sensor: 65 }
        },
        '2025-01-01T01:00:00Z': {
          temperature: { model1: 21.8, model2: 22.0 }
        }
      };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockJson));

      const result = await fetchTimeSeriesData();

      expect(Object.keys(result)).toContain('temperature.model1');
      expect(result['temperature.model1']).toHaveLength(2);
      expect(result['temperature.model1'][0]).toEqual({ x: '2025-01-01T00:00:00Z', y: 22.5 });
      expect(result['temperature.model1'][1]).toEqual({ x: '2025-01-01T01:00:00Z', y: 21.8 });
      expect(result['temperature.model2']).toHaveLength(2);
      expect(result['humidity.sensor']).toHaveLength(1);
    });

    it('should include start and end parameters in URL', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      await fetchTimeSeriesData('2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip invalid data structures', async () => {
      const mockJson = {
        'ts1': { group: null },
        'ts2': { group: { series: 'not_number' } },
        'ts3': { invalid: {} }
      };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockJson));

      const result = await fetchTimeSeriesData();
      expect(result).toEqual({});
    });

    it('should skip invalid timestampData and continue processing valid ones', async () => {
      const mockJson = {
        'ts1': null,
        'ts2': { group: { series: 10 } },
        'ts3': 'invalid_string'
      };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockJson));

      const result = await fetchTimeSeriesData();
      expect(result).toEqual({
        'group.series': [{ x: 'ts2', y: 10 }]
      });
    });
  });

  describe('error handling', () => {
    it('should throw on failed fetch', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 500));

      await expect(fetchTimeSeriesData()).rejects.toThrow('Error');
    });

    it('should throw on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchTimeSeriesData()).rejects.toThrow();
    });

    it('should throw on rate limit (429)', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
        text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(fetchTimeSeriesData()).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('caching', () => {
    it('should return cached data if available', async () => {
      const cachedData = {
        data: { 'temp.a': [{ x: '2025-01-01T00:00:00Z', y: 10 }] },
        timestamp: Date.now()
      };
      (cacheAPI.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await fetchTimeSeriesData();

      expect(result).toEqual(cachedData.data);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should cache fetched data', async () => {
      const mockJson = {
        '2025-01-01T00:00:00Z': { temp: { a: 10 } }
      };
      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockJson));

      await fetchTimeSeriesData();

      expect(cacheAPI.set).toHaveBeenCalledWith(
        expect.stringContaining('timeseries:'),
        expect.objectContaining({ data: expect.any(Object), timestamp: expect.any(Number) }),
        expect.any(Number)
      );
    });

    it('should handle cache check failure gracefully', async () => {
      (cacheAPI.get as jest.Mock).mockRejectedValue(new Error('Cache error'));
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      await fetchTimeSeriesData();

      expect(console.warn).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle cache set failure gracefully', async () => {
      (cacheAPI.set as jest.Mock).mockRejectedValue(new Error('Cache error'));
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      await fetchTimeSeriesData();

      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      await fetchTimeSeriesData();

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, true, 200, newToken));

      await fetchTimeSeriesData();

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});

describe('fetchRawTimeSeriesData', () => {
  const createMockResponse = (data: object, ok = true, status = 200, sessionToken: string | null = null) => ({
    ok,
    status,
    headers: { get: jest.fn((key: string) => key === 'X-Session-ID' ? sessionToken : null) },
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve('Fail')),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
  });

  it('should fetch and return raw JSON data', async () => {
    const mockRaw = { raw: 'data' };
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockRaw));

    const result = await fetchRawTimeSeriesData();
    expect(result).toEqual(mockRaw);
  });

  it('should throw on failed raw fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 500));

    await expect(fetchRawTimeSeriesData()).rejects.toThrow('Fail');
  });

  it('should throw on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchRawTimeSeriesData()).rejects.toThrow();
  });

  it('should throw on rate limit (429)', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
      text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchRawTimeSeriesData()).rejects.toThrow(/Rate limit exceeded/);
  });

  it('should handle session token', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

    await fetchRawTimeSeriesData();

    const callOptions = (fetch as jest.Mock).mock.calls[0][1];
    expect(callOptions.headers['X-Session-ID']).toBe('test-token');
  });
});

describe('clearTimeSeriesCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should clear all timeseries cache entries', async () => {
    (cacheAPI.keys as jest.Mock).mockResolvedValue(['timeseries:start|end', 'timeseries:no-start|no-end', 'other-key']);
    (cacheAPI.delete as jest.Mock).mockResolvedValue(undefined);

    await clearTimeSeriesCache();

    expect(cacheAPI.delete).toHaveBeenCalledWith('timeseries:start|end');
    expect(cacheAPI.delete).toHaveBeenCalledWith('timeseries:no-start|no-end');
    expect(cacheAPI.delete).not.toHaveBeenCalledWith('other-key');
  });

  it('should handle delete failures gracefully', async () => {
    (cacheAPI.keys as jest.Mock).mockResolvedValue(['timeseries:key']);
    (cacheAPI.delete as jest.Mock).mockRejectedValue(new Error('Delete error'));

    await clearTimeSeriesCache();

    expect(console.warn).toHaveBeenCalled();
  });
});