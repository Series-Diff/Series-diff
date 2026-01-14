import { sendProcessedTimeSeriesData } from './uploadTimeSeries';

describe('sendProcessedTimeSeriesData', () => {
  const createMockResponse = (data: object, ok = true, status = 200, sessionToken: string | null = null) => ({
    ok,
    status,
    headers: { get: jest.fn((key: string) => key === 'X-Session-ID' ? sessionToken : null) },
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve('Server fail')),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('successful uploads', () => {
    it('should upload data successfully and call callback true', async () => {
      const mockData = { key: 'value' };
      const callback = jest.fn();

      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ success: true }));

      const result = await sendProcessedTimeSeriesData(mockData, callback);

      expect(result).toEqual({ success: true });
      expect(callback).toHaveBeenCalledWith(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/upload-timeseries'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockData)
        })
      );
    });

    it('should work without callback', async () => {
      const mockData = { key: 'value' };

      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

      await expect(sendProcessedTimeSeriesData(mockData)).resolves.toEqual({});
    });
  });

  describe('empty data handling', () => {
    it('should handle empty data and call callback false without fetch', async () => {
      const callback = jest.fn();

      await sendProcessedTimeSeriesData({}, callback);

      expect(callback).toHaveBeenCalledWith(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle empty data without callback', async () => {
      await sendProcessedTimeSeriesData({});
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle server error, log, throw, and callback false', async () => {
      const mockData = { test: 1 };
      const callback = jest.fn();

      global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 500));

      await expect(sendProcessedTimeSeriesData(mockData, callback)).rejects.toThrow();
      expect(callback).toHaveBeenCalledWith(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network error, log, throw, and callback false', async () => {
      const mockData = { test: 1 };
      const callback = jest.fn();

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(sendProcessedTimeSeriesData(mockData, callback)).rejects.toThrow();
      expect(callback).toHaveBeenCalledWith(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle rate limit (429) error', async () => {
      const mockData = { test: 1 };
      const callback = jest.fn();

      const mockResponse = {
        ok: false,
        status: 429,
        headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
        text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      await expect(sendProcessedTimeSeriesData(mockData, callback)).rejects.toThrow(/Rate limit exceeded/);
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should throw formatted error on empty error text', async () => {
      const mockData = { test: 1 };
      const callback = jest.fn();

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: jest.fn(() => null) },
        text: jest.fn(() => Promise.resolve('')),
      });

      await expect(sendProcessedTimeSeriesData(mockData, callback)).rejects.toThrow('Upload failed');
    });
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ success: true }));

      await sendProcessedTimeSeriesData({ key: 'value' });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ success: true }, true, 200, newToken));

      await sendProcessedTimeSeriesData({ key: 'value' });

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });

    it('should not include X-Session-ID header when no token exists', async () => {
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ success: true }));

      await sendProcessedTimeSeriesData({ key: 'value' });

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBeUndefined();
    });
  });
});