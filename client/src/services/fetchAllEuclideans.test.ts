import { fetchAllEuclideans, fetchEuclidean } from './fetchAllEuclideans';

describe('fetchEuclidean', () => {
  const createMockResponse = (data: object, ok = true, status = 200, sessionToken: string | null = null) => ({
    ok,
    status,
    headers: { get: jest.fn((key: string) => key === 'X-Session-ID' ? sessionToken : null) },
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve('Error')),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch euclidean distance successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 10.5 }));

    const result = await fetchEuclidean('cat', 'a', 'b');

    expect(result).toBe(10.5);
  });

  it('should return null on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 404));

    const result = await fetchEuclidean('cat', 'a', 'b');

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should return 0 when euclidean_distance is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

    const result = await fetchEuclidean('cat', 'a', 'b');

    expect(result).toBe(0);
  });

  it('should throw on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchEuclidean('cat', 'a', 'b')).rejects.toThrow();
  });

  it('should throw on rate limit (429)', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
      text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchEuclidean('cat', 'a', 'b')).rejects.toThrow(/Rate limit exceeded/);
  });

  it('should include tolerance parameter', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 5.0 }));

    await fetchEuclidean('cat', 'a', 'b', '5T');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('tolerance=5T'),
      expect.anything()
    );
  });

  it('should include start and end parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 5.0 }));

    await fetchEuclidean('cat', 'a', 'b', undefined, '2025-01-01', '2025-01-31');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('start=2025-01-01'),
      expect.anything()
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('end=2025-01-31'),
      expect.anything()
    );
  });
});

describe('fetchAllEuclideans', () => {
  const filenames = ['fileA.json', 'fileB.csv'];
  const category = 'temperature';

  const createMockResponse = (data: object, ok = true, status = 200, sessionToken: string | null = null) => ({
    ok,
    status,
    headers: { get: jest.fn((key: string) => key === 'X-Session-ID' ? sessionToken : null) },
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve('Error')),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('computes euclidean distance matrix correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 10.5 }));

    const result = await fetchAllEuclideans(filenames, 5, category);

    expect(result).toEqual({
      'fileA.json': { 'fileA.json': 0, 'fileB.csv': 10.5 },
      'fileB.csv': { 'fileA.json': 10.5, 'fileB.csv': 0 }
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('tolerance=5T'),
      expect.anything()
    );
  });

  it('handles empty filenames list', async () => {
    const result = await fetchAllEuclideans([], null, category);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles single file', async () => {
    const result = await fetchAllEuclideans(['single.csv'], null, category);
    expect(result).toEqual({ 'single.csv': { 'single.csv': 0 } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles fetch errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 404));

    const result = await fetchAllEuclideans(filenames, null, category);

    expect(result['fileA.json']['fileB.csv']).toBe(0);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('handles network errors by throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchAllEuclideans(filenames, null, category)).rejects.toThrow();
  });

  it('handles null tolerance', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 5.0 }));

    await fetchAllEuclideans(filenames, null, category);

    expect(fetch).toHaveBeenCalledWith(
      expect.not.stringContaining('tolerance='),
      expect.anything()
    );
  });

  it('handles undefined tolerance', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 5.0 }));

    await fetchAllEuclideans(filenames, undefined, category);

    expect(fetch).toHaveBeenCalledWith(
      expect.not.stringContaining('tolerance='),
      expect.anything()
    );
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 1 }));

      await fetchAllEuclideans(['a', 'b'], null, category);

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ euclidean_distance: 1 }, true, 200, newToken));

      await fetchAllEuclideans(['a', 'b'], null, category);

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});
