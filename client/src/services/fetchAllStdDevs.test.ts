import { fetchAllStdDevs } from './fetchAllStdDevs';

describe('fetchAllStdDevs', () => {
  const files = { co2: ['lab1.csv'], light: ['room_a.json', 'room_b.json'] };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return standard deviations correctly', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ standard_deviation: 45.3 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ standard_deviation: 120.1 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ standard_deviation: 118.7 }) });

    const result = await fetchAllStdDevs(files);

    expect(result).toEqual({
      co2: { 'lab1.csv': 45.3 },
      light: { 'room_a.json': 120.1, 'room_b.json': 118.7 }
    });
  });

  it('should omit entries on error or missing field', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Error') })
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchAllStdDevs(files);
    expect(result).toEqual({ co2: {}, light: {} });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});