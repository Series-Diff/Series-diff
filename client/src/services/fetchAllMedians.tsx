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

async function fetchMedian(
  category: string,
  filename: string,
  start?: string,
  end?: string
): Promise<number | null> {
  let url = `${API_URL}/api/timeseries/median?category=${encodeURIComponent(category)}&filename=${encodeURIComponent(filename)}`;
  if (start) url += `&start=${encodeURIComponent(start)}`;
  if (end) url += `&end=${encodeURIComponent(end)}`;

  const resp = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) {
    console.error("Failed to fetch median:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.median ?? null;
}

export async function fetchAllMedians(
  filenamesPerCategory: Record<string, string[]>,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const medianValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const median = await fetchMedian(category, filename, start, end);
        if (!medianValues[category]) {
          medianValues[category] = {};
        }
        if (median != null) {
          medianValues[category][filename] = median;
        }
      } catch (err) {
        console.warn(`Error fetching median for ${category}.${filename}:`, err);
      }
    }
  }

  return medianValues;
}
