import { fetchAllAutoCorrelations } from './fetchAllAutoCorrelations';

describe('fetchAllAutoCorrelations', () => {
  const structure = { temperature: ['m1.csv', 'm2.json'], humidity: ['s1.csv'] };

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
    it('calculates autocorrelations properly', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ autocorrelation: 0.87 }))
        .mockResolvedValueOnce(createMockResponse({ autocorrelation: 0.92 }))
        .mockResolvedValueOnce(createMockResponse({ autocorrelation: 0.75 }));

      const result = await fetchAllAutoCorrelations(structure);
      expect(result).toEqual({
        temperature: { 'm1.csv': 0.87, 'm2.json': 0.92 },
        humidity: { 's1.csv': 0.75 }
      });
    });

    it('should handle empty categories', async () => {
      const result = await fetchAllAutoCorrelations({});
      expect(result).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should include start and end parameters in URL', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ autocorrelation: 0.5 }));

      await fetchAllAutoCorrelations({ cat: ['file.csv'] }, '2025-01-01', '2025-01-31');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('start=2025-01-01'),
        expect.anything()
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('end=2025-01-31'),
        expect.anything()
      );
    });

    it('should skip null autocorrelation values', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ autocorrelation: null }))
        .mockResolvedValueOnce(createMockResponse({ autocorrelation: 0.9 }));

      const result = await fetchAllAutoCorrelations({ cat: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ cat: { 'b.csv': 0.9 } });
    });
  });

  describe('error handling', () => {
    it('should return partial data on non-ok response', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(createMockResponse({ autocorrelation: 0.87 }))
        .mockResolvedValueOnce(createMockResponse({}, false, 404));

      const result = await fetchAllAutoCorrelations({ cat: ['a.csv', 'b.csv'] });

      expect(result).toEqual({ cat: { 'a.csv': 0.87 } });
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should throw on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('connection'));

      await expect(fetchAllAutoCorrelations(structure)).rejects.toThrow();
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

      await expect(fetchAllAutoCorrelations({ cat: ['file.csv'] })).rejects.toThrow(/Rate limit exceeded/);
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ autocorrelation: 0.5 }));

      await fetchAllAutoCorrelations({ cat: ['file1'] });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ autocorrelation: 0.5 }, true, 200, newToken));

      await fetchAllAutoCorrelations({ cat: ['file2'] });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});