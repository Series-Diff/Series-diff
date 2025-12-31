import { fetchAllEuclideans, fetchEuclidean } from './fetchAllEuclideans';

describe('fetchAllEuclideans', () => {
  const filenames = ['fileA.json', 'fileB.csv'];
  const category = 'temperature';
  const tolerance = 5;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('computes euclidean distance matrix correctly', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ euclidean_distance: 10.5 }) }); // A-B

    const result = await fetchAllEuclideans(filenames, tolerance, category);

    expect(result).toEqual({
      'fileA.json': { 'fileA.json': 0, 'fileB.csv': 10.5 },
      'fileB.csv': { 'fileA.json': 10.5, 'fileB.csv': 0 }
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('tolerance=5T'),
      expect.anything()
    );
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Error') });

    const result = await fetchAllEuclideans(filenames, null, category);

    expect(result['fileA.json']['fileB.csv']).toBe(0);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch euclidean distance'), 'Error');
  });

  it('handles network errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchAllEuclideans(filenames, null, category)).rejects.toThrow('Network error');
  });

  it('handles empty filenames list', async () => {
    const result = await fetchAllEuclideans([], null, category);
    expect(result).toEqual({});
  });
  
  it('fetchEuclidean returns null on error', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Error') });
      const result = await fetchEuclidean(category, 'a', 'b');
      expect(result).toBeNull();
  });

  it('handles session token update', async () => {
    const mockResponse = { euclidean_distance: 1.5 };
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (key: string) => key === 'X-Session-ID' ? 'new-token' : null },
      json: () => Promise.resolve(mockResponse)
    });

    await fetchAllEuclideans(['a', 'b'], null, category);
    expect(setItemSpy).toHaveBeenCalledWith('session_token', 'new-token');
  });
});
