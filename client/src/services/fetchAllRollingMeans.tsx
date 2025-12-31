import {TimeSeriesEntry} from "./fetchTimeSeries"; // Assuming fetchTimeSeries is in the same directory

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('session_token');
  return token ? { 'X-Session-ID': token } : {};
};

const handleSessionToken = (response: Response) => {
  const newToken = response.headers.get('X-Session-ID');
  if (newToken) {
    localStorage.setItem('session_token', newToken);
  }
};

export async function fetchRollingMean(
  category: string,
  filename: string,
  window_size: string
): Promise<Record<string, TimeSeriesEntry[]>> {

  const resp = await fetch(`${API_URL}/api/timeseries/rolling_mean?category=${category}&filename=${filename}&window_size=${window_size}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  handleSessionToken(resp);
  if (!resp.ok) throw new Error(await resp.text());

  const data = await resp.json();

  const out: Record<string, TimeSeriesEntry[]> = {};
  const seriesData: TimeSeriesEntry[] = [];

  if (data && typeof data.rolling_mean === 'object' && data.rolling_mean !== null) {

    const rollingMeanData = data.rolling_mean;

    for (const [timestamp, value] of Object.entries(rollingMeanData)) {
      if (typeof value === 'number') {
        seriesData.push({
          x: timestamp, // Timestamp
          y: value,     // Value
        });
      }
    }

    seriesData.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    out['rolling_mean'] = seriesData;
    if (seriesData.length === 0) {
      console.warn(`No valid numerical data points found in rolling_mean for ${category}/${filename}`);
    }

  } else {
    console.warn(`Unexpected data structure from rolling_mean API for ${category}/${filename}:`, data);
  }

  return out;
}

export async function fetchAllRollingMeans(
  filenamesPerCategory: Record<string, string[]>,
    window_size: string
): Promise<Record<string, TimeSeriesEntry[]>> {

  const rollingMeanValues: Record<string, TimeSeriesEntry[]> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];
    for (const filename of files) {

      const keyPrefix = `${category}.${filename}`;

      try {
        const seriesMap = await fetchRollingMean(category, filename, window_size);

        for (const seriesKey in seriesMap) {
          const seriesData = seriesMap[seriesKey];

          const fullKey = `${keyPrefix}.${seriesKey}`;

          if (seriesData.length > 0) {
            rollingMeanValues[fullKey] = seriesData;
          } else {
            console.warn(`Empty array for sub-key ${fullKey}, skipping. Received:`, seriesData);
          }
        }
        if (Object.keys(seriesMap).length === 0) {
          console.log(`No rolling mean data found for ${keyPrefix}.`);
        }

      } catch (err) {
        console.warn(`Error processing rolling mean series for ${keyPrefix}:`, err);
      }
    }
  }
  return rollingMeanValues;
}