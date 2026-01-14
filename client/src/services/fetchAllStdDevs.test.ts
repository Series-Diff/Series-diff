import { fetchAllStdDevs } from './fetchAllStdDevs';

describe('fetchAllStdDevs', () => {
  const files = { co2: ['lab1.csv'], light: ['room_a.json', 'room_b.json'] };

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
    it('should return standard deviations correctly', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ standard_deviation: 45.3 }))
        .mockResolvedValueOnce(createMockResponse({ standard_deviation: 120.1 }))
        .mockResolvedValueOnce(createMockResponse({ standard_deviation: 118.7 }));

      const result = await fetchAllStdDevs(files);

      expect(result).toEqual({
        co2: { 'lab1.csv': 45.3 },
        light: { 'room_a.json': 120.1, 'room_b.json': 118.7 }
      });
    });

    it('should handle empty categories', async () => {
      const result = await fetchAllStdDevs({});
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should include start and end parameters in URL', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ standard_deviation: 10.0 }));

      await fetchAllStdDevs({ cat: ['file.csv'] }, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip null standard_deviation values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ standard_deviation: null }))
        .mockResolvedValueOnce(createMockResponse({ standard_deviation: 100 }));

      const result = await fetchAllStdDevs({ cat: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ cat: { 'b.csv': 100 } });
    });

    it('should skip missing standard_deviation field', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      const result = await fetchAllStdDevs({ cat: ['a.csv'] });

      expect(result).toEqual({ cat: {} });
    });
  });

  describe('error handling', () => {
    it('should return partial data on non-ok response', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ standard_deviation: 45.3 }))
        .mockResolvedValueOnce(createMockResponse({}, false, 404));

      const result = await fetchAllStdDevs({ cat: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ cat: { 'a.csv': 45.3 } });
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should throw on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchAllStdDevs(files)).rejects.toThrow();
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

      await expect(fetchAllStdDevs({ cat: ['file.csv'] })).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ standard_deviation: 1 }));

      await fetchAllStdDevs({ cat: ['file1'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ standard_deviation: 7 }, true, 200, newToken));

      await fetchAllStdDevs({ cat: ['file2'] });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});