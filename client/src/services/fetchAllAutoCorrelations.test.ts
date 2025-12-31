import { fetchAllAutoCorrelations } from './fetchAllAutoCorrelations';

describe('fetchAllAutoCorrelations', () => {
  const structure = { temperature: ['m1.csv', 'm2.json'], humidity: ['s1.csv'] };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calculates autocorrelations properly', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ autocorrelation: 0.87 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ autocorrelation: 0.92 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ autocorrelation: 0.75 }) });

    const result = await fetchAllAutoCorrelations(structure);
    expect(result).toEqual({
      temperature: { 'm1.csv': 0.87, 'm2.json': 0.92 },
      humidity: { 's1.csv': 0.75 }
    });
  });

  it('handles null values and API failures', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ autocorrelation: null }) })
      .mockRejectedValueOnce(new Error('connection'))
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Error') });

    const result = await fetchAllAutoCorrelations(structure);
    expect(result).toEqual({ temperature: {}, humidity: {} });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});