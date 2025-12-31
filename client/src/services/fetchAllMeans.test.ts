// src/services/fetchAllMeans.test.ts

import { fetchAllMeans } from './fetchAllMeans';

describe('fetchAllMeans', () => {
  it('fetches means correctly', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ mean: 42 }),
      headers: { get: () => null },
    })) as jest.Mock;

    const result = await fetchAllMeans({ category: ['test'] });
    expect(result).toEqual({ category: { test: 42 } });
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