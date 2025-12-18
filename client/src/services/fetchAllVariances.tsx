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

async function fetchVariance(
  category: string,
  filename: string,
  start?: string,
  end?: string
): Promise<number | null> {
  const params = new URLSearchParams({
    category,
    filename,
    ...(start && { start }),
    ...(end && { end }),
  });

  const resp = await fetch(`${API_URL}/api/timeseries/variance?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) {
    console.error("Failed to fetch variance:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.variance ?? null;
}

export async function fetchAllVariances(
  filenamesPerCategory: Record<string, string[]>,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const varianceValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const variance = await fetchVariance(category, filename, start, end);
        if (!varianceValues[category]) {
          varianceValues[category] = {};
        }
        if (variance != null) {
          varianceValues[category][filename] = variance;
        }
      } catch (err) {
        console.warn(`Error fetching variance for ${category}.${filename}:`, err);
      }
    }
  }

  return varianceValues;
}
