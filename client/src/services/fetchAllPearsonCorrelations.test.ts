import { fetchPearsonCorrelation, fetchAllPearsonCorrelations } from './fetchAllPearsonCorrelations';

describe('fetchPearsonCorrelation', () => {
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

  it('should fetch correlation successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ pearson_correlation: 0.95 }));

    const result = await fetchPearsonCorrelation('file1', 'file2', 'temp');

    expect(result).toBe(0.95);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/timeseries/pearson_correlation'),
      expect.anything()
    );
  });

  it('should return null on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 404));

    const result = await fetchPearsonCorrelation('file1', 'file2', 'temp');

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should return null when pearson_correlation is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

    const result = await fetchPearsonCorrelation('file1', 'file2', 'temp');

    expect(result).toBeNull();
  });

  it('should throw on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchPearsonCorrelation('file1', 'file2', 'temp')).rejects.toThrow();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should throw on rate limit (429)', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
      text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchPearsonCorrelation('file1', 'file2', 'temp')).rejects.toThrow(/Rate limit exceeded/);
  });

  it('should include start and end parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ pearson_correlation: 0.5 }));

    await fetchPearsonCorrelation('file1', 'file2', 'temp', '2025-01-01', '2025-01-31');

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

describe('fetchAllPearsonCorrelations', () => {
  const files = ['fileA.json', 'fileB.csv', 'fileC.json'];
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

  it('computes full correlation matrix correctly (upper triangle only)', async () => {
    // Only upper triangle pairs are fetched: A-B, A-C, B-C
    global.fetch = jest.fn()
      .mockResolvedValueOnce(createMockResponse({ pearson_correlation: 0.95 })) // A-B
      .mockResolvedValueOnce(createMockResponse({ pearson_correlation: -0.12 })) // A-C
      .mockResolvedValueOnce(createMockResponse({ pearson_correlation: 0.67 })); // B-C

    const result = await fetchAllPearsonCorrelations(files, category);

    // Diagonal should be 1, symmetric values from upper triangle
    expect(result['fileA.json']['fileA.json']).toBe(1);
    expect(result['fileB.csv']['fileB.csv']).toBe(1);
    expect(result['fileC.json']['fileC.json']).toBe(1);
    expect(result['fileA.json']['fileB.csv']).toBe(0.95);
    expect(result['fileB.csv']['fileA.json']).toBe(0.95);
    expect(result['fileA.json']['fileC.json']).toBe(-0.12);
    expect(result['fileC.json']['fileA.json']).toBe(-0.12);
    expect(result['fileB.csv']['fileC.json']).toBe(0.67);
    expect(result['fileC.json']['fileB.csv']).toBe(0.67);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('handles empty file list', async () => {
    const result = await fetchAllPearsonCorrelations([], category);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles single file', async () => {
    const result = await fetchAllPearsonCorrelations(['single.csv'], category);
    expect(result).toEqual({
      'single.csv': { 'single.csv': 1 }
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('replaces null correlation with 0', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ pearson_correlation: null }));

    const result = await fetchAllPearsonCorrelations(['x', 'y'], 'temp');

    expect(result['x']['y']).toBe(0);
    expect(result['y']['x']).toBe(0);
    expect(result['x']['x']).toBe(1);
    expect(result['y']['y']).toBe(1);
  });

  it('handles API error by using 0', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 404));

    const result = await fetchAllPearsonCorrelations(['x', 'y'], 'temp');

    expect(result['x']['y']).toBe(0);
    expect(result['x']['x']).toBe(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  describe('session token handling', () => {
    it('should include X-Session-ID header when token exists', async () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('test-token');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ pearson_correlation: 0.5 }));

      await fetchAllPearsonCorrelations(['a', 'b'], 'cat');

      const callOptions = (fetch as jest.Mock).mock.calls[0][1];
      expect(callOptions.headers['X-Session-ID']).toBe('test-token');
    });

    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ pearson_correlation: 0.5 }, true, 200, newToken));

      await fetchAllPearsonCorrelations(['a', 'b'], 'cat');

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});