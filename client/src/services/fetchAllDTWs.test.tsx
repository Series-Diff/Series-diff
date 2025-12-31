import { fetchAllDTWs, fetchDTW } from './fetchAllDTWs';

describe('fetchDTW', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('uses session token and stores new one', async () => {
    localStorage.setItem('session_token', 'tok');
    const newToken = 'newtok';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ dtw_distance: 1.23 }),
      headers: { get: (k: string) => (k === 'X-Session-ID' ? newToken : null) },
    }) as any;

    const v = await fetchDTW('a', 'b', 'cat');
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers['X-Session-ID']).toBe('tok');
    expect(localStorage.getItem('session_token')).toBe(newToken);
    expect(v).toBe(1.23);
  });

  it('returns null on non-ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('err'), headers: { get: () => null } }) as any;
    const v = await fetchDTW('a', 'b', 'cat');
    expect(v).toBeNull();
  });

  it('returns null on error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as any;
    const v = await fetchDTW('a', 'b', 'cat');
    expect(v).toBeNull();
  });
});

describe('fetchAllDTWs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('fills symmetric matrix with zeros on nulls and diagonal zeros', async () => {
    (global.fetch as any) = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ dtw_distance: null }), headers: { get: () => null } });

    const res = await fetchAllDTWs(['f1', 'f2'], 'cat');

    expect(res.f1.f1).toBe(0);
    expect(res.f2.f2).toBe(0);
    expect(res.f1.f2).toBe(0);
    expect(res.f2.f1).toBe(0);
  });
});