import { fetchAllDTWs, fetchDTW } from './fetchAllDTWs';

describe('fetchDTW', () => {
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
  });

  it('uses session token and stores new one', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('tok');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    const newToken = 'newtok';
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ dtw_distance: 1.23 }, true, 200, newToken));

    const v = await fetchDTW('a', 'b', 'cat');

    const callOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(callOptions.headers['X-Session-ID']).toBe('tok');
    expect(setItemSpy).toHaveBeenCalledWith('session_token', newToken);
    expect(v).toBe(1.23);
  });

  it('returns null on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 404));
    const v = await fetchDTW('a', 'b', 'cat');
    expect(v).toBeNull();
  });

  it('returns null on generic error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const v = await fetchDTW('a', 'b', 'cat');
    expect(v).toBeNull();
  });

  it('throws on rate limit (429)', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
      text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchDTW('a', 'b', 'cat')).rejects.toThrow(/Rate limit exceeded/);
  });

  it('throws on network error (Failed to fetch)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchDTW('a', 'b', 'cat')).rejects.toThrow();
  });

  it('includes start and end parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ dtw_distance: 1.0 }));

    await fetchDTW('a', 'b', 'cat', '2025-01-01', '2025-01-31');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('start=2025-01-01'),
      expect.anything()
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('end=2025-01-31'),
      expect.anything()
    );
  });

  it('returns 0 when dtw_distance is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}));
    const v = await fetchDTW('a', 'b', 'cat');
    expect(v).toBe(0);
  });
});

describe('fetchAllDTWs', () => {
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
  });

  it('computes symmetric DTW matrix correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ dtw_distance: 5.5 }));

    const res = await fetchAllDTWs(['f1', 'f2'], 'cat');

    expect(res.f1.f1).toBe(0);
    expect(res.f2.f2).toBe(0);
    expect(res.f1.f2).toBe(5.5);
    expect(res.f2.f1).toBe(5.5);
    expect(fetch).toHaveBeenCalledTimes(1); // Only upper triangle
  });

  it('handles empty file list', async () => {
    const res = await fetchAllDTWs([], 'cat');
    expect(res).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles single file', async () => {
    const res = await fetchAllDTWs(['f1'], 'cat');
    expect(res).toEqual({ f1: { f1: 0 } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('leaves 0 for failed pairs (null response)', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({ dtw_distance: null }));

    const res = await fetchAllDTWs(['f1', 'f2'], 'cat');

    expect(res.f1.f2).toBe(0);
    expect(res.f2.f1).toBe(0);
  });

  it('throws when too many pairs fail (above threshold)', async () => {
    // 3 files = 3 pairs, if all fail (>25%) should throw
    global.fetch = jest.fn().mockResolvedValue(createMockResponse({}, false, 500));

    await expect(fetchAllDTWs(['f1', 'f2', 'f3'], 'cat')).rejects.toThrow(/DTW calculation failed/);
  });

  it('returns partial data when some pairs fail (below threshold)', async () => {
    // 4 files = 6 pairs, 1 failure = 16.7% < 25% threshold
    global.fetch = jest.fn()
      .mockResolvedValueOnce(createMockResponse({ dtw_distance: 1 })) // f1-f2
      .mockResolvedValueOnce(createMockResponse({ dtw_distance: 2 })) // f1-f3
      .mockResolvedValueOnce(createMockResponse({ dtw_distance: 3 })) // f1-f4
      .mockResolvedValueOnce(createMockResponse({}, false, 500)) // f2-f3 fails
      .mockResolvedValueOnce(createMockResponse({ dtw_distance: 4 })) // f2-f4
      .mockResolvedValueOnce(createMockResponse({ dtw_distance: 5 })); // f3-f4

    const res = await fetchAllDTWs(['f1', 'f2', 'f3', 'f4'], 'cat');

    expect(res.f1.f2).toBe(1);
    expect(res.f2.f3).toBe(0); // Failed pair defaults to 0
    expect(res.f3.f4).toBe(5);
  });

  it('propagates rate limit errors', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      headers: { get: jest.fn((key: string) => key === 'Retry-After' ? '60' : null) },
      text: jest.fn(() => Promise.resolve('Rate limit exceeded')),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    await expect(fetchAllDTWs(['f1', 'f2'], 'cat')).rejects.toThrow(/Rate limit exceeded/);
  });
});