// services/fetchAllDifferences.ts

import {TimeSeriesEntry} from "../services/fetchTimeSeries";

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

async function fetchDifference(category: string, filename1: string, filename2: string, tolerance?: string): Promise<TimeSeriesEntry[] | null> {
  const toleranceParam = tolerance !== undefined ? `&tolerance=${encodeURIComponent(String(tolerance))}` : "";
  const resp = await fetch(`${API_URL}/api/timeseries/difference?category=${encodeURIComponent(category.trim())}&filename1=${encodeURIComponent(filename1.trim())}&filename2=${encodeURIComponent(filename2.trim())}${toleranceParam}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  handleSessionToken(resp);
  
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(msg || `Failed to fetch difference for ${filename1} - ${filename2} in ${category}`);
  }
  
  const data = await resp.json();
    if (data.difference) {
        return Object.entries(data.difference).map(([x, y]) => ({ x, y: y as number }));
    }
    return null;
}

// New function to fetch all differences for all meaningful pairs
export async function fetchAllDifferences(
  filenamesPerCategory: Record<string, string[]>,
  tolerance: number | null | undefined
): Promise<Record<string, Record<string, TimeSeriesEntry[]>>> {
  const differenceValues: Record<string, Record<string, TimeSeriesEntry[]>> = {};

    const toleranceString = tolerance !== null && tolerance !== undefined ? `${tolerance}T` : undefined;

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];
    if (files.length < 2) continue; // Need at least two files to calculate a difference

      if (!differenceValues[category]) {
        differenceValues[category] = {};
    }
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const filename1 = files[i];
        const filename2 = files[j];
        const differenceKey = `${filename1} - ${filename2}`;

        try {
          const diffSeries = await fetchDifference(category, filename1, filename2, toleranceString);
          if (diffSeries) {
            if (!differenceValues[category]) {
              differenceValues[category] = {};
            }
            // Sort the difference series by date
            differenceValues[category][differenceKey] = diffSeries.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
            console.log("fetchAllDifferences result:", differenceValues);

          }

        } catch (err) {
          console.warn(`Error fetching difference for ${category}.${differenceKey}:`, err);
          throw err;
        }
      }
    }
  }
  return differenceValues;
}