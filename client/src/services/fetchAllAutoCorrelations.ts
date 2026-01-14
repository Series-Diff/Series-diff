// services/fetchAllAutoCorrelations.ts
import { formatRateLimitMessage, formatApiError } from '../utils/apiError';

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

async function fetchAutocorrelation(
  category: string,
  filename: string,
  start?: string,
  end?: string
): Promise<number | null> {
  const params = new URLSearchParams({
    category: category.trim(),
    filename: filename.trim(),
  });
  if (start) {
    params.append('start', start);
  }
  if (end) {
    params.append('end', end);
  }
  const url = `${API_URL}/api/timeseries/autocorrelation?${params.toString()}`;
  const resp = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) {
    if (resp.status === 429) {
      throw new Error(formatRateLimitMessage(resp, '/api/timeseries/autocorrelation'));
    }
    console.error("Failed to fetch autocorrelation:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.autocorrelation ?? null;
}

export async function fetchAllAutoCorrelations(
  filenamesPerCategory: Record<string, string[]>,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const autocorrelationsValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const autocorrelation = await fetchAutocorrelation(category, filename, start, end);
        if (!autocorrelationsValues[category]) {
          autocorrelationsValues[category] = {};
        }
        if (autocorrelation != null) {
          autocorrelationsValues[category][filename] = autocorrelation;
        }
      } catch (err) {
        console.warn(`Error fetching autocorrelation for ${category}.${filename}:`, err);
        throw new Error(formatApiError(err, '/api/timeseries/autocorrelation'));
      }
    }
  }

  return autocorrelationsValues;
}
