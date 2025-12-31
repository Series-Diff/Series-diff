import { fetchAllMedians } from './fetchAllMedians';

describe('fetchAllMedians', () => {
  const mockFilenames = {
    pressure: ['file1.json', 'file2.csv'],
    wind: ['north.json']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch medians correctly for all files', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ median: 1013.25 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ median: 1012.8 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ median: 5.6 }) });

    const result = await fetchAllMedians(mockFilenames);

    expect(result).toEqual({
      pressure: { 'file1.json': 1013.25, 'file2.csv': 1012.8 },
      wind: { 'north.json': 5.6 }
    });
  });

  it('should skip null/undefined medians and handle errors', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ median: null }) })
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('404') })
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchAllMedians(mockFilenames);

    expect(result).toEqual({ pressure: {}, wind: {} });
    expect(console.warn).toHaveBeenCalledTimes(0);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});