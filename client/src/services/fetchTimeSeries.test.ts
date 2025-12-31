import { fetchTimeSeriesData, fetchRawTimeSeriesData } from './fetchTimeSeries';

describe('fetchTimeSeriesData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should parse and structure time series data correctly', async () => {
    const mockJson = {
      '2025-01-01T00:00:00Z': {
        temperature: { model1: 22.5, model2: 23.1 },
        humidity: { sensor: 65 }
      },
      '2025-01-01T01:00:00Z': {
        temperature: { model1: 21.8, model2: 22.0 }
      }
    };

    global.fetch = jest.fn().mockResolvedValue({ 
      ok: true, 
      headers: { get: () => null },
      json: () => Promise.resolve(mockJson) 
    });

    const result = await fetchTimeSeriesData();

    expect(Object.keys(result)).toContain('temperature.model1');
    expect(result['temperature.model1']).toHaveLength(2);
    expect(result['temperature.model1'][0]).toEqual({ x: '2025-01-01T00:00:00Z', y: 22.5 });
    expect(result['temperature.model1'][1]).toEqual({ x: '2025-01-01T01:00:00Z', y: 21.8 });
    expect(result['temperature.model2']).toHaveLength(2);
    expect(result['humidity.sensor']).toHaveLength(1);
  });

  it('should sort entries by timestamp', async () => {
    const mockJson = {
      '2025-01-02T00:00:00Z': { temp: { a: 10 } },
      '2025-01-01T00:00:00Z': { temp: { a: 5 } }
    };

    global.fetch = jest.fn().mockResolvedValue({ 
      ok: true, 
      headers: { get: () => null },
      json: () => Promise.resolve(mockJson) 
    });

    const result = await fetchTimeSeriesData();
    expect(result['temp.a'][0].x).toBe('2025-01-01T00:00:00Z');
    expect(result['temp.a'][1].x).toBe('2025-01-02T00:00:00Z');
  });

  it('should skip invalid data structures', async () => {
    const mockJson = {
      'ts1': { group: null },
      'ts2': { group: { series: 'not_number' } },
      'ts3': { invalid: {} }
    };

    global.fetch = jest.fn().mockResolvedValue({ 
      ok: true, 
      headers: { get: () => null },
      json: () => Promise.resolve(mockJson) 
    });

    const result = await fetchTimeSeriesData();
    expect(result).toEqual({});
  });

  it('should throw on failed fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({ 
      ok: false, 
      headers: { get: () => null },
      text: () => Promise.resolve('Error') 
    });

    await expect(fetchTimeSeriesData()).rejects.toThrow('Error');
  });

  it('should skip invalid timestampData and continue processing valid ones', async () => {
    const mockJson = {
      'ts1': null,  // Invalid, should skip
      'ts2': { group: { series: 10 } },  // Valid
      'ts3': 'invalid_string'  // Invalid, should skip
    };

    global.fetch = jest.fn().mockResolvedValue({ 
      ok: true, 
      headers: { get: () => null },
      json: () => Promise.resolve(mockJson) 
    });

    const result = await fetchTimeSeriesData();
    expect(result).toEqual({
      'group.series': [{ x: 'ts2', y: 10 }]
    });
  });
});

describe('fetchRawTimeSeriesData', () => {
  it('should fetch and return raw JSON data', async () => {
    const mockRaw = { raw: 'data' };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockRaw) });

    const result = await fetchRawTimeSeriesData();
    expect(result).toEqual(mockRaw);
  });

  it('should throw on failed raw fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: () => Promise.resolve('Fail') });

    await expect(fetchRawTimeSeriesData()).rejects.toThrow('Fail');
  });
});