import { fetchAllRmse } from './fetchAllRmse';

describe('fetchAllRmse', () => {
  const filenamesPerCategory = {
    temperature: ['fileA.json', 'fileB.csv']
  };
  const tolerance = '5T';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches RMSE for all pairs correctly', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rmse: 0.99 }) }) // A-B
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rmse: 0.99 }) }); // B-A

    const result = await fetchAllRmse(filenamesPerCategory, tolerance);

    expect(result.temperature['fileA.json']['fileB.csv']).toBe(0.99);
    expect(result.temperature['fileB.csv']['fileA.json']).toBe(0.99);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('tolerance=5T'),
      expect.anything()
    );
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Error') })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ rmse: 1.5 }) });

    const result = await fetchAllRmse(filenamesPerCategory);

    expect(result.temperature['fileA.json']).toEqual({}); // Failed
    expect(result.temperature['fileB.csv']['fileA.json']).toBe(1.5); // Success
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch RMSE'), 'Error');
  });

  it('handles network errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchAllRmse(filenamesPerCategory);
    
    expect(result.temperature).toBeDefined();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Error fetching RMSE'), expect.any(Error));
  });

  it('skips same file comparison', async () => {
      const result = await fetchAllRmse({ temp: ['a'] });
      // When there's only one file, the entry is initialized but no comparisons are made (f1 === f2 skipped)
      expect(result).toEqual({ temp: { a: {} } });
      expect(fetch).not.toHaveBeenCalled();
  });

  it('handles session token update', async () => {
    const mockResponse = { rmse: 0.5 };
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (key: string) => key === 'X-Session-ID' ? 'new-token' : null },
      json: () => Promise.resolve(mockResponse)
    });

    await fetchAllRmse({ temp: ['a', 'b'] });
    expect(setItemSpy).toHaveBeenCalledWith('session_token', 'new-token');
  });
});
