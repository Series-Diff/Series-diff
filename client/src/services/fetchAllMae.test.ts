import { fetchAllMae } from './fetchAllMae';

describe('fetchAllMae', () => {
  const filenamesPerCategory = {
    temperature: ['fileA.json', 'fileB.csv']
  };

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
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful requests', () => {
    it('fetches MAE for all pairs correctly', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ mae: 1.23 })) // A->B
        .mockResolvedValueOnce(createMockResponse({ mae: 1.23 })); // B->A

      const result = await fetchAllMae(filenamesPerCategory, undefined, undefined, '5T');

      expect(result.temperature['fileA.json']['fileB.csv']).toBe(1.23);
      expect(result.temperature['fileB.csv']['fileA.json']).toBe(1.23);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tolerance=5T'),
        expect.anything()
      );
    });

    it('should handle empty categories', async () => {
      const result = await fetchAllMae({});
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('skips same file comparison', async () => {
      const result = await fetchAllMae({ temp: ['a'] });
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should include start and end parameters', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mae: 1.0 }));

      await fetchAllMae(filenamesPerCategory, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip null MAE values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ mae: null }))
        .mockResolvedValueOnce(createMockResponse({ mae: 2.0 }));

      const result = await fetchAllMae(filenamesPerCategory);

      expect(result.temperature['fileA.json']).toEqual({});
      expect(result.temperature['fileB.csv']['fileA.json']).toBe(2.0);
    });
  });

  describe('error handling', () => {
    it('handles fetch errors with partial data', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({}, false, 404))
        .mockResolvedValueOnce(createMockResponse({ mae: 2.0 }));

      const result = await fetchAllMae(filenamesPerCategory);

      expect(result.temperature['fileA.json']).toEqual({});
      expect(result.temperature['fileB.csv']['fileA.json']).toBe(2.0);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('throws on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchAllMae(filenamesPerCategory)).rejects.toThrow();
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

      await expect(fetchAllMae(filenamesPerCategory)).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mae: 1.5 }));

      await fetchAllMae({ temp: ['a', 'b'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mae: 1.5 }, true, 200, newToken));

      await fetchAllMae({ temp: ['a', 'b'] });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });

  describe('multiple categories', () => {
    it('handles multiple categories', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ mae: 1.0 }))
        .mockResolvedValueOnce(createMockResponse({ mae: 1.0 }))
        .mockResolvedValueOnce(createMockResponse({ mae: 2.0 }))
        .mockResolvedValueOnce(createMockResponse({ mae: 2.0 }));

      const result = await fetchAllMae({
        temp: ['a', 'b'],
        humidity: ['x', 'y']
      });

      expect(result.temp['a']['b']).toBe(1.0);
      expect(result.humidity['x']['y']).toBe(2.0);
    });
  });
});
