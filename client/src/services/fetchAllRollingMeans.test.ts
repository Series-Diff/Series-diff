import { fetchAllRollingMeans, fetchRollingMean } from './fetchAllRollingMeans';

describe('fetchAllRollingMeans', () => {
  const input = { temp: ['a.json'], hum: ['b.csv', 'c.json'] };
  const window = '7d';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns correctly structured rolling means', async () => {
    const mockResponse = {
      rolling_mean: {
        '2025-01-01T00:00:00Z': 21.5,
        '2025-01-01T01:00:00Z': 21.8
      }
    };

    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockResponse) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockResponse) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockResponse) });

    const result = await fetchAllRollingMeans(input, window);

    expect(Object.keys(result)).toContain('temp.a.json.rolling_mean');
    expect(result['temp.a.json.rolling_mean']).toHaveLength(2);
    expect(result['temp.a.json.rolling_mean'][0]).toEqual({ x: '2025-01-01T00:00:00Z', y: 21.5 });
    expect(Object.keys(result)).toContain('hum.b.csv.rolling_mean');
    expect(Object.keys(result)).toContain('hum.c.json.rolling_mean');
  });

  it('handles malformed responses and errors gracefully', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: null }) })  // Unexpected structure
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: { ts: 'not_number' } }) })  // No valid points
      .mockRejectedValueOnce(new Error('timeout'));  // Fetch error

    const result = await fetchAllRollingMeans(input, window);
    expect(result).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(4);  // unexpected + no points + empty + error
    expect(console.log).toHaveBeenCalledTimes(1);  // For the first case no data
  });

  it('skips non-array series data', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: 'invalid' }) })  // Unexpected structure
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: 'invalid' }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: 'invalid' }) });

    const result = await fetchAllRollingMeans(input, window);
    expect(result).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(3);
    expect(console.log).toHaveBeenCalledTimes(3);  // No data for each
  });

  it('handles empty series map', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: {} }) })  // Empty object
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: {} }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rolling_mean: {} }) });

    const result = await fetchAllRollingMeans(input, window);
    expect(result).toEqual({});
    expect(console.log).toHaveBeenCalledTimes(0);  // No log since seriesMap has 'rolling_mean' key with empty array (length 1)
    expect(console.warn).toHaveBeenCalledTimes(6);  // 2 warns per file: no points + empty array
  });

  it('throws on failed fetch in fetchRollingMean', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Fail') });

    await expect(fetchRollingMean('cat', 'file', 'window')).rejects.toThrow('Fail');
  });

  it('handles non-object seriesMap', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(null) } as unknown as Response);  // seriesMap will be {}

    const result = await fetchAllRollingMeans({ temp: ['a.json'] }, window);
    expect(result).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Unexpected data structure'), null);
  });

  it('handles non-array seriesData in seriesMap', async () => {
    const mockResponse = { rolling_mean: { 'ts': 'not_number' } };  // Will create seriesData = [], warn no points, then warn empty array

    global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockResponse) });

    const result = await fetchAllRollingMeans({ temp: ['a.json'] }, window);
    expect(result).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(2);  // no points + empty array
  });

  it('handles empty rolling_mean object leading to log', async () => {
    const mockResponse = { };  // No rolling_mean, unexpected structure, out={}, log no data

    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockResponse) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockResponse) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockResponse) });

    const result = await fetchAllRollingMeans(input, window);
    expect(result).toEqual({});
    expect(console.log).toHaveBeenCalledTimes(3);  // For empty data found in each
    expect(console.warn).toHaveBeenCalledTimes(3);  // Unexpected structure for each
  });
});