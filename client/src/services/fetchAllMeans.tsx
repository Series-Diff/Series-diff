// services/fetchAllMeans.ts

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

async function fetchMean(category: string, filename: string): Promise<number | null> {
  try {
    const resp = await fetch(`${API_URL}/api/timeseries/mean?category=${category}&filename=${filename}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    handleSessionToken(resp);
    if (!resp.ok) {
      const bodyText = await resp.text();
      console.error("Failed to fetch mean:", bodyText);
      const details = bodyText ? ` - ${bodyText}` : '';
      if ([429, 500, 400].includes(resp.status)) {
        const error = new Error(`HTTP ${resp.status}: ${resp.statusText}${details}`);
        (error as any).status = resp.status;
        (error as any).body = bodyText;
        throw error;
      }
      return null;
    }

    const data = await resp.json();
    return data.mean ?? null;
  } catch (err: any) {
    // Re-throw errors we explicitly created for certain HTTP statuses (they carry a `status` field).
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    // For network or unexpected errors, log and return null so callers can handle gracefully.
    console.warn(`Network or unexpected error while fetching mean for ${category}.${filename}:`, err);
    return null;
  }
}

export async function fetchAllMeans(
  filenamesPerCategory: Record<string, string[]>
): Promise<Record<string, Record<string, number>>> {
  const meanValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const mean = await fetchMean(category, filename);
        if (!meanValues[category]) {
          meanValues[category] = {};
        }
        if (mean != null) {
          meanValues[category][filename] = mean;
        }
      } catch (err) {
        console.warn(`Error fetching mean for ${category}.${filename}`, err);
      }
    }
  }

  return meanValues;
}