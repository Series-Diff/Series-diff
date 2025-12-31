// src/services/fetchTimeSeries.test.ts
import { fetchTimeSeriesData } from './fetchTimeSeries';

describe('fetchTimeSeriesData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  it('skips non-number values and builds composite keys', async () => {
    const mockJson = {
      '2023-01-01': {
        humidity: { data_1: 1, data_2: 'oops' },
        temperature: { sensorA: 10 },
      },
      '2023-01-02': {
        humidity: { data_1: 2 },
      },
    };

    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockJson),
      headers: { get: () => null },
    })) as jest.Mock;

    const result = await fetchTimeSeriesData();

    expect(result['humidity.data_1']).toEqual([
      { x: '2023-01-01', y: 1 },
      { x: '2023-01-02', y: 2 },
    ]);
    expect(result['temperature.sensorA']).toEqual([
      { x: '2023-01-01', y: 10 },
    ]);
    expect(result['humidity.data_2']).toBeUndefined();
  });

  it('includes X-Session-ID header when token exists', async () => {
    const token = 'existing-token-XYZ';
    localStorage.setItem('session_token', token);

    const mockFetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      headers: { get: () => null },
    })) as jest.Mock;
    global.fetch = mockFetch;

    await fetchTimeSeriesData();

    expect(mockFetch).toHaveBeenCalled();
    const [_url, options] = mockFetch.mock.calls[0];
    expect(options).toBeDefined();
    expect(options.headers['X-Session-ID']).toBe(token);
  });

  it('stores new token from response header', async () => {
    const setItemSpy = jest.spyOn(localStorage.__proto__, 'setItem');
    const newToken = 'new-token-ABC';

    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      headers: { get: (key: string) => (key === 'X-Session-ID' ? newToken : null) },
    })) as jest.Mock;

    await fetchTimeSeriesData();

    expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    setItemSpy.mockRestore();
  });
});
