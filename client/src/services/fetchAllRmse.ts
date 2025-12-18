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

async function fetchRmse(
  category: string,
  filename1: string,
  filename2: string,
  start?: string,
  end?: string,
  tolerance?: string
): Promise<number | null> {
  const params = new URLSearchParams({
    category,
    filename1,
    filename2,
    ...(start && { start }),
    ...(end && { end }),
    ...(tolerance && { tolerance }),
  });

  const resp = await fetch(`${API_URL}/api/timeseries/rmse?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) {
    console.error("Failed to fetch RMSE:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.rmse ?? null;
}

export async function fetchAllRmse(
  filenamesPerCategory: Record<string, string[]>,
  tolerance?: string,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, Record<string, number>>>> {
  const rmseValues: Record<string, Record<string, Record<string, number>>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];

    for (const f1 of files) {
      for (const f2 of files) {
        if (f1 === f2) continue;

        try {
          const rmse = await fetchRmse(category, f1, f2, start, end, tolerance);

          if (!rmseValues[category]) rmseValues[category] = {};
          if (!rmseValues[category][f1]) rmseValues[category][f1] = {};

          if (rmse != null) {
            rmseValues[category][f1][f2] = rmse;
          }
        } catch (err) {
          console.warn(`Error fetching RMSE for ${category}.${f1} vs ${f2}:`, err);
        }
      }
    }
  }

  return rmseValues;
}
