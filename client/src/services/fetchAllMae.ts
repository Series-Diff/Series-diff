// services/fetchAllMae.ts

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

async function fetchMae(
  category: string,
  filename1: string,
  filename2: string,
  tolerance?: string
): Promise<number | null> {
  const tolParam = tolerance ? `&tolerance=${encodeURIComponent(tolerance)}` : "";

  try {
    const resp = await fetch(
      `${API_URL}/api/timeseries/mae?category=${encodeURIComponent(category.trim())}&filename1=${encodeURIComponent(filename1.trim())}&filename2=${encodeURIComponent(filename2.trim())}${tolParam}`
    , {
        headers: {
          ...getAuthHeaders(),
        },
      });
    handleSessionToken(resp);

    if (!resp.ok) {
      const bodyText = await resp.text();
      console.error("Failed to fetch MAE:", bodyText);

      // Surface meaningful HTTP errors so the UI can show an alert
      if ([429, 500, 400].includes(resp.status)) {
        const details = bodyText ? ` - ${bodyText}` : '';
        const error = new Error(`HTTP ${resp.status}: ${resp.statusText}${details}`);
        (error as any).status = resp.status;
        (error as any).body = bodyText;
        throw error;
      }
      return null;
    }

    const data = await resp.json();
    return data.mae ?? null;
  } catch (err) {
    // Rethrow errors that were intentionally created for specific HTTP statuses
    if (err && (err as any).status) {
      throw err;
    }
    // For other unexpected errors (e.g., network issues), return null as before
    console.warn(`Error fetching MAE for ${category}.${filename1} vs ${filename2}:`, err);
    return null;
  }
}

export async function fetchAllMae(
  filenamesPerCategory: Record<string, string[]>,
  tolerance?: string
): Promise<Record<string, Record<string, Record<string, number>>>> {
  const maeValues: Record<string, Record<string, Record<string, number>>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];
    maeValues[category] = {};

    // Initialize entries for all files (even if only one file, we need the structure)
    for (const f1 of files) {
      if (!maeValues[category][f1]) maeValues[category][f1] = {};
      
      for (const f2 of files) {
        if (f1 === f2) continue;

        try {
          const mae = await fetchMae(category, f1, f2, tolerance);

          if (mae != null) {
            maeValues[category][f1][f2] = mae;
          }
        } catch (err) {
          console.warn(`Error fetching MAE for ${category}.${f1} vs ${f2}:`, err);
          // leave missing entry as empty to align with tests
        }
      }
    }
  }

  return maeValues;
}
