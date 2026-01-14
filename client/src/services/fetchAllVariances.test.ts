import { fetchAllVariances } from './fetchAllVariances';

describe('fetchAllVariances', () => {
  const data = { temp: ['a.csv', 'b.json'], hum: ['x.csv'] };

  const createMockResponse = (responseData: object, ok = true, status = 200, sessionToken: string | null = null) => ({
    ok,
    status,
    headers: { get: jest.fn((key: string) => key === 'X-Session-ID' ? sessionToken : null) },
    json: jest.fn(() => Promise.resolve(responseData)),
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
    it('fetches variances successfully', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ variance: 4.2 }))
        .mockResolvedValueOnce(createMockResponse({ variance: 5.1 }))
        .mockResolvedValueOnce(createMockResponse({ variance: 12.8 }));

      const result = await fetchAllVariances(data);
      expect(result).toEqual({
        temp: { 'a.csv': 4.2, 'b.json': 5.1 },
        hum: { 'x.csv': 12.8 }
      });
    });

    it('should handle empty categories', async () => {
      const result = await fetchAllVariances({});
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should include start and end parameters in URL', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ variance: 10.0 }));

      await fetchAllVariances({ cat: ['file.csv'] }, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip null variance values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ variance: null }))
        .mockResolvedValueOnce(createMockResponse({ variance: 100 }));

      const result = await fetchAllVariances({ cat: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ cat: { 'b.csv': 100 } });
    });

    it('should skip missing variance field', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      const result = await fetchAllVariances({ cat: ['a.csv'] });

      expect(result).toEqual({ cat: {} });
    });
  });

  describe('error handling', () => {
    it('handles failed requests by returning partial data', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ variance: 4.2 }))
        .mockResolvedValueOnce(createMockResponse({}, false, 404));

      const result = await fetchAllVariances({ temp: ['a.csv', 'b.json'] });
      expect(result).toEqual({ temp: { 'a.csv': 4.2 } });
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should throw on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(fetchAllVariances(data)).rejects.toThrow();
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('should throw on rate limit (429)', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
        text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(fetchAllVariances({ cat: ['file.csv'] })).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ variance: 1 }));

      await fetchAllVariances({ cat: ['file1'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ variance: 7 }, true, 200, newToken));

      await fetchAllVariances({ cat: ['file2'] });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});