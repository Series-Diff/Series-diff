import { fetchAllMeans } from './fetchAllMeans';

describe('fetchAllMeans', () => {
  const mockFilenamesPerCategory = {
    temperature: ['model1.csv', 'model2.json'],
    humidity: ['sensor_a.csv']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch means for all files successfully', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ mean: 23.5 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ mean: 24.1 }) })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ mean: 68.7 }) });

    const result = await fetchAllMeans(mockFilenamesPerCategory);

    expect(result).toEqual({
      temperature: { 'model1.csv': 23.5, 'model2.json': 24.1 },
      humidity: { 'sensor_a.csv': 68.7 }
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle API error and return partial data', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ mean: 22.0 }) })
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Not Found') })
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ mean: null }) });

    const result = await fetchAllMeans(mockFilenamesPerCategory);

    expect(result).toEqual({
      temperature: { 'model1.csv': 22.0 },
      humidity: {}
    });
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should handle network error gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchAllMeans(mockFilenamesPerCategory);

    expect(result).toEqual({
      temperature: {},
      humidity: {}
    });
    expect(console.warn).toHaveBeenCalledTimes(3);
  });

  it('includes X-Session-ID header when token exists', async () => {
    const token = 'existing-token-123';
    // Set token in localStorage
    localStorage.setItem('session_token', token);

    const mockFetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ mean: 1 }),
      headers: { get: () => null },
    })) as jest.Mock;
    global.fetch = mockFetch;

    await fetchAllMeans({ categoryA: ['file1'] });

    expect(mockFetch).toHaveBeenCalled();
    const [_url, options] = mockFetch.mock.calls[0];
    expect(options).toBeDefined();
    expect(options.headers['X-Session-ID']).toBe(token);
  });

  it('stores new token from response header', async () => {
    const setItemSpy = jest.spyOn(localStorage.__proto__, 'setItem');
    const newToken = 'new-token-456';

    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ mean: 7 }),
      headers: { get: (key: string) => (key === 'X-Session-ID' ? newToken : null) },
    })) as jest.Mock;

    await fetchAllMeans({ categoryB: ['file2'] });

    expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    setItemSpy.mockRestore();
  });
});