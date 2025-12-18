// services/fetchAllMae.ts

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

async function fetchMae(
  category: string,
  filename1: string,
  filename2: string,
  tolerance?: string
): Promise<number | null> {
  const tolParam = tolerance ? `&tolerance=${tolerance}` : "";

  const resp = await fetch(
    `${API_URL}/api/timeseries/mae?category=${category}&filename1=${filename1}&filename2=${filename2}${tolParam}`
  , {
      headers: {
        ...getAuthHeaders(),
      },
    });
  handleSessionToken(resp);

  if (!resp.ok) {
    console.error("Failed to fetch MAE:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.mae ?? null;
}

export async function fetchAllMae(
  filenamesPerCategory: Record<string, string[]>,
  tolerance?: string
): Promise<Record<string, Record<string, Record<string, number>>>> {
  const maeValues: Record<string, Record<string, Record<string, number>>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];

    for (const f1 of files) {
      for (const f2 of files) {
        if (f1 === f2) continue;

        try {
          const mae = await fetchMae(category, f1, f2, tolerance);

          if (!maeValues[category]) maeValues[category] = {};
          if (!maeValues[category][f1]) maeValues[category][f1] = {};

          if (mae != null) {
            maeValues[category][f1][f2] = mae;
          }
        } catch (err) {
          console.warn(`Error fetching MAE for ${category}.${f1} vs ${f2}:`, err);
        }
      }
    }
  }

  return maeValues;
}
