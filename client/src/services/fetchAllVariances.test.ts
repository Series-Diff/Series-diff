import { fetchAllVariances } from './fetchAllVariances';

describe('fetchAllVariances', () => {
  const data = { temp: ['a.csv', 'b.json'], hum: ['x.csv'] };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches variances successfully', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ variance: 4.2 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ variance: 5.1 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ variance: 12.8 }) });

    const result = await fetchAllVariances(data);
    expect(result).toEqual({
      temp: { 'a.csv': 4.2, 'b.json': 5.1 },
      hum: { 'x.csv': 12.8 }
    });
  });

  it('handles failed requests and missing variance field', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({}) })
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('404') });

    const result = await fetchAllVariances(data);
    expect(result).toEqual({ temp: {}, hum: {} });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});