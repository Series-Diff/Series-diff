import { fetchAllCosineSimilarities, fetchCosineSimilarity } from './fetchAllCosineSimilarities';

describe('fetchCosineSimilarity', () => {
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

  it('adds session token header and stores new token', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('old');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const newToken = 'new123';
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ cosine_similarity: 0.8 }, true, 200, newToken));

    const value = await fetchCosineSimilarity('a', 'b', 'cat');

    const callOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(callOptions.headers['X-Session-ID']).toBe('old');
    expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    expect(value).toBe(0.8);
  });

  it('returns null on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 404));

    const value = await fetchCosineSimilarity('a', 'b', 'cat');

    expect(value).toBeNull();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('throws on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(fetchCosineSimilarity('a', 'b', 'cat')).rejects.toThrow();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('throws on rate limit (429)', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
      text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchCosineSimilarity('a', 'b', 'cat')).rejects.toThrow(/Rate limit exceeded/);
  });

  it('returns null when cosine_similarity is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));

    const value = await fetchCosineSimilarity('a', 'b', 'cat');

    expect(value).toBeNull();
  });

  it('includes start and end parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ cosine_similarity: 0.5 }));

    await fetchCosineSimilarity('a', 'b', 'cat', '2025-01-01', '2025-01-31');

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

describe('fetchAllCosineSimilarities', () => {
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

  it('builds symmetric matrix correctly (upper triangle only)', async () => {
    // Only one call for f1-f2 pair (upper triangle)
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ cosine_similarity: 0.85 }));

    const result = await fetchAllCosineSimilarities(['f1', 'f2'], 'cat');

    expect(result.f1.f1).toBe(1); // Diagonal is 1
    expect(result.f2.f2).toBe(1);
    expect(result.f1.f2).toBe(0.85);
    expect(result.f2.f1).toBe(0.85);
    expect(fetch).toHaveBeenCalledTimes(1); // Only upper triangle
  });

  it('handles empty file list', async () => {
    const result = await fetchAllCosineSimilarities([], 'cat');
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles single file', async () => {
    const result = await fetchAllCosineSimilarities(['single.csv'], 'cat');
    expect(result).toEqual({ 'single.csv': { 'single.csv': 1 } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('defaults to 0 when cosine_similarity is null', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ cosine_similarity: null }));

    const result = await fetchAllCosineSimilarities(['f1', 'f2'], 'cat');

    expect(result.f1.f2).toBe(0);
    expect(result.f2.f1).toBe(0);
    expect(result.f1.f1).toBe(1);
    expect(result.f2.f2).toBe(1);
  });

  it('computes matrix for multiple files', async () => {
    // 3 files = 3 unique pairs: f1-f2, f1-f3, f2-f3
    global.fetch = jest.fn()
      .mockResolvedValueOnce(createMockResponse({ cosine_similarity: 0.9 }))  // f1-f2
      .mockResolvedValueOnce(createMockResponse({ cosine_similarity: 0.8 }))  // f1-f3
      .mockResolvedValueOnce(createMockResponse({ cosine_similarity: 0.7 })); // f2-f3

    const result = await fetchAllCosineSimilarities(['f1', 'f2', 'f3'], 'cat');

    expect(result.f1.f1).toBe(1);
    expect(result.f1.f2).toBe(0.9);
    expect(result.f1.f3).toBe(0.8);
    expect(result.f2.f3).toBe(0.7);
    expect(result.f3.f2).toBe(0.7);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('propagates errors from fetchCosineSimilarity', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchAllCosineSimilarities(['f1', 'f2'], 'cat')).rejects.toThrow();
  });

  describe('session token handling', () => {
    it('should store new token from response header', async () => {
      const newToken = 'new-token-123';
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      global.fetch = jest.fn().mockResolvedValue(createMockResponse({ cosine_similarity: 0.5 }, true, 200, newToken));

      await fetchAllCosineSimilarities(['a', 'b'], 'cat');

      expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    });
  });
});