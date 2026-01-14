import { fetchAllMeans } from './fetchAllMeans';

describe('fetchAllMeans', () => {
  const mockFilenamesPerCategory = {
    temperature: ['model1.csv', 'model2.json'],
    humidity: ['sensor_a.csv']
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
    it('should fetch means for all files successfully', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ mean: 23.5 }))
        .mockResolvedValueOnce(createMockResponse({ mean: 24.1 }))
        .mockResolvedValueOnce(createMockResponse({ mean: 68.7 }));

      const result = await fetchAllMeans(mockFilenamesPerCategory);

      expect(result).toEqual({
        temperature: { 'model1.csv': 23.5, 'model2.json': 24.1 },
        humidity: { 'sensor_a.csv': 68.7 }
      });
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle empty categories', async () => {
      const result = await fetchAllMeans({});
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should include start and end parameters in URL', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mean: 10.0 }));

      await fetchAllMeans({ cat: ['file.csv'] }, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip null mean values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ mean: 22.0 }))
        .mockResolvedValueOnce(createMockResponse({ mean: null }));

      const result = await fetchAllMeans({ temp: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ temp: { 'a.csv': 22.0 } });
    });

    it('should skip undefined mean values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({}));

      const result = await fetchAllMeans({ temp: ['a.csv'] });

      expect(result).toEqual({ temp: {} });
    });
  });

  describe('error handling', () => {
    it('should return partial data on non-ok response and continue', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ mean: 22.0 }))
        .mockResolvedValueOnce(createMockResponse({}, false, 404));

      const result = await fetchAllMeans({ temp: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ temp: { 'a.csv': 22.0 } });
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should throw on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchAllMeans(mockFilenamesPerCategory)).rejects.toThrow();
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

      await expect(fetchAllMeans({ cat: ['file.csv'] })).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('existing-token-123');

      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mean: 1 }));

      await fetchAllMeans({ categoryA: ['file1'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('existing-token-123');
    });

    it('should not include X-Session-ID header when no token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mean: 1 }));

      await fetchAllMeans({ categoryA: ['file1'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBeUndefined();
    });

    it('should store new token from response header', async () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const newToken = 'new-token-456';
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mean: 7 }, true, 200, newToken));

      await fetchAllMeans({ categoryB: ['file2'] });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });

  describe('URL construction', () => {
    it('should trim category and filename', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ mean: 5 }));

      await fetchAllMeans({ '  temp  ': ['  file.csv  '] });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=temp'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('filename=file.csv'),
        expect.anything()
      );
    });
  });
});