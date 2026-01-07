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

async function fetchStdDev(
  category: string,
  filename: string,
  start?: string,
  end?: string
): Promise<number | null> {
  const params = new URLSearchParams();
  params.append('category', category);
  params.append('filename', filename);
  if (start !== undefined && start !== null) {
    params.append('start', start);
  }
  if (end !== undefined && end !== null) {
    params.append('end', end);
  }

  const resp = await fetch(`${API_URL}/api/timeseries/standard_deviation?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) {
    console.error("Failed to fetch standard deviation:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.standard_deviation ?? null;
}

export async function fetchAllStdDevs(
  filenamesPerCategory: Record<string, string[]>,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const stdDevsValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const stdDev = await fetchStdDev(category, filename, start, end);
        if (!stdDevsValues[category]) {
          stdDevsValues[category] = {};
        }
        if (stdDev != null) {
          stdDevsValues[category][filename] = stdDev;
        }
      } catch (err) {
        console.warn(`Error fetching standard deviation for ${category}.${filename}:`, err);
      }
    }
  }

  return stdDevsValues;
}
