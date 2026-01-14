import { fetchAllMedians } from './fetchAllMedians';

describe('fetchAllMedians', () => {
  const mockFilenames = {
    pressure: ['file1.json', 'file2.csv'],
    wind: ['north.json']
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
    it('should fetch medians correctly for all files', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ median: 1013.25 }))
        .mockResolvedValueOnce(createMockResponse({ median: 1012.8 }))
        .mockResolvedValueOnce(createMockResponse({ median: 5.6 }));

      const result = await fetchAllMedians(mockFilenames);

      expect(result).toEqual({
        pressure: { 'file1.json': 1013.25, 'file2.csv': 1012.8 },
        wind: { 'north.json': 5.6 }
      });
    });

    it('should handle empty categories', async () => {
      const result = await fetchAllMedians({});
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should include start and end parameters in URL', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ median: 10.0 }));

      await fetchAllMedians({ cat: ['file.csv'] }, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip null median values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ median: null }))
        .mockResolvedValueOnce(createMockResponse({ median: 100 }));

      const result = await fetchAllMedians({ cat: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ cat: { 'b.csv': 100 } });
    });
  });

  describe('error handling', () => {
    it('should return partial data on non-ok response', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ median: 100 }))
        .mockResolvedValueOnce(createMockResponse({}, false, 404));

      const result = await fetchAllMedians({ cat: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ cat: { 'a.csv': 100 } });
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should throw on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchAllMedians(mockFilenames)).rejects.toThrow();
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

      await expect(fetchAllMedians({ cat: ['file.csv'] })).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ median: 1 }));

      await fetchAllMedians({ cat: ['file1'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ median: 7 }, true, 200, newToken));

      await fetchAllMedians({ cat: ['file2'] });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});