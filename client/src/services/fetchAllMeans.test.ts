// src/services/fetchAllMeans.test.ts

import { fetchAllMeans } from './fetchAllMeans';

describe('fetchAllMeans', () => {
  it('fetches means correctly', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ mean: 42 })
    })) as jest.Mock;

    const result = await fetchAllMeans({ category: ['test'] });
    expect(result).toEqual({ category: { test: 42 } });
  });
});