import { fetchAllDifferences } from './fetchAllDifferences';

describe('fetchAllDifferences', () => {
  const input = {
    temp: ['a.json', 'b.json'],
    hum: ['c.csv']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns correctly structured differences', async () => {
    const mockDiff = {
      difference: {
        '2025-01-01T00:00:00Z': 1.5,
        '2025-01-01T01:00:00Z': 2.3
      }
    };

    global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, json: () => Promise.resolve(mockDiff) });

    const result = await fetchAllDifferences(input, 5);

    expect(result.temp['a.json - b.json']).toHaveLength(2);
    expect(result.temp['a.json - b.json'][0]).toEqual({ x: '2025-01-01T00:00:00Z', y: 1.5 });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('fetchAllDifferences result:'), expect.any(Object));
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('skips categories with fewer than 2 files', async () => {
    const result = await fetchAllDifferences({ hum: ['c.csv'] }, 5);
    expect(result).toEqual({});
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));

    const result = await fetchAllDifferences(input, 5);
    expect(result.temp).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Error fetching difference'), expect.any(Error));
  });

  it('handles non-ok responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Server error') });

    const result = await fetchAllDifferences(input, 5);
    expect(result.temp).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Error fetching difference'), expect.any(Error));
  });

  it('handles missing difference in response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({}) });

    const result = await fetchAllDifferences(input, 5);
    expect(result.temp).toEqual({});
  });

  it('handles tolerance null', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ difference: {} }) });

    const result = await fetchAllDifferences(input, null);
    expect(result.temp).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Empty difference series'));
  });

  it('handles tolerance undefined', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ difference: {} }) });

    const result = await fetchAllDifferences(input, undefined);
    expect(result.temp).toEqual({});
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Empty difference series'));
  });
});