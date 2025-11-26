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
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ mean: 23.5 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ mean: 24.1 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ mean: 68.7 }) });

    const result = await fetchAllMeans(mockFilenamesPerCategory);

    expect(result).toEqual({
      temperature: { 'model1.csv': 23.5, 'model2.json': 24.1 },
      humidity: { 'sensor_a.csv': 68.7 }
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should handle API error and return partial data', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ mean: 22.0 }) })
      .mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('Not Found') })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ mean: null }) });

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

    expect(result).toEqual({});
    expect(console.warn).toHaveBeenCalledTimes(3);
  });
});