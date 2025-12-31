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

async function fetchVariance(category: string, filename: string): Promise<number | null> {
  try {
    const resp = await fetch(`${API_URL}/api/timeseries/variance?category=${category}&filename=${filename}`,{
      headers: {
        ...getAuthHeaders(),
      },
    });
    handleSessionToken(resp);
    if (!resp.ok) {
      const bodyText = await resp.text();
      console.error("Failed to fetch variance:", bodyText);
      return null;
    }
    const data = await resp.json();
    const value = data.variance ?? null;
    if (value !== null && Number.isNaN(value)) {
      console.error('Invalid variance value (NaN)');
      return null;
    }
    return value;
  } catch (err) {
    console.warn(`Error fetching variance for ${category}.${filename}:`, err);
    return null;
  }
}

export async function fetchAllVariances(
  filenamesPerCategory: Record<string, string[]>
): Promise<Record<string, Record<string, number>>> {
  const varianceValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const variance = await fetchVariance(category, filename);
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