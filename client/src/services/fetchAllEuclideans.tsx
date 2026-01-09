// services/fetchAllEuclidean.tsx

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

export async function fetchEuclidean(
  category: string,
  filename1: string,
  filename2: string,
  tolerance?: string,
  start?: string,
  end?: string
): Promise<number | null> {
  const toleranceParam = tolerance !== undefined ? String(tolerance) : undefined;

  const params = new URLSearchParams({
    category: category.trim(),
    filename1: filename1.trim(),
    filename2: filename2.trim(),
  });
  if (toleranceParam) {
    params.append('tolerance', toleranceParam);
  }
  if (start) {
    params.append('start', start);
  }
  if (end) {
    params.append('end', end);
  }

  const resp = await fetch(`${API_URL}/api/timeseries/euclidean_distance?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) {
    console.error("Failed to fetch euclidean distance:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.euclidean_distance ?? 0;
}

export async function fetchAllEuclideans(
  filenames: string[],
  tolerance: number | null | undefined,
  category: string,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const euclideans: Record<string, Record<string, number>> = {};
  const toleranceString = tolerance != null ? `${tolerance}T` : undefined;

  const numFiles = filenames.length;

  for (const file1 of filenames) {
    euclideans[file1] = {};
    for (const file2 of filenames) {
      euclideans[file1][file2] = 0.0;
    }
  }

  for (let i = 0; i < numFiles; i++) {
    const file1 = filenames[i];

    for (let j = i + 1; j < numFiles; j++) {
      const file2 = filenames[j];

      const value = await fetchEuclidean(category, file1, file2, toleranceString, start, end);
      const euclidean = value ?? 0;

      euclideans[file1][file2] = euclidean;
      euclideans[file2][file1] = euclidean;
    }
  }

  return euclideans;
}
