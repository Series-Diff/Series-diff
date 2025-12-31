import { fetchAllCosineSimilarities, fetchCosineSimilarity } from './fetchAllCosineSimilarities';

describe('fetchCosineSimilarity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('adds session token header and stores new token', async () => {
    localStorage.setItem('session_token', 'old');
    const newToken = 'new123';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ cosine_similarity: 0.8 }),
      headers: { get: (k: string) => (k === 'X-Session-ID' ? newToken : null) },
    }) as any;

    const value = await fetchCosineSimilarity('a', 'b', 'cat');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['X-Session-ID']).toBe('old');
    expect(localStorage.getItem('session_token')).toBe(newToken);
    expect(value).toBe(0.8);
  });

  it('returns null on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Not Found'),
      headers: { get: () => null },
    }) as any;

    const value = await fetchCosineSimilarity('a', 'b', 'cat');
    expect(value).toBeNull();
  });

  it('returns null on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as any;

    const value = await fetchCosineSimilarity('a', 'b', 'cat');
    expect(value).toBeNull();
  });
});

describe('fetchAllCosineSimilarities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('builds symmetric matrix and defaults to 0 on nulls', async () => {
    const order: string[] = [];
    (global.fetch as any) = jest.fn().mockImplementation((_url: string) => {
      order.push(_url);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ cosine_similarity: null }), headers: { get: () => null } });
    });

    const result = await fetchAllCosineSimilarities(['f1', 'f2'], 'cat');

    expect(Object.keys(result)).toEqual(['f1', 'f2']);
    expect(result.f1.f2).toBe(0);
    expect(result.f2.f1).toBe(0);
    expect(order.length).toBe(4); // all pairs including diagonals
  });
});