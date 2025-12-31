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

async function fetchStdDev(category: string, filename: string): Promise<number | null> {
  try {
    const resp = await fetch(`${API_URL}/api/timeseries/standard_deviation?category=${category}&filename=${filename}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    handleSessionToken(resp);
    if (!resp.ok) {
      const bodyText = await resp.text();
      console.error("Failed to fetch standard deviation:", bodyText);
      return null;
    }
    const data = await resp.json();
    const value = data.standard_deviation ?? null;
    if (value !== null && Number.isNaN(value)) {
      console.error('Invalid standard deviation value (NaN)');
      return null;
    }
    return value;
  } catch (err) {
    console.warn(`Error fetching standard deviation for ${category}.${filename}:`, err);
    return null;
  }
}

export async function fetchAllStdDevs(
  filenamesPerCategory: Record<string, string[]>
): Promise<Record<string, Record<string, number>>> {
  const stdDevsValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const stdDev = await fetchStdDev(category, filename);
        if (!stdDevsValues[category]) {
          stdDevsValues[category] = {};
        }
          if (stdDev != null) {
              stdDevsValues[category][filename] = stdDev;
          }
      } catch (err) {
        console.warn('Error fetching standard deviation', err);
      }
    }
  }

  return stdDevsValues;
}