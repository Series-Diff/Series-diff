import { fetchPearsonCorrelation, fetchAllPearsonCorrelations } from './fetchAllPearsonCorrelations';

describe('fetchAllPearsonCorrelations', () => {
  const files = ['fileA.json', 'fileB.csv', 'fileC.json'];
  const category = 'temperature';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('computes full correlation matrix correctly', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.95 }) }) // A-A
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: -0.12 }) }) // A-B
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.67 }) }) // A-C
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: -0.12 }) }) // B-A
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.33 }) }) // B-B
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.99 }) }) // B-C
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.67 }) }) // C-A
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.99 }) }) // C-B
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.88 }) }); // C-C

    const result = await fetchAllPearsonCorrelations(files, category);

    expect(result).toEqual({
      'fileA.json': { 'fileA.json': 0.95, 'fileB.csv': -0.12, 'fileC.json': 0.67 },
      'fileB.csv': { 'fileA.json': -0.12, 'fileB.csv': 0.33, 'fileC.json': 0.99 },
      'fileC.json': { 'fileA.json': 0.67, 'fileB.csv': 0.99, 'fileC.json': 0.88 }
    });
  });

  it('replaces null/error with 0', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: null }) }) // x-x
      .mockResolvedValueOnce({ ok: false, headers: { get: () => null }, text: () => Promise.resolve('Error') }) // x-y
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({ pearson_correlation: 0.5 }) }) // y-x
      .mockResolvedValueOnce({ ok: true, headers: { get: () => null }, json: () => Promise.resolve({}) }); // y-y

    const result = await fetchAllPearsonCorrelations(['x', 'y'], 'temp');
    expect(result['x']['x']).toBe(0);
    expect(result['x']['y']).toBe(0);
    expect(result['y']['x']).toBe(0.5);
    expect(result['y']['y']).toBe(0);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('handles network error in fetchPearsonCorrelation', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const value = await fetchPearsonCorrelation('file1', 'file2', category);
    expect(value).toBeNull();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error fetching correlation'), expect.any(Error));
  });
});