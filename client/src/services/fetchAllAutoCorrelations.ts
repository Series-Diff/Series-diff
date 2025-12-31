// services/fetchAllAutoCorrelations.ts

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

async function fetchAutocorrelation(category: string, filename: string): Promise<number | null> {
  try {
    const resp = await fetch(`${API_URL}/api/timeseries/autocorrelation?category=${category}&filename=${filename}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    handleSessionToken(resp);
    if (!resp.ok) {
      const bodyText = await resp.text();
      console.error("Failed to fetch autocorrelation:", bodyText);
      return null;
    }
    const data = await resp.json();
    const value = data.autocorrelation ?? null;
    if (value !== null && Number.isNaN(value)) {
      console.error('Invalid autocorrelation value (NaN)');
      return null;
    }
    return value;
  } catch (err) {
    console.warn(`Error fetching autocorrelation for ${category}.${filename}:`, err);
    return null;
  }
}

export async function fetchAllAutoCorrelations(
  filenamesPerCategory: Record<string, string[]>
): Promise<Record<string, Record<string, number>>> {
  const autocorrelationsValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const autocorrelation = await fetchAutocorrelation(category, filename);
        if (!autocorrelationsValues[category]) {
          autocorrelationsValues[category] = {};
        }
          if (autocorrelation != null) {
              autocorrelationsValues[category][filename] = autocorrelation;
          }
      } catch (err) {
        console.warn('Error fetching autocorrelation', err);
      }
    }
  }

  return autocorrelationsValues;
}