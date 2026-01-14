import { fetchAllDifferences } from './fetchAllDifferences';

describe('fetchAllDifferences', () => {
  const input = {
    temp: ['a.json', 'b.json'],
    hum: ['c.csv']
  };

  const createMockResponse = (data: object, ok = true, status = 200, sessionToken: string | null = null) => ({
    ok,
    status,
    headers: { get: jest.fn((key: string) => key === 'X-Session-ID' ? sessionToken : null) },
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve('Server error')),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('returns correctly structured differences', async () => {
      const mockDiff = {
        difference: {
          '2025-01-01T00:00:00Z': 1.5,
          '2025-01-01T01:00:00Z': 2.3
        }
      };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockDiff));

      const result = await fetchAllDifferences(input, 5);

      expect(result.temp['a.json - b.json']).toHaveLength(2);
      expect(result.temp['a.json - b.json'][0]).toEqual({ x: '2025-01-01T00:00:00Z', y: 1.5 });
    });

    it('skips categories with fewer than 2 files', async () => {
      const result = await fetchAllDifferences({ hum: ['c.csv'] }, 5);
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle empty input', async () => {
      const result = await fetchAllDifferences({}, 5);
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('handles missing difference in response', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      const result = await fetchAllDifferences(input, 5);
      expect(result.temp).toEqual({});
    });

    it('handles tolerance null', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ difference: { '2025-01-01T00:00:00Z': 0.5 } }));

      await fetchAllDifferences(input, null);

      // With null tolerance, toleranceString is undefined so no tolerance param
      const fetchCall = (fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).not.toContain('tolerance=');
    });

    it('handles tolerance undefined', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ difference: { '2025-01-01T00:00:00Z': 0.5 } }));

      await fetchAllDifferences(input, undefined);

      const fetchCall = (fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).not.toContain('tolerance=');
    });

    it('sorts results by date', async () => {
      const mockDiff = {
        difference: {
          '2025-01-01T02:00:00Z': 3.0,
          '2025-01-01T00:00:00Z': 1.0,
          '2025-01-01T01:00:00Z': 2.0
        }
      };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockDiff));

      const result = await fetchAllDifferences(input, 5);

      expect(result.temp['a.json - b.json'][0].x).toBe('2025-01-01T00:00:00Z');
      expect(result.temp['a.json - b.json'][1].x).toBe('2025-01-01T01:00:00Z');
      expect(result.temp['a.json - b.json'][2].x).toBe('2025-01-01T02:00:00Z');
    });

    it('includes start and end parameters', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ difference: {} }));

      await fetchAllDifferences(input, 5, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });
  });

  describe('error handling', () => {
    it('throws on fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(fetchAllDifferences(input, 5)).rejects.toThrow();
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('throws on non-ok responses', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 500));

      await expect(fetchAllDifferences(input, 5)).rejects.toThrow();
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('throws on rate limit (429)', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
        text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(fetchAllDifferences(input, 5)).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ difference: {} }));

      await fetchAllDifferences(input, 5);

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ difference: {} }, true, 200, newToken));

      await fetchAllDifferences(input, 5);

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });

  describe('multiple categories', () => {
    it('processes multiple categories with multiple files', async () => {
      const multiInput = {
        temp: ['a.json', 'b.json', 'c.json'],
        humidity: ['x.json', 'y.json']
      };

      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ difference: { '2025-01-01T00:00:00Z': 1.0 } })) // a-b
        .mockResolvedValueOnce(createMockResponse({ difference: { '2025-01-01T00:00:00Z': 2.0 } })) // a-c
        .mockResolvedValueOnce(createMockResponse({ difference: { '2025-01-01T00:00:00Z': 3.0 } })) // b-c
        .mockResolvedValueOnce(createMockResponse({ difference: { '2025-01-01T00:00:00Z': 4.0 } })); // x-y

      const result = await fetchAllDifferences(multiInput, 5);

      expect(result.temp['a.json - b.json']).toBeDefined();
      expect(result.temp['a.json - c.json']).toBeDefined();
      expect(result.temp['b.json - c.json']).toBeDefined();
      expect(result.humidity['x.json - y.json']).toBeDefined();
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });
});