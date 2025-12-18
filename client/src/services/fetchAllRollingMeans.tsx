import { TimeSeriesEntry } from "./fetchTimeSeries";

const API_URL = process.env.REACT_APP_API_URL || '';

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
  window_size: string,
  start?: string,
  end?: string
): Promise<Record<string, TimeSeriesEntry[]>> {
  const params = new URLSearchParams({
    category,
    filename,
    window_size,
    ...(start && { start }),
    ...(end && { end }),
  });

  const resp = await fetch(`${API_URL}/api/timeseries/rolling_mean?${params.toString()}`, {
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
    for (const [timestamp, value] of Object.entries(data.rolling_mean)) {
      if (typeof value === 'number') {
        seriesData.push({ x: timestamp, y: value });
      }
    }

    seriesData.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
    out['rolling_mean'] = seriesData;
  } else {
    console.warn(`Unexpected data structure from rolling_mean API for ${category}/${filename}:`, data);
  }

  return out;
}

export async function fetchAllRollingMeans(
  filenamesPerCategory: Record<string, string[]>,
  window_size: string,
  start?: string,
  end?: string
): Promise<Record<string, TimeSeriesEntry[]>> {
  const rollingMeanValues: Record<string, TimeSeriesEntry[]> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];
    for (const filename of files) {
      const keyPrefix = `${category}.${filename}`;
      try {
        const seriesMap = await fetchRollingMean(category, filename, window_size, start, end);

        if (seriesMap && typeof seriesMap === 'object' && !Array.isArray(seriesMap)) {
          for (const seriesKey in seriesMap) {
            const seriesData = seriesMap[seriesKey];
            const fullKey = `${keyPrefix}.${seriesKey}`;
            if (Array.isArray(seriesData)) {
              rollingMeanValues[fullKey] = seriesData;
            } else {
              console.warn(`Data for sub-key ${fullKey} was not an array, skipping. Received:`, seriesData);
            }
          }
        } else if (Object.keys(seriesMap).length === 0) {
          console.log(`No rolling mean data found for ${keyPrefix}.`);
        } else {
          console.warn(`Unexpected data structure for ${keyPrefix}. Expected an object, received:`, seriesMap);
        }
      } catch (err) {
        console.warn(`Error processing rolling mean series for ${keyPrefix}:`, err);
      }
    }
  }

  return rollingMeanValues;
}
