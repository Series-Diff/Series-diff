import { fetchAllRmse } from './fetchAllRmse';

describe('fetchAllRmse', () => {
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
    it('fetches RMSE for all pairs correctly', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ rmse: 0.99 })) // A->B
        .mockResolvedValueOnce(createMockResponse({ rmse: 0.99 })); // B->A

      const result = await fetchAllRmse(filenamesPerCategory, undefined, undefined, '5T');

      expect(result.temperature['fileA.json']['fileB.csv']).toBe(0.99);
      expect(result.temperature['fileB.csv']['fileA.json']).toBe(0.99);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tolerance=5T'),
        expect.anything()
      );
    });

    it('should handle empty categories', async () => {
      const result = await fetchAllRmse({});
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('skips same file comparison', async () => {
      const result = await fetchAllRmse({ temp: ['a'] });
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should include start and end parameters', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rmse: 1.0 }));

      await fetchAllRmse(filenamesPerCategory, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip null RMSE values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ rmse: null }))
        .mockResolvedValueOnce(createMockResponse({ rmse: 2.0 }));

      const result = await fetchAllRmse(filenamesPerCategory);

      expect(result.temperature['fileA.json']).toEqual({});
      expect(result.temperature['fileB.csv']['fileA.json']).toBe(2.0);
    });
  });

  describe('error handling', () => {
    it('handles fetch errors with partial data', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({}, false, 404))
        .mockResolvedValueOnce(createMockResponse({ rmse: 1.5 }));

      const result = await fetchAllRmse(filenamesPerCategory);

      expect(result.temperature['fileA.json']).toEqual({});
      expect(result.temperature['fileB.csv']['fileA.json']).toBe(1.5);
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('throws on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchAllRmse(filenamesPerCategory)).rejects.toThrow();
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

      await expect(fetchAllRmse(filenamesPerCategory)).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rmse: 0.5 }));

      await fetchAllRmse({ temp: ['a', 'b'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ rmse: 0.5 }, true, 200, newToken));

      await fetchAllRmse({ temp: ['a', 'b'] });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });

  describe('multiple categories', () => {
    it('handles multiple categories', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ rmse: 1.0 }))
        .mockResolvedValueOnce(createMockResponse({ rmse: 1.0 }))
        .mockResolvedValueOnce(createMockResponse({ rmse: 2.0 }))
        .mockResolvedValueOnce(createMockResponse({ rmse: 2.0 }));

      const result = await fetchAllRmse({
        temp: ['a', 'b'],
        humidity: ['x', 'y']
      });

      expect(result.temp['a']['b']).toBe(1.0);
      expect(result.humidity['x']['y']).toBe(2.0);
    });
  });
});
