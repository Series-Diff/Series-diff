import { sendProcessedTimeSeriesData } from './uploadTimeSeries';

describe('sendProcessedTimeSeriesData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should upload data successfully and call callback true', async () => {
    const mockData = { key: 'value' };
    const callback = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({ 
      ok: true, 
      headers: { get: () => null },
      json: () => Promise.resolve({ success: true }) 
    });

    const result = await sendProcessedTimeSeriesData(mockData, callback);

    expect(result).toEqual({ success: true });
    expect(callback).toHaveBeenCalledWith(true);
    expect(fetch).toHaveBeenCalledWith('/api/upload-timeseries', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(mockData)
    }));
  });

  it('should handle empty data and call callback false without fetch', async () => {
    const callback = jest.fn();

    await sendProcessedTimeSeriesData({}, callback);

    expect(callback).toHaveBeenCalledWith(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle server error, log, throw, and callback false', async () => {
    const mockData = { test: 1 };
    const callback = jest.fn();

    global.fetch = jest.fn().mockResolvedValue({ 
      ok: false, 
      headers: { get: () => null },
      text: () => Promise.resolve('Server fail') 
    });

    await expect(sendProcessedTimeSeriesData(mockData, callback)).rejects.toThrow('Server fail');
    expect(callback).toHaveBeenCalledWith(false);
    expect(console.error).toHaveBeenCalledWith('Server error:', 'Server fail');
    expect(console.error).toHaveBeenCalledWith('Error uploading time series data:', expect.any(Error));
  });

  it('should handle network error, log, throw, and callback false', async () => {
    const mockData = { test: 1 };
    const callback = jest.fn();

    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(sendProcessedTimeSeriesData(mockData, callback)).rejects.toThrow('Network error');
    expect(callback).toHaveBeenCalledWith(false);
    expect(console.error).toHaveBeenCalledWith('Error uploading time series data:', expect.any(Error));
  });

  it('should work without callback', async () => {
    const mockData = { key: 'value' };

    global.fetch = jest.fn().mockResolvedValue({ 
      ok: true, 
      headers: { get: () => null },
      json: () => Promise.resolve({}) 
    });

    await expect(sendProcessedTimeSeriesData(mockData)).resolves.toEqual({});
  });
});