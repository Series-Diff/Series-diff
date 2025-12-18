import { TimeSeriesEntry } from "../services/fetchTimeSeries";

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

async function fetchDifference(
  category: string,
  filename1: string,
  filename2: string,
  start?: string,
  end?: string,
  tolerance?: string
): Promise<TimeSeriesEntry[] | null> {
  let url = `${API_URL}/api/timeseries/difference?category=${encodeURIComponent(category)}&filename1=${encodeURIComponent(filename1)}&filename2=${encodeURIComponent(filename2)}`;

  if (tolerance) url += `&tolerance=${encodeURIComponent(tolerance)}`;
  if (start) url += `&start=${encodeURIComponent(start)}`;
  if (end) url += `&end=${encodeURIComponent(end)}`;

  const resp = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) {
    console.error(`Failed to fetch difference for ${filename1} - ${filename2} in ${category}:`, await resp.text());
    return null;
  }

  const data = await resp.json();
  if (data.difference) {
    return Object.entries(data.difference).map(([x, y]) => ({ x, y: y as number }));
  }
  return null;
}

export async function fetchAllDifferences(
  filenamesPerCategory: Record<string, string[]>,
  tolerance: number | null | undefined,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, TimeSeriesEntry[]>>> {
  const differenceValues: Record<string, Record<string, TimeSeriesEntry[]>> = {};
  const toleranceString = tolerance != null ? `${tolerance}T` : undefined;

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];
    if (files.length < 2) continue;

    if (!differenceValues[category]) {
      differenceValues[category] = {};
    }

    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const filename1 = files[i];
        const filename2 = files[j];
        const differenceKey = `${filename1} - ${filename2}`;

        try {
          const diffSeries = await fetchDifference(category, filename1, filename2, start, end, toleranceString);
          if (diffSeries) {
            differenceValues[category][differenceKey] = diffSeries.sort(
              (a, b) => new Date(a.x).getTime() - new Date(b.x).getTime()
            );
          }
        } catch (err) {
          console.warn(`Error fetching difference for ${category}.${differenceKey}:`, err);
        }
      }
    }
  }

  return differenceValues;
}
