import { fetchAllRollingMeans, fetchRollingMean } from './fetchAllRollingMeans';

describe('fetchAllRollingMeans', () => {
  const input = { temp: ['a.json'], hum: ['b.csv', 'c.json'] };
  const window = '7d';

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
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('returns correctly structured rolling means', async () => {
      const mockResponse = {
        rolling_mean: {
          '2025-01-01T00:00:00Z': 21.5,
          '2025-01-01T01:00:00Z': 21.8
        }
      };

      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse(mockResponse))
        .mockResolvedValueOnce(createMockResponse(mockResponse))
        .mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await fetchAllRollingMeans(input, window);

      expect(Object.keys(result)).toContain('temp.a.json.rolling_mean');
      expect(result['temp.a.json.rolling_mean']).toHaveLength(2);
      expect(result['temp.a.json.rolling_mean'][0]).toEqual({ x: '2025-01-01T00:00:00Z', y: 21.5 });
      expect(Object.keys(result)).toContain('hum.b.csv.rolling_mean');
      expect(Object.keys(result)).toContain('hum.c.json.rolling_mean');
    });

    it('should handle empty input', async () => {
      const result = await fetchAllRollingMeans({}, window);
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('includes start and end parameters', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rolling_mean: { '2025-01-01T00:00:00Z': 1.0 } }));

      await fetchAllRollingMeans({ temp: ['a.json'] }, window, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('sorts results by date', async () => {
      const mockResponse = {
        rolling_mean: {
          '2025-01-01T02:00:00Z': 3.0,
          '2025-01-01T00:00:00Z': 1.0,
          '2025-01-01T01:00:00Z': 2.0
        }
      };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockResponse));

      const result = await fetchAllRollingMeans({ temp: ['a.json'] }, window);

      expect(result['temp.a.json.rolling_mean'][0].y).toBe(1.0);
      expect(result['temp.a.json.rolling_mean'][1].y).toBe(2.0);
      expect(result['temp.a.json.rolling_mean'][2].y).toBe(3.0);
    });
  });

  describe('error handling', () => {
    it('handles malformed responses and errors - throws when all fail', async () => {
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'));

      await expect(fetchAllRollingMeans(input, window)).rejects.toThrow();
    });

    it('throws on failed fetch in fetchRollingMean', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 500));

      await expect(fetchRollingMean('cat', 'file', 'window')).rejects.toThrow('Fail');
    });

    it('throws on rate limit (429)', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
        text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(fetchRollingMean('cat', 'file', 'window')).rejects.toThrow(/Rate limit exceeded/);
    });

    it('returns partial data when some requests succeed', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ rolling_mean: { '2025-01-01T00:00:00Z': 21.5 } }))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'));

      const result = await fetchAllRollingMeans(input, window);

      expect(result['temp.a.json.rolling_mean']).toBeDefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles unexpected data structure', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rolling_mean: null }));

      const result = await fetchAllRollingMeans({ temp: ['a.json'] }, window);
      expect(result).toEqual({});
      expect(console.warn).toHaveBeenCalled();
    });

    it('handles non-number values in rolling_mean', async () => {
      const mockResponse = { rolling_mean: { 'ts': 'not_number' } };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockResponse));

      const result = await fetchAllRollingMeans({ temp: ['a.json'] }, window);
      // The implementation creates an empty array for the key when values are filtered out
      expect(result).toEqual({ 'temp.a.json.rolling_mean': [] });
    });

    it('handles empty rolling_mean object', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rolling_mean: {} }));

      const result = await fetchAllRollingMeans({ temp: ['a.json'] }, window);
      // The implementation creates an empty array for the key
      expect(result).toEqual({ 'temp.a.json.rolling_mean': [] });
    });

    it('handles missing rolling_mean in response', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      const result = await fetchAllRollingMeans({ temp: ['a.json'] }, window);
      expect(result).toEqual({});
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rolling_mean: { '2025-01-01T00:00:00Z': 1.0 } }));

      await fetchAllRollingMeans({ temp: ['a.json'] }, window);

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rolling_mean: { '2025-01-01T00:00:00Z': 1.0 } }, true, 200, newToken));

      await fetchAllRollingMeans({ temp: ['a.json'] }, window);

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});