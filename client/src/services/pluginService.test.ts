import { validatePluginCode, executePlugin } from './pluginService';
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

// Mock crypto.subtle for hash function
const mockCrypto = {
  subtle: {
    digest: jest.fn().mockImplementation(() => 
      Promise.resolve(new ArrayBuffer(32))
    ),
  },
};
Object.defineProperty(global, 'crypto', { value: mockCrypto, writable: true });

describe('pluginService', () => {
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validatePluginCode', () => {
    const validCode = 'def calculate(series1, series2): return 0';

    describe('successful validation', () => {
      it('should return valid result for good code', async () => {
        global.fetch = jest.fn().mockResolvedValue(
          createMockResponse({ valid: true })
        );

        const result = await validatePluginCode(validCode);

        expect(result).toEqual({ valid: true });
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/plugins/validate'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ code: validCode }),
          })
        );
      });

      it('should return invalid result with error message', async () => {
        global.fetch = jest.fn().mockResolvedValue(
          createMockResponse({ valid: false, error: 'Dangerous pattern detected' })
        );

        const result = await validatePluginCode(validCode);

        expect(result).toEqual({ valid: false, error: 'Dangerous pattern detected' });
      });
    });

    describe('error handling', () => {
      it('should throw on network error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        await expect(validatePluginCode(validCode)).rejects.toThrow();
      });

      it('should throw on failed response', async () => {
        global.fetch = jest.fn().mockResolvedValue(
          createMockResponse({}, false, 500)
        );

        await expect(validatePluginCode(validCode)).rejects.toThrow('Failed to validate plugin code');
      });

      it('should throw on rate limit (429)', async () => {
        const mockResponse = {
          ok: false,
          status: 429,
          headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
          json: jest.fn(() => Promise.resolve({})),
        };
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        await expect(validatePluginCode(validCode)).rejects.toThrow(/Rate limit exceeded/);
      });
    });

    describe('session token handling', () => {
      it('should include X-Session-ID header when token exists', async () => {
        jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ valid: true }));

        await validatePluginCode(validCode);

        const callOptions = (fetch as jest.Mock).mock.calls[0][1];
        expect(callOptions.headers['X-Session-ID']).toBe('test-token');
      });

      it('should store new token from response header', async () => {
        const newToken = 'new-token-123';
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ valid: true }, true, 200, newToken));

        await validatePluginCode(validCode);

        expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
      });
    });
  });

  describe('executePlugin', () => {
    const code = 'def calculate(series1, series2): return 0';
    const category = 'temperature';
    const filenames = ['fileA.json', 'fileB.json'];
    const start = '2025-01-01';
    const end = '2025-01-31';

    describe('successful execution', () => {
      it('should execute plugin and return results', async () => {
        const mockResults = {
          results: {
            'fileA.json': { 'fileB.json': 1.5 },
          },
        };
        global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockResults));

        const result = await executePlugin(code, category, filenames, start, end);

        expect(result).toEqual(mockResults);
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/plugins/execute'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ code, category, filenames, start, end }),
          })
        );
      });

      it('should use cached result if available', async () => {
        const cachedResult = {
          data: { results: { 'fileA.json': { 'fileB.json': 2.0 } } },
          timestamp: Date.now(),
        };
        (cacheAPI.get as jest.Mock).mockResolvedValue(cachedResult);

        const result = await executePlugin(code, category, filenames);

        expect(result).toEqual(cachedResult.data);
        expect(fetch).not.toHaveBeenCalled();
      });

      it('should not use expired cache', async () => {
        const expiredCache = {
          data: { results: { 'fileA.json': { 'fileB.json': 2.0 } } },
          timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago (expired)
        };
        (cacheAPI.get as jest.Mock).mockResolvedValue(expiredCache);
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ results: {} }));

        await executePlugin(code, category, filenames);

        expect(fetch).toHaveBeenCalled();
      });

      it('should cache successful results', async () => {
        const mockResults = { results: {} };
        global.fetch = jest.fn().mockResolvedValue(createMockResponse(mockResults));

        await executePlugin(code, category, filenames);

        expect(cacheAPI.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ data: mockResults, timestamp: expect.any(Number) }),
          expect.any(Number)
        );
      });
    });

    describe('error handling', () => {
      it('should return error on network failure', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        const result = await executePlugin(code, category, filenames);

        expect(result.error).toBeDefined();
      });

      it('should return error on failed response', async () => {
        global.fetch = jest.fn().mockResolvedValue(
          createMockResponse({ error: 'Execution failed' }, false, 500)
        );

        const result = await executePlugin(code, category, filenames);

        expect(result.error).toBe('Execution failed');
      });

      it('should return rate limit error on 429', async () => {
        const mockResponse = {
          ok: false,
          status: 429,
          headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
          json: jest.fn(() => Promise.resolve({})),
        };
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const result = await executePlugin(code, category, filenames);

        expect(result.error).toContain('Rate limit exceeded');
      });

      it('should handle cache check failure gracefully', async () => {
        (cacheAPI.get as jest.Mock).mockRejectedValue(new Error('Cache error'));
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ results: {} }));

        const result = await executePlugin(code, category, filenames);

        expect(result).toEqual({ results: {} });
        expect(console.warn).toHaveBeenCalled();
      });

      it('should handle cache set failure gracefully', async () => {
        (cacheAPI.set as jest.Mock).mockRejectedValue(new Error('Cache error'));
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ results: {} }));

        const result = await executePlugin(code, category, filenames);

        expect(result).toEqual({ results: {} });
        expect(console.warn).toHaveBeenCalled();
      });

      it('should return default error message when response error is empty', async () => {
        global.fetch = jest.fn().mockResolvedValue(
          createMockResponse({}, false, 500)
        );

        const result = await executePlugin(code, category, filenames);

        expect(result.error).toBe('Failed to execute plugin');
      });
    });

    describe('parameter handling', () => {
      it('should handle null start and end parameters', async () => {
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ results: {} }));

        await executePlugin(code, category, filenames, null, null);

        const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.start).toBeNull();
        expect(body.end).toBeNull();
      });

      it('should handle undefined start and end parameters', async () => {
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ results: {} }));

        await executePlugin(code, category, filenames);

        const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
        expect(body.start).toBeUndefined();
        expect(body.end).toBeUndefined();
      });
    });

    describe('session token handling', () => {
      it('should include X-Session-ID header when token exists', async () => {
        jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ results: {} }));

        await executePlugin(code, category, filenames);

        const callOptions = (fetch as jest.Mock).mock.calls[0][1];
        expect(callOptions.headers['X-Session-ID']).toBe('test-token');
      });

      it('should store new token from response header', async () => {
        const newToken = 'new-token-123';
        const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
        global.fetch = jest.fn().mockResolvedValue(createMockResponse({ results: {} }, true, 200, newToken));

        await executePlugin(code, category, filenames);

        expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
      });
    });
  });
});
